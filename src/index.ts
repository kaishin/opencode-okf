import { relative, resolve, sep } from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import { captureSession, formatCaptureReport } from "./capture.js"
import { diffSources, formatDiffReport } from "./diff.js"
import { compactPrompt, initPrompt, updatePrompt, validatePrompt } from "./prompts.js"
import {
  formatValidationReport,
  isPathInside,
  resolveBundlePath,
  validateBundle,
} from "./validator.js"

export interface OKFPluginOptions {
  /** Bundle directory relative to the active worktree. Defaults to `okf`. */
  bundleDirectory?: string
  /** Validate after files in the bundle change. Defaults to true. */
  validateOnEdit?: boolean
}

function readOptions(options: Record<string, unknown> | undefined): Required<OKFPluginOptions> {
  const bundleDirectory = options?.bundleDirectory ?? "okf"
  const validateOnEdit = options?.validateOnEdit ?? true
  if (typeof bundleDirectory !== "string" || bundleDirectory.trim().length === 0) {
    throw new Error("opencode-okf: `bundleDirectory` must be a non-empty string")
  }
  if (typeof validateOnEdit !== "boolean") {
    throw new Error("opencode-okf: `validateOnEdit` must be a boolean")
  }
  return { bundleDirectory, validateOnEdit }
}

export const OKFPlugin = (async ({ client, directory, worktree }, rawOptions) => {
  const options = readOptions(rawOptions)
  const configuredRoot = resolveBundlePath(worktree, options.bundleDirectory)
  const commandNames = new Set(["okf-init", "okf-update", "okf-validate", "okf-compact"])
  let validationTimer: ReturnType<typeof setTimeout> | undefined
  let lastErrorSignature = ""

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

    "command.execute.before": async (input, output) => {
      if (!commandNames.has(input.command)) return
      const runtimeContext = `\n\nOKF runtime context: current UTC time is ${new Date().toISOString()}; configured bundle directory is \`${options.bundleDirectory}/\`.`
      const textPart = output.parts.find((part) => part.type === "text")
      if (textPart?.type === "text") textPart.text += runtimeContext
    },

    event: async ({ event }) => {
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
export { formatValidationReport, resolveBundlePath, validateBundle } from "./validator.js"
export type { ValidationIssue, ValidationReport, ValidationSeverity } from "./validator.js"
