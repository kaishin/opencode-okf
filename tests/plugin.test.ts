import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { OKFPlugin } from "../src/index.js"

const temporaryDirectories: string[] = []

async function makeContext() {
  const root = await mkdtemp(join(tmpdir(), "opencode-okf-plugin-"))
  temporaryDirectories.push(root)
  const toasts: Array<{ body?: { message: string } }> = []
  return {
    root,
    toasts,
    input: {
      client: {
        tui: {
          showToast: async (value: { body?: { message: string } }) => {
            toasts.push(value)
            return {}
          },
        },
        app: { log: async () => ({}) },
      },
      directory: root,
      worktree: root,
    },
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe("OKFPlugin", () => {
  test("registers commands without replacing user commands", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never)
    const custom = { template: "keep me" }
    const config = { command: { "okf-create": custom } }

    await hooks.config?.(config as never)

    expect(config.command["okf-create"]).toBe(custom)
    expect(config.command["okf-update"]?.template).toContain("Update the existing OKF bundle")
    expect(config.command["okf-validate"]?.template).toContain("okf_validate")
  })

  test("uses the configured bundle directory in commands", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never, { bundleDirectory: "knowledge/okf" })
    const config: { command?: Record<string, { template: string }> } = {}

    await hooks.config?.(config as never)

    expect(config.command?.["okf-create"]?.template).toContain("`knowledge/okf/`")
  })

  test("injects runtime context only into OKF commands", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never)
    const okfOutput = { parts: [{ type: "text", text: "prompt" }] }
    const otherOutput = { parts: [{ type: "text", text: "prompt" }] }

    await hooks["command.execute.before"]?.(
      { command: "okf-create", sessionID: "session", arguments: "" },
      okfOutput as never,
    )
    await hooks["command.execute.before"]?.(
      { command: "other", sessionID: "session", arguments: "" },
      otherOutput as never,
    )

    expect(okfOutput.parts[0]?.text).toContain("current UTC time is")
    expect(otherOutput.parts[0]?.text).toBe("prompt")
  })

  test("exposes a working validator tool", async () => {
    const { root, input } = await makeContext()
    await mkdir(join(root, "okf"))
    await writeFile(join(root, "okf", "concept.md"), "---\ntype: Metric\n---\n\nA metric.\n")
    const hooks = await OKFPlugin(input as never)

    const result = await hooks.tool?.okf_validate?.execute(
      {},
      { worktree: root, directory: root } as never,
    )

    expect(typeof result).toBe("object")
    if (typeof result === "object") {
      expect(result.title).toBe("OKF validation passed")
      expect(result.output).toContain("0 error(s)")
      expect(result.metadata?.warnings).toBe(4)
    }
  })

  test("validates worktree-relative file events when started in a subdirectory", async () => {
    const { root, toasts, input } = await makeContext()
    await mkdir(join(root, "packages", "app"), { recursive: true })
    await mkdir(join(root, "okf"))
    await writeFile(join(root, "okf", "broken.md"), "No frontmatter.\n")
    input.directory = join(root, "packages", "app")
    const hooks = await OKFPlugin(input as never)

    await hooks.event?.({
      event: { type: "file.edited", properties: { file: "okf/broken.md" } },
    } as never)
    await Bun.sleep(450)

    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.body?.message).toContain("1 OKF conformance error")
    await hooks.dispose?.()
  })

  test("rejects an invalid configured path", async () => {
    const { input } = await makeContext()
    expect(OKFPlugin(input as never, { bundleDirectory: "../outside" })).rejects.toThrow(
      "must stay inside the worktree",
    )
  })
})
