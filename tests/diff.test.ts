import { afterEach, describe, expect, test } from "bun:test"
import { execFile } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { diffSources, formatDiffReport } from "../src/lib.js"

const runGit = (cwd: string, args: string[]) => promisify(execFile)("git", args, { cwd })

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "opencode-okf-diff-"))
  temporaryDirectories.push(root)
  return root
}

async function initRepository(root: string): Promise<void> {
  await runGit(root, ["init", "-q", "-b", "main"])
  await runGit(root, ["config", "user.email", "ci@example.com"])
  await runGit(root, ["config", "user.name", "CI"])
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe("diffSources", () => {
  test("reports modified, staged, deleted, and untracked files relative to HEAD", async () => {
    const root = await temporaryDirectory()
    await initRepository(root)

    await mkdir(join(root, "src"), { recursive: true })
    await writeFile(join(root, "src", "keep.ts"), "export const keep = 1;\n")
    await writeFile(join(root, "src", "delete-me.ts"), "export const doomed = 1;\n")
    await runGit(root, ["add", "."])
    await runGit(root, ["commit", "-q", "-m", "initial"])

    await writeFile(join(root, "src", "keep.ts"), "export const keep = 2;\n")
    await writeFile(join(root, "new-untracked.md"), "# New\n")
    await rm(join(root, "src", "delete-me.ts"))
    await writeFile(join(root, "staged-and-added.txt"), "staged\n")
    await runGit(root, ["add", "staged-and-added.txt"])

    const report = await diffSources(root)
    expect(report.notARepository).toBe(false)
    expect(report.base).toBe("HEAD")
    expect(report.includeUntracked).toBe(true)

    const byPath = new Map(report.changedFiles.map((entry) => [entry.path, entry.status] as const))
    expect(byPath.get("src/keep.ts")).toBe("modified")
    expect(byPath.get("staged-and-added.txt")).toBe("added")
    expect(byPath.get("src/delete-me.ts")).toBe("deleted")
    expect(byPath.get("new-untracked.md")).toBe("untracked")
  })

  test("respects path scope and omits untracked files when disabled", async () => {
    const root = await temporaryDirectory()
    await initRepository(root)
    await runGit(root, ["commit", "--allow-empty", "-q", "-m", "empty"])

    await mkdir(join(root, "src"), { recursive: true })
    await mkdir(join(root, "docs"), { recursive: true })
    await writeFile(join(root, "src", "feature.ts"), "// hi\n")
    await writeFile(join(root, "docs", "notes.md"), "## Notes\n")

    const scoped = await diffSources(root, { path: "src" })
    expect(scoped.changedFiles.map((entry) => entry.path)).toEqual(["src/feature.ts"])

    const withoutUntracked = await diffSources(root, { includeUntracked: false })
    expect(withoutUntracked.changedFiles).toHaveLength(0)
  })

  test("returns an empty report when run outside a git repository", async () => {
    const root = await temporaryDirectory()

    const report = await diffSources(root)
    expect(report.notARepository).toBe(true)
    expect(report.changedFiles).toEqual([])
    expect(formatDiffReport(report)).toContain("Not a git repository")
  })
})
