import { readdir, readFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { parseDocument } from "yaml"

const RESERVED_FILES = new Set(["index.md", "log.md"])
const RECOMMENDED_FIELDS = ["title", "description", "tags", "timestamp"] as const

export type ValidationSeverity = "error" | "warning"

export interface ValidationIssue {
  severity: ValidationSeverity
  file?: string
  message: string
}

export interface ValidationReport {
  valid: boolean
  root: string
  files: number
  concepts: number
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

interface ParsedMarkdown {
  body: string
  frontmatter?: Record<string, unknown>
  frontmatterError?: string
}

interface WalkResult {
  markdownFiles: string[]
  entries: Set<string>
}

export function isPathInside(parent: string, candidate: string): boolean {
  const path = relative(resolve(parent), resolve(candidate))
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
}

export function resolveBundlePath(worktree: string, bundlePath: string): string {
  const root = resolve(worktree)
  const candidate = resolve(root, bundlePath)
  if (!isPathInside(root, candidate)) {
    throw new Error(`Bundle path must stay inside the worktree: ${bundlePath}`)
  }
  return candidate
}

async function walk(root: string): Promise<WalkResult> {
  const markdownFiles: string[] = []
  const entries = new Set<string>([resolve(root)])

  async function visit(directory: string): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true })
    for (const child of children) {
      const path = resolve(directory, child.name)
      entries.add(path)
      if (child.isDirectory()) {
        await visit(path)
      } else if (child.isFile() && child.name.endsWith(".md")) {
        markdownFiles.push(path)
      }
    }
  }

  await visit(root)
  markdownFiles.sort()
  return { markdownFiles, entries }
}

function parseMarkdown(text: string): ParsedMarkdown {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== "---") return { body: text }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---")
  if (closingIndex === -1) {
    return { body: "", frontmatterError: "Unterminated YAML frontmatter block" }
  }

  const yaml = lines.slice(1, closingIndex).join("\n")
  const document = parseDocument(yaml, { prettyErrors: false })
  if (document.errors.length > 0) {
    return {
      body: lines.slice(closingIndex + 1).join("\n"),
      frontmatterError: `Invalid YAML frontmatter: ${document.errors[0]?.message ?? "unknown parse error"}`,
    }
  }

  const value: unknown = document.toJS()
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      body: lines.slice(closingIndex + 1).join("\n"),
      frontmatterError: "Frontmatter must be a YAML mapping",
    }
  }

  return {
    body: lines.slice(closingIndex + 1).join("\n").replace(/^\s*\n/, ""),
    frontmatter: value as Record<string, unknown>,
  }
}

function issue(
  collection: ValidationIssue[],
  severity: ValidationSeverity,
  file: string,
  message: string,
): void {
  collection.push({ severity, file, message })
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isIsoDateTime(value: unknown): boolean {
  if (!nonEmptyString(value)) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  return Boolean(match && isCalendarDate(match[1], match[2], match[3]) && !Number.isNaN(Date.parse(value)))
}

function isCalendarDate(yearValue: string | undefined, monthValue: string | undefined, dayValue: string | undefined): boolean {
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
    return false
  }
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= (daysInMonth[month - 1] ?? 0)
}

function validateConcept(
  file: string,
  parsed: ParsedMarkdown,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  if (parsed.frontmatterError) {
    issue(errors, "error", file, parsed.frontmatterError)
    return
  }
  if (!parsed.frontmatter) {
    issue(errors, "error", file, "Concept document is missing YAML frontmatter")
    return
  }
  if (!nonEmptyString(parsed.frontmatter.type)) {
    issue(errors, "error", file, "Concept frontmatter must contain a non-empty string `type`")
  }

  for (const field of RECOMMENDED_FIELDS) {
    if (parsed.frontmatter[field] === undefined || parsed.frontmatter[field] === null || parsed.frontmatter[field] === "") {
      issue(warnings, "warning", file, `Recommended frontmatter field \`${field}\` is missing`)
    }
  }

  for (const field of ["title", "description"] as const) {
    const value = parsed.frontmatter[field]
    if (value !== undefined && !nonEmptyString(value)) {
      issue(warnings, "warning", file, `Frontmatter field \`${field}\` should be a non-empty string`)
    }
  }

  const tags = parsed.frontmatter.tags
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => !nonEmptyString(tag)))) {
    issue(warnings, "warning", file, "Frontmatter field `tags` should be a YAML list of non-empty strings")
  }

  const timestamp = parsed.frontmatter.timestamp
  if (timestamp !== undefined && !isIsoDateTime(timestamp)) {
    issue(warnings, "warning", file, "Frontmatter field `timestamp` should be an ISO 8601 datetime")
  }

  const resource = parsed.frontmatter.resource
  if (resource !== undefined) {
    if (!nonEmptyString(resource)) {
      issue(warnings, "warning", file, "Frontmatter field `resource` should be a non-empty URI when present")
    } else {
      try {
        new URL(resource)
      } catch {
        issue(warnings, "warning", file, "Frontmatter field `resource` should be a valid URI")
      }
    }
  }

  if (parsed.body.trim().length === 0) {
    issue(warnings, "warning", file, "Concept document has an empty Markdown body")
  }
}

function validateIndex(
  file: string,
  parsed: ParsedMarkdown,
  errors: ValidationIssue[],
): void {
  if (parsed.frontmatterError) {
    issue(errors, "error", file, parsed.frontmatterError)
    return
  }

  if (parsed.frontmatter) {
    if (file !== "index.md") {
      issue(errors, "error", file, "Only the bundle-root `index.md` may contain frontmatter")
    } else if (!nonEmptyString(parsed.frontmatter.okf_version)) {
      issue(errors, "error", file, "Root index frontmatter must declare a non-empty `okf_version`")
    }
  }

  if (!/^#{1,6}\s+\S+/m.test(parsed.body)) {
    issue(errors, "error", file, "Index must contain at least one Markdown section heading")
  }
  if (!/^\s*[*-]\s+\[[^\]]+\]\([^)]+\)(?:\s+-\s+.+)?\s*$/m.test(parsed.body)) {
    issue(errors, "error", file, "Index must contain at least one bulleted Markdown link")
  }
}

function validateLog(file: string, parsed: ParsedMarkdown, errors: ValidationIssue[]): void {
  if (parsed.frontmatter || parsed.frontmatterError) {
    issue(errors, "error", file, parsed.frontmatterError ?? "Log files must not contain frontmatter")
    return
  }
  if (!/^#\s+\S+/.test(parsed.body.trimStart())) {
    issue(errors, "error", file, "Log must start with a title heading")
  }

  const headingMatches = [...parsed.body.matchAll(/^##\s+(.+?)\s*$/gm)]
  if (headingMatches.length === 0) {
    issue(errors, "error", file, "Log must contain at least one `## YYYY-MM-DD` date heading")
    return
  }

  const dates: string[] = []
  for (const match of headingMatches) {
    const date = match[1] ?? ""
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!dateParts || !isCalendarDate(dateParts[1], dateParts[2], dateParts[3])) {
      issue(errors, "error", file, `Invalid log date heading: ${date}`)
    } else {
      dates.push(date)
    }
  }

  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1]
    const current = dates[index]
    if (previous && current && current > previous) {
      issue(errors, "error", file, "Log date groups must be ordered newest first")
      break
    }
  }

  const sections = parsed.body.split(/^##\s+.+?\s*$/gm).slice(1)
  if (sections.some((section) => !/^\s*[*-]\s+\S+/m.test(section))) {
    issue(errors, "error", file, "Every log date group must contain at least one list entry")
  }
}

function validateLinks(
  file: string,
  root: string,
  body: string,
  entries: Set<string>,
  warnings: ValidationIssue[],
): void {
  const links = body.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g)
  for (const match of links) {
    let target = match[1] ?? ""
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1)
    if (!target || target.startsWith("#") || target.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(target)) {
      continue
    }

    target = target.split("#", 1)[0]?.split("?", 1)[0] ?? ""
    try {
      target = decodeURIComponent(target)
    } catch {
      issue(warnings, "warning", file, `Link target is not valid URI encoding: ${target}`)
      continue
    }

    const absoluteTarget = target.startsWith("/")
      ? resolve(root, `.${target}`)
      : resolve(dirname(resolve(root, file)), target)
    if (!isPathInside(root, absoluteTarget)) {
      issue(warnings, "warning", file, `Internal link escapes the bundle: ${target}`)
    } else if (!entries.has(absoluteTarget)) {
      issue(warnings, "warning", file, `Broken internal link: ${target}`)
    }
  }
}

export async function validateBundle(bundleRoot: string): Promise<ValidationReport> {
  const root = resolve(bundleRoot)
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  let walked: WalkResult
  try {
    walked = await walk(root)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push({ severity: "error", message: `Cannot read bundle directory: ${message}` })
    return { valid: false, root, files: 0, concepts: 0, errors, warnings }
  }

  let concepts = 0
  for (const absoluteFile of walked.markdownFiles) {
    const file = relative(root, absoluteFile).split(sep).join("/")
    let text: string
    try {
      const bytes = await readFile(absoluteFile)
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      issue(errors, "error", file, `Cannot read as UTF-8: ${message}`)
      continue
    }

    const parsed = parseMarkdown(text)
    const basename = file.split("/").at(-1) ?? ""
    if (!RESERVED_FILES.has(basename)) {
      concepts += 1
      validateConcept(file, parsed, errors, warnings)
    } else if (basename === "index.md") {
      validateIndex(file, parsed, errors)
    } else {
      validateLog(file, parsed, errors)
    }
    validateLinks(file, root, parsed.body, walked.entries, warnings)
  }

  return {
    valid: errors.length === 0,
    root,
    files: walked.markdownFiles.length,
    concepts,
    errors,
    warnings,
  }
}

export function formatValidationReport(report: ValidationReport): string {
  const status = report.valid ? "passed" : "failed"
  const lines = [
    `OKF validation ${status}: ${report.concepts} concept(s), ${report.files} Markdown file(s), ${report.errors.length} error(s), ${report.warnings.length} warning(s).`,
  ]

  if (report.errors.length > 0) {
    lines.push("", "Errors:")
    for (const item of report.errors) lines.push(`- ${item.file ? `${item.file}: ` : ""}${item.message}`)
  }
  if (report.warnings.length > 0) {
    lines.push("", "Warnings:")
    for (const item of report.warnings) lines.push(`- ${item.file ? `${item.file}: ` : ""}${item.message}`)
  }
  return lines.join("\n")
}
