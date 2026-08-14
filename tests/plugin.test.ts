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
  const commands: Array<{ path: { id: string }; body?: { command: string; arguments: string } }> = []
  return {
    root,
    toasts,
    commands,
    input: {
      client: {
        tui: {
          showToast: async (value: { body?: { message: string } }) => {
            toasts.push(value)
            return {}
          },
        },
        app: { log: async () => ({}) },
        session: {
          get: async () => ({ data: { id: "session-1" } }),
          command: async (value: { path: { id: string }; body?: { command: string; arguments: string } }) => {
            commands.push(value)
            return {}
          },
        },
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
    expect(config.command["okf-update"]?.template).toContain("/okf-upgrade")
    expect(config.command["okf-upgrade"]?.template).toContain("okf_spec")
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

  test("exposes a working inspect tool", async () => {
    const { root, input } = await makeContext()
    await mkdir(join(root, "docs"), { recursive: true })
    await writeFile(join(root, "docs", "revenue.md"), "# Revenue\n")
    await writeFile(join(root, "schema.sql"), "CREATE TABLE users (id INT);\n")
    const hooks = await OKFPlugin(input as never)

    const result = await hooks.tool?.okf_inspect?.execute(
      {},
      { worktree: root, directory: root } as never,
    )

    expect(typeof result).toBe("object")
    if (typeof result === "object") {
      expect(result.title).toContain("likely knowledge source")
      expect(result.output).toContain("[source directory] docs/")
      expect(result.metadata?.candidates).toBeGreaterThan(0)
    }
  })

  test("exposes a working init tool that does not overwrite", async () => {
    const { root, input } = await makeContext()
    await mkdir(join(root, "okf"), { recursive: true })
    await writeFile(join(root, "okf", "index.md"), "# Existing\n")
    const hooks = await OKFPlugin(input as never)

    const result = await hooks.tool?.okf_init?.execute(
      {},
      { worktree: root, directory: root } as never,
    )

    expect(typeof result).toBe("object")
    if (typeof result === "object") {
      expect(result.title).toBe("OKF bundle initialized")
      expect(result.output).toContain("created log.md")
      expect(result.output).toContain("kept existing index.md")
      expect(result.metadata?.created).toEqual(["log.md"])
      expect(result.metadata?.existing).toEqual(["index.md"])
    }

    const index = await readFile(join(root, "okf", "index.md"), "utf8")
    expect(index).toBe("# Existing\n")
  })

  test("injects OKF guidance into system prompt when relevant", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never)
    const systemOutput = { system: ["Base prompt."] }
    const otherOutput = { system: ["Base prompt."] }

    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s", model: {} as never },
      { ...systemOutput, system: [...systemOutput.system] } as never,
    )
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s", model: {} as never },
      otherOutput as never,
    )

    const okfModified = systemOutput.system.join("\n")
    const unmodified = otherOutput.system.join("\n")
    expect(unmodified).not.toContain("OKF workflow:")
    // The test above mutates the original; use a fresh copy for the OKF case.
    const okfInput = { system: ["Base prompt mentioning OKF bundle."] }
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s", model: {} as never },
      okfInput as never,
    )
    expect(okfInput.system.join("\n")).toContain("OKF workflow:")
    expect(okfInput.system.join("\n")).toContain("okf_inspect")
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

  test("does nothing on session.idle when captureOn is unset", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never)

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-1" } } } as never)

    expect(toasts).toHaveLength(0)
    expect(commands).toHaveLength(0)
  })

  test("notifies once per user activity when captureOn.sessionIdle is notify", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { sessionIdle: "notify" } })
    const userMessage = {
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    }
    const idle = { event: { type: "session.idle", properties: { sessionID: "session-1" } } }

    await hooks.event?.(userMessage as never)
    await hooks.event?.(idle as never)
    await hooks.event?.(idle as never)

    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.body?.message).toContain("/okf-update session")
    expect(commands).toHaveLength(0)

    await hooks.event?.(userMessage as never)
    await hooks.event?.(idle as never)

    expect(toasts).toHaveLength(2)
  })

  test("skips the idle nudge when no bundle exists", async () => {
    const { toasts, commands, input } = await makeContext()
    const hooks = await OKFPlugin(input as never, { captureOn: { sessionIdle: "auto" } })

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-1" } } } as never)

    expect(toasts).toHaveLength(0)
    expect(commands).toHaveLength(0)
  })

  test("auto-captures on idle without looping on its own command", async () => {
    const { root, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { sessionIdle: "auto" } })
    const idle = { event: { type: "session.idle", properties: { sessionID: "session-1" } } }

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.(idle as never)

    expect(commands).toHaveLength(1)
    expect(commands[0]?.body?.command).toBe("okf-update")
    expect(commands[0]?.body?.arguments).toBe("session")

    // The capture command posts its own user message; that must not re-arm.
    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.(idle as never)
    await hooks.event?.(idle as never)

    expect(commands).toHaveLength(1)

    // A real user message after the capture re-arms the session.
    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.(idle as never)

    expect(commands).toHaveLength(2)
  })

  test("injects OKF preservation context on compaction when captureOn.compacting is auto", async () => {
    const { root, toasts, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, {
      bundleDirectory: "okf",
      captureOn: { compacting: "auto" },
    })
    const output = { context: [] as string[] }

    await hooks["experimental.session.compacting"]?.({ sessionID: "session-1" }, output as never)

    expect(output.context).toHaveLength(1)
    expect(output.context[0]).toContain("`okf/`")
    expect(output.context[0]).toContain("/okf-update session")
    expect(toasts).toHaveLength(0)
  })

  test("nudges on compaction when captureOn.compacting is notify", async () => {
    const { root, toasts, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { compacting: "notify" } })
    const output = { context: [] as string[] }

    await hooks["experimental.session.compacting"]?.({ sessionID: "session-1" }, output as never)

    expect(output.context).toHaveLength(0)
    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.body?.message).toContain("compacted")
  })

  test("leaves compaction untouched when captureOn.compacting is off", async () => {
    const { root, toasts, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never)
    const output = { context: [] as string[] }

    await hooks["experimental.session.compacting"]?.({ sessionID: "session-1" }, output as never)

    expect(output.context).toHaveLength(0)
    expect(toasts).toHaveLength(0)
  })

  test("notifies after compaction when captureOn.compacted is notify", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { compacted: "notify" } })

    await hooks.event?.({ event: { type: "session.compacted", properties: { sessionID: "session-1" } } } as never)

    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.body?.message).toContain("compacted")
    expect(commands).toHaveLength(0)
  })

  test("auto-captures on every compaction without re-arming idle", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, {
      captureOn: { compacted: "auto", sessionIdle: "auto" },
    })
    const compacted = { event: { type: "session.compacted", properties: { sessionID: "session-1" } } }

    // No user activity required: compaction itself is the trigger.
    await hooks.event?.(compacted as never)
    expect(commands).toHaveLength(1)

    // The capture command's own user message must not re-arm the idle moment.
    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-1" } } } as never)
    expect(commands).toHaveLength(1)

    // A second compaction fires again (consumed on idle above, but compacted needs no arming).
    await hooks.event?.(compacted as never)
    expect(commands).toHaveLength(2)
    expect(toasts.length).toBeGreaterThan(0)
  })

  test("does nothing after compaction when captureOn.compacted is off", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never)

    await hooks.event?.({ event: { type: "session.compacted", properties: { sessionID: "session-1" } } } as never)

    expect(toasts).toHaveLength(0)
    expect(commands).toHaveLength(0)
  })

  test("notifies when all todos complete and captureOn.todoComplete is notify", async () => {
    const { root, toasts, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { todoComplete: "notify" } })
    const todos = (statuses: string[]) => ({
      event: {
        type: "todo.updated",
        properties: {
          sessionID: "session-1",
          todos: statuses.map((status, index) => ({ id: `${index}`, content: "task", status, priority: "medium" })),
        },
      },
    })

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.(todos(["completed", "in_progress"]) as never)
    expect(toasts).toHaveLength(0)

    await hooks.event?.(todos(["completed", "cancelled"]) as never)
    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.body?.message).toContain("todos complete")
    expect(commands).toHaveLength(0)

    // Once per activity stretch: a repeated all-complete update stays silent.
    await hooks.event?.(todos(["completed", "cancelled"]) as never)
    expect(toasts).toHaveLength(1)
  })

  test("auto-captures on todo completion and ignores todo updates during capture", async () => {
    const { root, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { todoComplete: "auto" } })
    const allDone = {
      event: {
        type: "todo.updated",
        properties: {
          sessionID: "session-1",
          todos: [{ id: "1", content: "task", status: "completed", priority: "high" }],
        },
      },
    }

    // Not armed yet: no user message seen.
    await hooks.event?.(allDone as never)
    expect(commands).toHaveLength(0)

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.(allDone as never)
    expect(commands).toHaveLength(1)

    // The capture command's own todo writes must not loop.
    await hooks.event?.(allDone as never)
    expect(commands).toHaveLength(1)
  })

  test("ignores empty todo lists and non-user sessions for todoComplete", async () => {
    const { root, toasts, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { todoComplete: "notify" } })

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks.event?.({
      event: { type: "todo.updated", properties: { sessionID: "session-1", todos: [] } },
    } as never)

    expect(toasts).toHaveLength(0)
  })

  test("injects buffered tool evidence into okf-update session prompts", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never, { captureEvidence: true })
    const runTool = (title: string) =>
      hooks["tool.execute.after"]?.(
        { tool: "edit", sessionID: "session-1", callID: "c", args: {} },
        { title, output: "", metadata: {} } as never,
      )

    await runTool("src/index.ts")
    await runTool("tests/plugin.test.ts")

    const output = { parts: [{ type: "text", text: "prompt" }] }
    await hooks["command.execute.before"]?.(
      { command: "okf-update", sessionID: "session-1", arguments: "session" },
      output as never,
    )

    expect(output.parts[0]?.text).toContain("Buffered session evidence (2 recent tool call(s), oldest first)")
    expect(output.parts[0]?.text).toContain("- edit: src/index.ts")
    expect(output.parts[0]?.text).toContain("- edit: tests/plugin.test.ts")

    // Evidence is drained once consumed.
    const second = { parts: [{ type: "text", text: "prompt" }] }
    await hooks["command.execute.before"]?.(
      { command: "okf-update", sessionID: "session-1", arguments: "session" },
      second as never,
    )
    expect(second.parts[0]?.text).not.toContain("Buffered session evidence")

    // Other commands and non-session modes never see evidence.
    await runTool("src/capture.ts")
    const other = { parts: [{ type: "text", text: "prompt" }] }
    await hooks["command.execute.before"]?.(
      { command: "okf-update", sessionID: "session-1", arguments: "diff" },
      other as never,
    )
    expect(other.parts[0]?.text).not.toContain("Buffered session evidence")
  })

  test("does not buffer evidence when captureEvidence is off", async () => {
    const { input } = await makeContext()
    const hooks = await OKFPlugin(input as never)

    await hooks["tool.execute.after"]?.(
      { tool: "edit", sessionID: "session-1", callID: "c", args: {} },
      { title: "src/index.ts", output: "", metadata: {} } as never,
    )
    const output = { parts: [{ type: "text", text: "prompt" }] }
    await hooks["command.execute.before"]?.(
      { command: "okf-update", sessionID: "session-1", arguments: "session" },
      output as never,
    )

    expect(output.parts[0]?.text).not.toContain("Buffered session evidence")
  })

  test("clears per-session state when the session is deleted", async () => {
    const { root, commands, input } = await makeContext()
    await mkdir(join(root, "okf"))
    const hooks = await OKFPlugin(input as never, { captureOn: { sessionIdle: "auto" }, captureEvidence: true })

    await hooks.event?.({
      event: { type: "message.updated", properties: { info: { role: "user", sessionID: "session-1" } } },
    } as never)
    await hooks["tool.execute.after"]?.(
      { tool: "edit", sessionID: "session-1", callID: "c", args: {} },
      { title: "src/index.ts", output: "", metadata: {} } as never,
    )
    await hooks.event?.({
      event: { type: "session.deleted", properties: { info: { id: "session-1" } } },
    } as never)

    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-1" } } } as never)
    expect(commands).toHaveLength(0)

    const output = { parts: [{ type: "text", text: "prompt" }] }
    await hooks["command.execute.before"]?.(
      { command: "okf-update", sessionID: "session-1", arguments: "session" },
      output as never,
    )
    expect(output.parts[0]?.text).not.toContain("Buffered session evidence")
  })

  test("rejects invalid captureOn values", async () => {
    const { input } = await makeContext()
    await expect(OKFPlugin(input as never, { captureOn: "auto" } as never)).rejects.toThrow(
      "`captureOn` must be an object",
    )
    await expect(OKFPlugin(input as never, { captureOn: { sessionIdle: "always" } } as never)).rejects.toThrow(
      '`captureOn.sessionIdle` must be "off", "notify", or "auto"',
    )
    await expect(OKFPlugin(input as never, { captureOn: { compacted: 1 } } as never)).rejects.toThrow(
      '`captureOn.compacted` must be "off", "notify", or "auto"',
    )
    await expect(OKFPlugin(input as never, { captureEvidence: "yes" } as never)).rejects.toThrow(
      "`captureEvidence` must be a boolean",
    )
  })

  test("rejects an invalid configured path", async () => {
    const { input } = await makeContext()
    expect(OKFPlugin(input as never, { bundleDirectory: "../outside" })).rejects.toThrow(
      "must stay inside the worktree",
    )
  })
})
