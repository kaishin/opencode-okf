import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { captureSession } from "../src/lib.js"

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "opencode-okf-capture-"))
  temporaryDirectories.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe("captureSession", () => {
  test("creates a valid dated log entry", async () => {
    const root = await temporaryDirectory()
    const report = await captureSession(
      join(root, "okf"),
      {
        title: "Subscription model decision",
        summary: "The session established the source of truth for subscription state.",
        decisions: ["Use the application schema as the authoritative source."],
        changes: ["Documented the subscription state transition."],
        questions: ["Confirm the retention policy with the data team."],
      },
      new Date("2026-07-29T12:34:56Z"),
    )
    const log = await readFile(join(root, "okf", "log.md"), "utf8")

    expect(report.created).toBe(true)
    expect(report.date).toBe("2026-07-29")
    expect(report.validation.valid).toBe(true)
    expect(log).toContain("## 2026-07-29")
    expect(log).toContain("**Session: Subscription model decision**")
    expect(log).toContain("Use the application schema as the authoritative source.")
    expect(log).toContain("Confirm the retention policy with the data team.")
  })

  test("prepends same-day captures without duplicating the date group", async () => {
    const root = await temporaryDirectory()
    const bundle = join(root, "okf")
    await mkdir(bundle)
    await writeFile(
      join(bundle, "log.md"),
      "# Bundle Update Log\n\n## 2026-07-29\n\n* **Session: Earlier** (2026-07-29T09:00:00Z)\n  * **Summary**: Earlier work.\n",
    )

    await captureSession(
      bundle,
      { title: "Later", summary: "Later work." },
      new Date("2026-07-29T17:00:00Z"),
    )
    const log = await readFile(join(bundle, "log.md"), "utf8")

    expect(log.match(/^## 2026-07-29$/gm)).toHaveLength(1)
    expect(log.indexOf("Session: Later")).toBeLessThan(log.indexOf("Session: Earlier"))
  })

  test("keeps date groups newest first", async () => {
    const root = await temporaryDirectory()
    const bundle = join(root, "okf")
    await mkdir(bundle)
    await writeFile(
      join(bundle, "log.md"),
      "# Bundle Update Log\n\n## 2026-07-28\n\n* **Session: Earlier** (2026-07-28T09:00:00Z)\n  * **Summary**: Earlier work.\n",
    )

    await captureSession(bundle, { summary: "New work." }, new Date("2026-07-29T17:00:00Z"))
    const log = await readFile(join(bundle, "log.md"), "utf8")

    expect(log.indexOf("## 2026-07-29")).toBeLessThan(log.indexOf("## 2026-07-28"))
  })
})
