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
okf_version: "0.2"
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
generated: { by: process:test, at: "2026-07-16T12:00:00Z" }
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

  test("validates OKF v0.2 provenance, trust, lifecycle, and attested computations", async () => {
    const root = await temporaryBundle()
    await writeFile(
      join(root, "computation.md"),
      `---
type: Attested Computation
title: Revenue
description: Computes revenue.
tags: [finance]
runtime: bigquery
parameters:
  - { name: year, type: integer, required: true }
generated: { by: agent/1.0, at: "2026-07-16T12:00:00Z" }
verified: { by: human:reviewer, at: "2026-07-17T12:00:00Z" }
status: stable
stale_after: 2026-12-31
sources:
  - id: policy
    resource: https://example.com/policy
    author: process:docs
    usage_count: 10
    last_modified: 2026-07-01
usage_window: { from: 2026-07-01, to: 2026-07-31 }
executor: { resource: references/run.md, receipt: [job_id] }
attester: { resource: references/check.ts }
---

# Computation

\`\`\`sql
SELECT @year
\`\`\`
`,
    )

    const report = await validateBundle(root)

    expect(report.valid).toBe(true)
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
  })

  test("reports malformed v0.2 fields and requires attested computation runtime", async () => {
    const root = await temporaryBundle()
    await writeFile(
      join(root, "bad.md"),
      `---
type: Attested Computation
title: Bad
description: Bad metadata.
tags: [bad]
generated: { by: unknown, at: yesterday }
verified: []
status: current
stale_after: 2026-02-31
sources: [{ title: Missing resource }]
usage_window: { from: 2026-01-01, to: never }
parameters: [{ name: year, type: integer }]
executor: {}
---

Body.
`,
    )

    const report = await validateBundle(root)
    const warnings = report.warnings.map((item) => item.message).join("\n")

    expect(report.valid).toBe(false)
    expect(report.errors.map((item) => item.message)).toContain(
      "Attested Computation frontmatter must contain a non-empty string `runtime`",
    )
    expect(warnings).toContain("generated.by")
    expect(warnings).toContain("generated.at")
    expect(warnings).toContain("verified")
    expect(warnings).toContain("status")
    expect(warnings).toContain("stale_after")
    expect(warnings).toContain("sources[0].resource")
    expect(warnings).toContain("usage_window")
    expect(warnings).toContain("parameters")
    expect(warnings).toContain("executor")
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
      "Legacy frontmatter field `timestamp` should be an ISO 8601 datetime",
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
