import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { formatValidationReport, resolveBundlePath, validateBundle } from "../src/validator.js"

const temporaryDirectories: string[] = []

async function temporaryBundle(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "opencode-okf-"))
  temporaryDirectories.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe("validateBundle", () => {
  test("accepts a conformant bundle", async () => {
    const root = await temporaryBundle()
    await mkdir(join(root, "tables"))
    await writeFile(
      join(root, "index.md"),
      `---
okf_version: "0.1"
---

# Tables

* [Subscriptions](tables/subscriptions.md) - Subscription records.
`,
    )
    await writeFile(
      join(root, "log.md"),
      `# Bundle Update Log

## 2026-07-16

* **Creation**: Added [Subscriptions](/tables/subscriptions.md).
`,
    )
    await writeFile(
      join(root, "tables", "subscriptions.md"),
      `---
type: Table
title: Subscriptions
description: Subscription records.
resource: https://example.com/schema/subscriptions
tags: [billing]
timestamp: "2026-07-16T12:00:00Z"
---

# Source

Defined by the application schema.
`,
    )

    const report = await validateBundle(root)

    expect(report.valid).toBe(true)
    expect(report.concepts).toBe(1)
    expect(report.files).toBe(3)
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
  })

  test("rejects missing and malformed concept frontmatter", async () => {
    const root = await temporaryBundle()
    await writeFile(join(root, "missing.md"), "# Missing frontmatter\n")
    await writeFile(join(root, "malformed.md"), "---\ntype: [\n---\n\nBody\n")
    await writeFile(join(root, "empty-type.md"), "---\ntype: \"\"\n---\n\nBody\n")

    const report = await validateBundle(root)

    expect(report.valid).toBe(false)
    expect(report.errors).toHaveLength(3)
    expect(report.errors.map((item) => item.message).join("\n")).toContain("missing YAML frontmatter")
    expect(report.errors.map((item) => item.message).join("\n")).toContain("Invalid YAML frontmatter")
    expect(report.errors.map((item) => item.message).join("\n")).toContain("non-empty string `type`")
  })

  test("reports optional metadata and broken links as warnings", async () => {
    const root = await temporaryBundle()
    await writeFile(
      join(root, "metric.md"),
      `---
type: Metric
tags: revenue
timestamp: "2026-02-31T00:00:00Z"
---

See [missing](/tables/missing.md).
`,
    )

    const report = await validateBundle(root)

    expect(report.valid).toBe(true)
    expect(report.errors).toEqual([])
    expect(report.warnings.map((item) => item.message)).toContain("Recommended frontmatter field `title` is missing")
    expect(report.warnings.map((item) => item.message)).toContain(
      "Frontmatter field `tags` should be a YAML list of non-empty strings",
    )
    expect(report.warnings.map((item) => item.message)).toContain(
      "Frontmatter field `timestamp` should be an ISO 8601 datetime",
    )
    expect(report.warnings.map((item) => item.message)).toContain("Broken internal link: /tables/missing.md")
  })

  test("validates reserved index and log structure", async () => {
    const root = await temporaryBundle()
    await mkdir(join(root, "metrics"))
    await writeFile(join(root, "metrics", "index.md"), "---\nokf_version: \"0.1\"\n---\n\nNo entries.\n")
    await writeFile(
      join(root, "log.md"),
      `# Updates

## 2026-01-01
* Older first.

## 2026-02-01
No list entry.
`,
    )

    const report = await validateBundle(root)
    const messages = report.errors.map((item) => item.message).join("\n")

    expect(report.valid).toBe(false)
    expect(messages).toContain("Only the bundle-root `index.md` may contain frontmatter")
    expect(messages).toContain("Index must contain at least one Markdown section heading")
    expect(messages).toContain("Index must contain at least one bulleted Markdown link")
    expect(messages).toContain("newest first")
    expect(messages).toContain("Every log date group must contain at least one list entry")
  })

  test("rejects impossible log dates", async () => {
    const root = await temporaryBundle()
    await writeFile(join(root, "log.md"), "# Updates\n\n## 2026-02-31\n\n* Impossible date.\n")

    const report = await validateBundle(root)

    expect(report.valid).toBe(false)
    expect(report.errors.map((item) => item.message)).toContain("Invalid log date heading: 2026-02-31")
  })

  test("formats a readable report", async () => {
    const root = await temporaryBundle()
    const report = await validateBundle(join(root, "missing"))
    const output = formatValidationReport(report)

    expect(output).toContain("OKF validation failed")
    expect(output).toContain("Errors:")
    expect(output).toContain("Cannot read bundle directory")
  })
})

describe("resolveBundlePath", () => {
  test("allows paths inside the worktree", async () => {
    const root = await temporaryBundle()
    expect(resolveBundlePath(root, "knowledge/okf")).toBe(join(root, "knowledge", "okf"))
  })

  test("rejects paths outside the worktree", async () => {
    const root = await temporaryBundle()
    expect(() => resolveBundlePath(root, "../outside")).toThrow("must stay inside the worktree")
  })
})
