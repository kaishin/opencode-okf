import { execFile } from "node:child_process"
import { resolve } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const MAX_GIT_BUFFER = 16 * 1024 * 1024

export type FileStatus = "modified" | "added" | "deleted" | "renamed" | "type-changed" | "untracked"

export interface ChangedFile {
  path: string
  status: FileStatus
  fromPath?: string
}

export interface DiffOptions {
  base?: string
  includeUntracked?: boolean
  path?: string
}

export interface DiffReport {
  rootPath: string
  base: string
  includeUntracked: boolean
  scope: string
  changedFiles: ChangedFile[]
  notARepository: boolean
}

interface GitRunResult {
  stdout: string
  stderr: string
}

function runGit(cwd: string, args: string[]): Promise<GitRunResult> {
  return execFileAsync("git", args, {
    cwd: resolve(cwd),
    maxBuffer: MAX_GIT_BUFFER,
    encoding: "utf8",
  }) as Promise<GitRunResult>
}

async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await runGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    return stdout.trim() === "true"
  } catch {
    return false
  }
}

function mapStatus(code: string): FileStatus {
  switch (code) {
    case "A":
      return "added"
    case "D":
      return "deleted"
    case "M":
      return "modified"
    case "T":
      return "type-changed"
    case "R":
      return "renamed"
    case "C":
      return "added"
    default:
      return "modified"
  }
}

function parseDiff(raw: string, report: DiffReport): void {
  if (!raw) return
  let position = 0
  while (position < raw.length) {
    const statusEnd = raw.indexOf("\0", position)
    if (statusEnd < 0) break
    const header = raw.slice(position, statusEnd)
    position = statusEnd + 1
    if (!header) break

    const status = header[0] ?? ""
    if (status === "R" || status === "C") {
      // Format: "R100" or "C100" then NUL, then source path, NUL, then destination path, NUL.
      const fromEnd = raw.indexOf("\0", position)
      if (fromEnd < 0) break
      const fromPath = raw.slice(position, fromEnd)
      position = fromEnd + 1
      const toEnd = raw.indexOf("\0", position)
      if (toEnd < 0) break
      const toPath = raw.slice(position, toEnd)
      position = toEnd + 1
      report.changedFiles.push({
        path: toPath,
        status: status === "R" ? "renamed" : "modified",
        fromPath,
      })
      continue
    }

    const pathEnd = raw.indexOf("\0", position)
    if (pathEnd < 0) break
    const filePath = raw.slice(position, pathEnd)
    position = pathEnd + 1
    report.changedFiles.push({ path: filePath, status: mapStatus(status) })
  }
}

function parseUntracked(raw: string, report: DiffReport): void {
  if (!raw) return
  for (const part of raw.split("\0")) {
    if (part) report.changedFiles.push({ path: part, status: "untracked" })
  }
}

export async function diffSources(cwd: string, options: DiffOptions = {}): Promise<DiffReport> {
  const base = options.base?.trim() || "HEAD"
  const includeUntracked = options.includeUntracked !== false
  const scope = options.path?.trim() || "."
  const report: DiffReport = {
    rootPath: resolve(cwd),
    base,
    includeUntracked,
    scope,
    changedFiles: [],
    notARepository: false,
  }

  if (!(await isGitRepository(cwd))) {
    report.notARepository = true
    return report
  }

  const diffArgs = ["diff", "--name-status", "-z", base]
  if (scope !== ".") diffArgs.push("--", scope)
  const diffResult = await runGit(cwd, diffArgs)
  parseDiff(diffResult.stdout, report)

  if (includeUntracked) {
    const lsArgs = ["ls-files", "--others", "--exclude-standard", "-z"]
    if (scope !== ".") lsArgs.push("--", scope)
    const lsResult = await runGit(cwd, lsArgs)
    parseUntracked(lsResult.stdout, report)
  }

  report.changedFiles.sort((a, b) => a.path.localeCompare(b.path))
  return report
}

export function formatDiffReport(report: DiffReport): string {
  if (report.notARepository) {
    return `Not a git repository: ${report.rootPath}. Initialise git (or run from inside one) to use okf-diff.`
  }

  const scopePart = report.scope === "." ? "working tree" : `scope ${report.scope}`
  const lines = [
    `git diff vs ${report.base} (${scopePart}${report.includeUntracked ? ", includes untracked" : ""}) at ${report.rootPath}.`,
    `Found ${report.changedFiles.length} changed file(s).`,
  ]

  for (const entry of report.changedFiles) {
    if (entry.status === "renamed" && entry.fromPath) {
      lines.push(`- renamed    ${entry.fromPath} -> ${entry.path}`)
    } else {
      lines.push(`- ${entry.status.padEnd(10)} ${entry.path}`)
    }
  }

  return lines.join("\n")
}
