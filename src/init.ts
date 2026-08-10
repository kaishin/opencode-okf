import { access, mkdir, writeFile } from "node:fs/promises"
import { basename, relative, resolve } from "node:path"

export interface InitReport {
  bundlePath: string
  created: string[]
  existing: string[]
}

function isAlreadyExists(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST"
}

async function writeIfMissing(path: string, content: string, report: InitReport): Promise<void> {
  try {
    await writeFile(path, content, { encoding: "utf8", flag: "wx" })
    report.created.push(relative(report.bundlePath, path) || basename(path))
  } catch (error: unknown) {
    if (isAlreadyExists(error)) {
      report.existing.push(relative(report.bundlePath, path) || basename(path))
      return
    }
    throw error
  }
}

export async function initializeBundle(bundlePath: string): Promise<InitReport> {
  const root = resolve(bundlePath)
  const report: InitReport = { bundlePath: root, created: [], existing: [] }
  await mkdir(root, { recursive: true })

  await writeIfMissing(
    resolve(root, "index.md"),
    [
      "# Open Knowledge Bundle",
      "",
      "This bundle records curated knowledge about this project in the Open Knowledge Format (OKF).",
      "",
      "## Contents",
      "",
      "- [Questions for maintainers](/log.md)",
      "",
    ].join("\n"),
    report,
  )
  await writeIfMissing(
    resolve(root, "log.md"),
    [
      "# Bundle Update Log",
      "",
      "## Questions for maintainers",
      "",
      "Add facts that could not be verified from the available sources here. Do not guess.",
      "",
    ].join("\n"),
    report,
  )

  return report
}

export function summarizeInit(report: InitReport): string {
  const created = report.created.length === 0 ? "no new files" : `created ${report.created.join(", ")}`
  const existing = report.existing.length === 0 ? "" : `; kept existing ${report.existing.join(", ")}`
  return `Initialized ${report.bundlePath}: ${created}${existing}.`
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
