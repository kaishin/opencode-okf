import { afterEach, describe, expect, test } from "bun:test"
import { execFile } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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
    const config = { command: { "okf-init": custom } }

    await hooks.config?.(config as never)

    expect(config.command["okf-init"]).toBe(custom)
    expect(config.command["okf-update"]?.template).toContain("Hard source mode")
    expect(config.command["okf-update"]?.template).toContain("`session`")
    expect(config.command["okf-update"]?.template).toContain("`diff`")
    expect(config.command["okf-validate"]?.template).toContain("okf_validate")
    expect(config.command["okf-capture"]).toBeUndefined()
    expect(config.command["okf-diff"]).toBeUndefined()
  })

  test("uses the configured bundle directory in commands", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never, { bundleDirectory: "knowledge/okf" })
    const config: { command?: Record<string, { template: string }> } = {}

    await hooks.config?.(config as never)

    expect(config.command?.["okf-init"]?.template).toContain("`knowledge/okf/`")
  })

  test("injects runtime context only into OKF commands", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never)
    const okfOutput = { parts: [{ type: "text", text: "prompt" }] }
    const otherOutput = { parts: [{ type: "text", text: "prompt" }] }

    await hooks["command.execute.before"]?.(
      { command: "okf-init", sessionID: "session", arguments: "" },
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

  test("exposes a working diff tool", async () => {
    const { root, input } = await makeContext()
    const git = (args: string[]) =>
      new Promise<void>((resolvePromise, reject) => {
        execFile("git", args, { cwd: root }, (error) => (error ? reject(error) : resolvePromise()))
      })
    await git(["init", "-q", "-b", "main"])
    await git(["config", "user.email", "ci@example.com"])
    await git(["config", "user.name", "CI"])
    await git(["commit", "--allow-empty", "-q", "-m", "initial"])
    await writeFile(join(root, "changed.md"), "# Changed\n")
    const hooks = await OKFPlugin(input as never)

    const result = await hooks.tool?.okf_diff?.execute(
      {},
      { worktree: root, directory: root } as never,
    )

    expect(typeof result).toBe("object")
    if (typeof result === "object") {
      expect(result.title).toContain("1 changed file(s)")
      expect(result.output).toContain("untracked  changed.md")
      expect(result.metadata?.base).toBe("HEAD")
    }
  })

  test("exposes a working session capture tool", async () => {
    const { root, input } = await makeContext()
    const hooks = await OKFPlugin(input as never)

    const result = await hooks.tool?.okf_capture?.execute(
      {
        title: "Session decision",
        summary: "Captured the important session outcome.",
        decisions: ["Keep the bundle log newest first."],
      },
      { worktree: root, directory: root } as never,
    )
    const log = await readFile(join(root, "okf", "log.md"), "utf8")

    expect(typeof result).toBe("object")
    if (typeof result === "object") expect(result.title).toBe("OKF session captured")
    expect(log).toContain("Keep the bundle log newest first.")
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
