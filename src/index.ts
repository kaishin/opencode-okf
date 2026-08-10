import { stat } from "node:fs/promises"
import { relative, resolve, sep } from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import { captureSession, formatCaptureReport } from "./capture.js"
import { diffSources, formatDiffReport } from "./diff.js"
import { initializeBundle, summarizeInit } from "./init.js"
import { formatInspectionReport, inspectProject } from "./inspect.js"
import { compactPrompt, initPrompt, updatePrompt, validatePrompt } from "./prompts.js"
import {
  formatValidationReport,
  isPathInside,
  resolveBundlePath,
  validateBundle,
} from "./validator.js"

/** What to do at a capture moment: nothing, toast nudge, or automatic action. */
export type CaptureBehavior = "off" | "notify" | "auto"

/** Lifecycle moments at which the plugin can nudge or capture session knowledge. */
export interface CaptureMoments {
  /** When the session goes idle after user activity. Defaults to `off`. */
  sessionIdle?: CaptureBehavior
  /** When the session context is about to be compacted. Defaults to `off`. */
  compacting?: CaptureBehavior
  /** After the session context was compacted. Defaults to `off`. */
  compacted?: CaptureBehavior
  /** When the session's todo list flips to all completed/cancelled. Defaults to `off`. */
  todoComplete?: CaptureBehavior
}

export interface OKFPluginOptions {
  /** Bundle directory relative to the active worktree. Defaults to `okf`. */
  bundleDirectory?: string
  /** Validate after files in the bundle change. Defaults to true. */
  validateOnEdit?: boolean
  /** Buffer per-session tool activity and inject it into `okf-update session` prompts. Defaults to false. */
  captureEvidence?: boolean
  /** Capture behavior at lifecycle moments. Every moment defaults to `off`. */
  captureOn?: CaptureMoments
}

const CAPTURE_BEHAVIORS = new Set<string>(["off", "notify", "auto"])

function readCaptureBehavior(value: unknown, key: string): CaptureBehavior {
  if (value === undefined) return "off"
  if (typeof value !== "string" || !CAPTURE_BEHAVIORS.has(value)) {
    throw new Error(`opencode-okf: \`captureOn.${key}\` must be "off", "notify", or "auto"`)
  }
  return value as CaptureBehavior
}

function readOptions(
  options: Record<string, unknown> | undefined,
): Required<OKFPluginOptions> & { captureOn: Required<CaptureMoments> } {
  const bundleDirectory = options?.bundleDirectory ?? "okf"
  const validateOnEdit = options?.validateOnEdit ?? true
  if (typeof bundleDirectory !== "string" || bundleDirectory.trim().length === 0) {
    throw new Error("opencode-okf: `bundleDirectory` must be a non-empty string")
  }
  if (typeof validateOnEdit !== "boolean") {
    throw new Error("opencode-okf: `validateOnEdit` must be a boolean")
  }
  const captureEvidence = options?.captureEvidence ?? false
  if (typeof captureEvidence !== "boolean") {
    throw new Error("opencode-okf: `captureEvidence` must be a boolean")
  }
  const captureOnOption = options?.captureOn
  if (captureOnOption !== undefined && (typeof captureOnOption !== "object" || captureOnOption === null)) {
    throw new Error("opencode-okf: `captureOn` must be an object")
  }
  const captureOn = {
    sessionIdle: readCaptureBehavior((captureOnOption as CaptureMoments | undefined)?.sessionIdle, "sessionIdle"),
    compacting: readCaptureBehavior((captureOnOption as CaptureMoments | undefined)?.compacting, "compacting"),
    compacted: readCaptureBehavior((captureOnOption as CaptureMoments | undefined)?.compacted, "compacted"),
    todoComplete: readCaptureBehavior((captureOnOption as CaptureMoments | undefined)?.todoComplete, "todoComplete"),
  }
  return { bundleDirectory, validateOnEdit, captureEvidence, captureOn }
}

export const OKFPlugin = (async ({ client, directory, worktree }, rawOptions) => {
  const options = readOptions(rawOptions)
  const configuredRoot = resolveBundlePath(worktree, options.bundleDirectory)
  const commandNames = new Set(["okf-init", "okf-update", "okf-validate", "okf-compact"])
  const okfPromptPattern = /(?:\bOKF\b|open knowledge format|\bokf\/)/i
  let validationTimer: ReturnType<typeof setTimeout> | undefined
  let lastErrorSignature = ""
  // Per-session capture state: "armed" after user activity, "consumed" after we
  // acted, "capturing" while an auto-capture command runs so its own messages
  // do not re-arm the session and loop.
  const captureStates = new Map<string, "armed" | "consumed" | "capturing">()
  // Per-session evidence buffer: recent tool activity lines, injected into
  // `okf-update session` prompts so captures rest on evidence, not memory.
  const evidenceBuffers = new Map<string, string[]>()
  const EVIDENCE_LIMIT = 50

  async function bundleExists(): Promise<boolean> {
    try {
      return (await stat(configuredRoot)).isDirectory()
    } catch {
      return false
    }
  }

  async function logCaptureError(message: string, extra?: Record<string, unknown>): Promise<void> {
    await Promise.allSettled([
      client.app.log({ body: { service: "opencode-okf", level: "warn", message, extra } }),
    ])
  }

  async function toastCaptureNudge(message: string): Promise<void> {
    await Promise.allSettled([
      client.tui.showToast({
        body: { title: "OKF capture", message, variant: "info", duration: 8000 },
        query: { directory },
      }),
    ])
  }

  async function isSubagentSession(sessionID: string): Promise<boolean> {
    try {
      const session = await client.session.get({ path: { id: sessionID }, query: { directory } })
      return Boolean(session.data?.parentID)
    } catch {
      // If the session lookup fails, proceed; a stray nudge beats silence.
      return false
    }
  }

  async function sendCaptureCommand(sessionID: string): Promise<void> {
    const result = await Promise.allSettled([
      client.session.command({
        path: { id: sessionID },
        query: { directory },
        body: { command: "okf-update", arguments: "session" },
      }),
    ])
    if (result[0]?.status === "rejected") {
      captureStates.set(sessionID, "consumed")
      await logCaptureError("OKF auto-capture failed to start", { sessionID, error: String(result[0].reason) })
    }
  }

  /** Shared notify/auto flow for capture moments. Caller enforces its own arming rules. */
  async function runCaptureMoment(
    sessionID: string,
    behavior: CaptureBehavior,
    messages: { notify: string; auto: string },
  ): Promise<void> {
    if (behavior === "off" || captureStates.get(sessionID) === "capturing") return
    if (!(await bundleExists())) return
    if (await isSubagentSession(sessionID)) return
    captureStates.set(sessionID, behavior === "auto" ? "capturing" : "consumed")
    if (behavior === "notify") {
      await toastCaptureNudge(messages.notify)
      return
    }
    await toastCaptureNudge(messages.auto)
    await sendCaptureCommand(sessionID)
  }

  async function handleSessionIdle(sessionID: string): Promise<void> {
    const state = captureStates.get(sessionID)
    if (state === "capturing") {
      captureStates.set(sessionID, "consumed")
      return
    }
    if (state !== "armed") return
    await runCaptureMoment(sessionID, options.captureOn.sessionIdle, {
      notify: "Session idle. Run /okf-update session to capture this session's knowledge.",
      auto: "Session idle. Capturing this session's knowledge via /okf-update session…",
    })
  }

  async function handleSessionCompacted(sessionID: string): Promise<void> {
    // Compaction is a discrete knowledge-loss event, so it fires every time
    // rather than once per user activity stretch.
    await runCaptureMoment(sessionID, options.captureOn.compacted, {
      notify: "Context was compacted. Run /okf-update session to capture durable knowledge.",
      auto: "Context was compacted. Capturing this session's knowledge via /okf-update session…",
    })
  }

  async function handleTodoUpdated(sessionID: string, todos: Array<{ status: string }>): Promise<void> {
    if (options.captureOn.todoComplete === "off") return
    if (todos.length === 0) return
    if (!todos.every((todo) => todo.status === "completed" || todo.status === "cancelled")) return
    if (captureStates.get(sessionID) !== "armed") return
    await runCaptureMoment(sessionID, options.captureOn.todoComplete, {
      notify: "All todos complete. Run /okf-update session to capture this session's knowledge.",
      auto: "All todos complete. Capturing this session's knowledge via /okf-update session…",
    })
  }

  function bufferEvidence(sessionID: string, toolName: string, title: string): void {
    const line = `- ${toolName}: ${title.replace(/\s+/g, " ").trim().slice(0, 120)}`
    const entries = evidenceBuffers.get(sessionID) ?? []
    entries.push(line)
    if (entries.length > EVIDENCE_LIMIT) entries.splice(0, entries.length - EVIDENCE_LIMIT)
    evidenceBuffers.set(sessionID, entries)
  }

  /** Drain buffered evidence for a session into prompt text, if any. */
  function drainEvidence(sessionID: string): string {
    const entries = evidenceBuffers.get(sessionID)
    if (!entries || entries.length === 0) return ""
    evidenceBuffers.delete(sessionID)
    return `\n\nBuffered session evidence (${entries.length} recent tool call(s), oldest first):\n${entries.join("\n")}`
  }

  async function reportEditValidation(): Promise<void> {
    const report = await validateBundle(configuredRoot)
    const signature = report.errors.map((item) => `${item.file ?? ""}:${item.message}`).join("|")
    if (report.valid || signature === lastErrorSignature) {
      lastErrorSignature = signature
      return
    }
    lastErrorSignature = signature
    const message = `${report.errors.length} OKF conformance error(s). Run /okf-validate for details.`
    await Promise.allSettled([
      client.tui.showToast({
        body: { title: "OKF validation", message, variant: "warning", duration: 5000 },
        query: { directory },
      }),
      client.app.log({
        body: {
          service: "opencode-okf",
          level: "warn",
          message,
          extra: { root: configuredRoot, errors: report.errors },
        },
      }),
    ])
  }

  function scheduleValidation(): void {
    if (validationTimer) clearTimeout(validationTimer)
    validationTimer = setTimeout(() => void reportEditValidation(), 400)
  }

  return {
    config: async (config) => {
      config.command ??= {}
      config.command["okf-init"] ??= {
        description: "Initialize an evidence-backed OKF bundle",
        template: initPrompt(options.bundleDirectory),
      }
      config.command["okf-update"] ??= {
        description: "Update OKF bundle from repo, git diff, or session (args: [session|diff])",
        template: updatePrompt(options.bundleDirectory),
      }
      config.command["okf-validate"] ??= {
        description: "Validate an OKF bundle and optionally fix it",
        template: validatePrompt(options.bundleDirectory),
      }
      config.command["okf-compact"] ??= {
        description: "Compact OKF logs, or the whole bundle with `all` (args: [all] [aggressiveness])",
        template: compactPrompt(options.bundleDirectory),
      }
    },

    tool: {
      okf_inspect: tool({
        description:
          "Read-only inventory of likely product docs, schemas, analytics, and dashboard sources before authoring an OKF bundle.",
        args: {
          path: tool.schema
            .string()
            .optional()
            .describe("Project directory to inspect, relative to the worktree. Defaults to the worktree root."),
          maxFiles: tool.schema
            .number()
            .int()
            .min(1)
            .max(5000)
            .optional()
            .describe("Maximum files to scan; defaults to 500."),
        },
        async execute(args, context) {
          const report = await inspectProject(
            resolve(context.worktree, args.path ?? "."),
            args.maxFiles ?? 500,
          )
          return {
            title: `${report.candidates.length} likely knowledge source(s)`,
            output: formatInspectionReport(report),
            metadata: {
              rootPath: report.rootPath,
              scannedFiles: report.scannedFiles,
              truncated: report.truncated,
              candidates: report.candidates.length,
            },
          }
        },
      }),
      okf_init: tool({
        description:
          "Create missing OKF reserved files (`index.md`, `log.md`) without overwriting existing files.",
        args: {
          path: tool.schema
            .string()
            .optional()
            .describe(`Bundle path relative to the worktree. Defaults to ${options.bundleDirectory}.`),
        },
        async execute(args, context) {
          const root = resolveBundlePath(context.worktree, args.path ?? options.bundleDirectory)
          const report = await initializeBundle(root)
          return {
            title: "OKF bundle initialized",
            output: summarizeInit(report),
            metadata: {
              bundlePath: report.bundlePath,
              created: report.created,
              existing: report.existing,
            },
          }
        },
      }),
      okf_diff: tool({
        description:
          "List files changed since a git ref (default HEAD) so OKF bundle work can be scoped to uncommitted or recent changes.",
        args: {
          base: tool.schema
            .string()
            .optional()
            .describe("Git ref to diff against. Defaults to HEAD. Use origin/main, a SHA, or a tag for a wider window."),
          path: tool.schema
            .string()
            .optional()
            .describe("Subdirectory to scope the diff to, relative to the worktree."),
          includeUntracked: tool.schema
            .boolean()
            .optional()
            .describe("Include files not yet tracked by git. Defaults to true."),
        },
        async execute(args, context) {
          const report = await diffSources(context.worktree, {
            base: args.base,
            path: args.path,
            includeUntracked: args.includeUntracked,
          })
          return {
            title: report.notARepository
              ? "Not a git repository"
              : `${report.changedFiles.length} changed file(s) vs ${report.base}`,
            output: formatDiffReport(report),
            metadata: {
              base: report.base,
              scope: report.scope,
              files: report.changedFiles.length,
              notARepository: report.notARepository,
            },
          }
        },
      }),
      okf_capture: tool({
        description:
          "Append a dated entry to the OKF bundle's root log.md for decisions, open questions, or history that do not belong in a concept file. Prefer updating concepts/indexes first (e.g. via /okf-update session).",
        args: {
          title: tool.schema.string().optional().describe("Short title for this session capture."),
          summary: tool.schema.string().describe("Concise summary of the session's important outcome."),
          decisions: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Decisions explicitly made during the session."),
          changes: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Meaningful implementation or workflow changes from the session."),
          questions: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Important unresolved questions or follow-ups."),
          path: tool.schema
            .string()
            .optional()
            .describe(`Bundle path relative to the worktree. Defaults to ${options.bundleDirectory}.`),
        },
        async execute(args, context) {
          const root = resolveBundlePath(context.worktree, args.path ?? options.bundleDirectory)
          const report = await captureSession(root, {
            title: args.title,
            summary: args.summary,
            decisions: args.decisions,
            changes: args.changes,
            questions: args.questions,
          })
          const file = relative(context.worktree, report.file).split(sep).join("/")
          const output = formatCaptureReport({ ...report, file })
          return {
            title: report.validation.valid ? "OKF session captured" : "OKF session captured with errors",
            output,
            metadata: {
              date: report.date,
              file,
              created: report.created,
              valid: report.validation.valid,
              errors: report.validation.errors.length,
              warnings: report.validation.warnings.length,
            },
          }
        },
      }),
      okf_validate: tool({
        description:
          "Validate an Open Knowledge Format v0.1 bundle. Reports conformance errors and non-blocking quality or broken-link warnings.",
        args: {
          path: tool.schema
            .string()
            .optional()
            .describe(`Bundle path relative to the worktree. Defaults to ${options.bundleDirectory}.`),
        },
        async execute(args, context) {
          const root = resolveBundlePath(context.worktree, args.path ?? options.bundleDirectory)
          const report = await validateBundle(root)
          return {
            title: report.valid ? "OKF validation passed" : "OKF validation failed",
            output: formatValidationReport(report),
            metadata: {
              valid: report.valid,
              root: report.root,
              files: report.files,
              concepts: report.concepts,
              errors: report.errors.length,
              warnings: report.warnings.length,
            },
          }
        },
      }),
    },

    "experimental.chat.system.transform": async (_input, output) => {
      if (!okfPromptPattern.test(output.system.join("\n"))) return
      output.system.push(
        `OKF workflow: inspect available product, schema, analytics, and dashboard sources first (e.g. via okf_inspect). Prefer concept files and indexes for durable knowledge; use log.md for history and open questions. Record unknown facts in log.md under "Questions for maintainers"; never invent business rules, SQL, or dashboard behavior. Non-reserved concept files need YAML frontmatter and bundle-relative links. Validate with okf_validate before declaring the bundle complete.`,
      )
    },

    "command.execute.before": async (input, output) => {
      if (!commandNames.has(input.command)) return
      let extra = `\n\nOKF runtime context: current UTC time is ${new Date().toISOString()}; configured bundle directory is \`${options.bundleDirectory}/\`.`
      if (options.captureEvidence && input.command === "okf-update" && input.arguments.startsWith("session")) {
        extra += drainEvidence(input.sessionID)
      }
      const textPart = output.parts.find((part) => part.type === "text")
      if (textPart?.type === "text") textPart.text += extra
    },

    "tool.execute.after": async (input, output) => {
      if (!options.captureEvidence) return
      try {
        bufferEvidence(input.sessionID, input.tool, String(output.title ?? ""))
      } catch (error) {
        await logCaptureError("OKF evidence buffering failed", { error: String(error) })
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      const behavior = options.captureOn.compacting
      if (behavior === "off") return
      try {
        if (!(await bundleExists())) return
        if (behavior === "notify") {
          await toastCaptureNudge(
            "Context is being compacted. Run /okf-update session afterwards to capture durable knowledge.",
          )
          return
        }
        output.context.push(
          `OKF knowledge bundle: this project keeps durable knowledge in \`${options.bundleDirectory}/\`. Preserve in the compaction summary any decisions, open questions, and domain facts worth capturing to the bundle after compaction (via /okf-update session). Do not drop them as chatter.`,
        )
      } catch (error) {
        await logCaptureError("OKF compacting hook failed", { error: String(error) })
      }
    },

    event: async ({ event }) => {
      if (event.type === "message.updated" && event.properties.info.role === "user") {
        const sessionID = event.properties.info.sessionID
        if (captureStates.get(sessionID) !== "capturing") captureStates.set(sessionID, "armed")
      }
      if (event.type === "session.idle") {
        try {
          await handleSessionIdle(event.properties.sessionID)
        } catch (error) {
          await logCaptureError("OKF session.idle handler failed", { error: String(error) })
        }
      }
      if (event.type === "session.compacted") {
        try {
          await handleSessionCompacted(event.properties.sessionID)
        } catch (error) {
          await logCaptureError("OKF session.compacted handler failed", { error: String(error) })
        }
      }
      if (event.type === "todo.updated") {
        try {
          await handleTodoUpdated(event.properties.sessionID, event.properties.todos)
        } catch (error) {
          await logCaptureError("OKF todo.updated handler failed", { error: String(error) })
        }
      }
      if (event.type === "session.deleted") {
        captureStates.delete(event.properties.info.id)
        evidenceBuffers.delete(event.properties.info.id)
      }
      if (!options.validateOnEdit) return
      let file: string | undefined
      if (event.type === "file.edited") file = event.properties.file
      if (event.type === "file.watcher.updated") file = event.properties.file
      if (!file) return
      const absoluteFile = resolve(worktree, file)
      if (isPathInside(configuredRoot, absoluteFile)) scheduleValidation()
    },

    dispose: async () => {
      if (validationTimer) clearTimeout(validationTimer)
    },
  }
}) satisfies Plugin

export default OKFPlugin
export { captureSession, formatCaptureReport } from "./capture.js"
export type { CaptureOptions, CaptureReport } from "./capture.js"
export { diffSources, formatDiffReport } from "./diff.js"
export type { ChangedFile, DiffOptions, DiffReport, FileStatus } from "./diff.js"
export { formatInspectionReport, inspectProject } from "./inspect.js"
export type { InspectionReport } from "./inspect.js"
export { initializeBundle, summarizeInit } from "./init.js"
export type { InitReport } from "./init.js"
export { formatValidationReport, resolveBundlePath, validateBundle } from "./validator.js"
export type { ValidationIssue, ValidationReport, ValidationSeverity } from "./validator.js"
