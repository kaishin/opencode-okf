import { readdir } from "node:fs/promises"
import { extname, join, relative, resolve, sep } from "node:path"

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
])

const SOURCE_DIRECTORIES = new Set([
  "docs",
  "doc",
  "documentation",
  "schema",
  "schemas",
  "database",
  "db",
  "migrations",
  "analytics",
  "dashboards",
  "dashboard",
  "metrics",
  "data",
  "models",
])

const SOURCE_EXTENSIONS = new Set([".sql", ".dbml", ".prisma", ".yaml", ".yml", ".json", ".csv"])

export interface InspectionReport {
  rootPath: string
  scannedFiles: number
  truncated: boolean
  candidates: Array<{ category: string; path: string }>
}

function classifyCandidate(relativePath: string): string | undefined {
  const parts = relativePath.toLowerCase().split("/")
  const name = parts.at(-1) ?? ""
  const extension = extname(name)
  if (parts.some((part) => SOURCE_DIRECTORIES.has(part))) return "source directory"
  if (SOURCE_EXTENSIONS.has(extension)) return "data or schema artifact"
  if (/dashboard|lookml|metabase|superset|tableau/.test(name)) return "dashboard artifact"
  if (/readme|product|analytics|metric|revenue|churn|subscription/.test(name)) return "documentation candidate"
  return undefined
}

export async function inspectProject(rootPath: string, maxFiles = 500): Promise<InspectionReport> {
  const root = resolve(rootPath)
  const candidates: Array<{ category: string; path: string }> = []
  let scannedFiles = 0
  let truncated = false

  async function visit(directory: string): Promise<void> {
    if (truncated) return
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (truncated) return
      const fullPath = join(directory, entry.name)
      const relativePath = relative(root, fullPath).split(sep).join("/")
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await visit(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      scannedFiles += 1
      if (scannedFiles > maxFiles) {
        truncated = true
        return
      }

      const category = classifyCandidate(relativePath)
      if (category) candidates.push({ category, path: relativePath })
    }
  }

  await visit(root)
  return {
    rootPath: root,
    scannedFiles: Math.min(scannedFiles, maxFiles),
    truncated,
    candidates,
  }
}

export function formatInspectionReport(report: InspectionReport): string {
  const lines = [
    `Inspected ${report.scannedFiles} file(s) under ${report.rootPath}.`,
    `Found ${report.candidates.length} likely knowledge source(s).`,
  ]
  for (const candidate of report.candidates) lines.push(`- [${candidate.category}] ${candidate.path}`)
  if (report.truncated) lines.push("Scan stopped at the configured file limit; inspect a narrower path if needed.")
  return lines.join("\n")
}
