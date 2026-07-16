import { resolve } from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import { createPrompt, updatePrompt, validatePrompt } from "./prompts.js"
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
  const commandNames = new Set(["okf-create", "okf-update", "okf-validate"])
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
      config.command["okf-create"] ??= {
        description: "Create an evidence-backed OKF bundle",
        template: createPrompt(options.bundleDirectory),
      }
      config.command["okf-update"] ??= {
        description: "Update an existing OKF bundle from repository evidence",
        template: updatePrompt(options.bundleDirectory),
      }
      config.command["okf-validate"] ??= {
        description: "Validate an OKF bundle and optionally fix it",
        template: validatePrompt(options.bundleDirectory),
      }
    },

    tool: {
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
export { formatValidationReport, resolveBundlePath, validateBundle } from "./validator.js"
export type { ValidationIssue, ValidationReport, ValidationSeverity } from "./validator.js"
