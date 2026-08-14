---
type: Module
title: Validator
description: Deterministic OKF v0.2-aware bundle validator used by tools, capture, and edit hooks.
tags: [validation, okf, conformance]
timestamp: 2026-08-03T09:47:54Z
---

# Source

`src/validator.ts`

# Public API

| Symbol | Role |
| --- | --- |
| `validateBundle(bundleRoot)` | Walk bundle, return `ValidationReport` |
| `formatValidationReport(report)` | Human-readable summary string |
| `resolveBundlePath(worktree, bundlePath)` | Resolve path; reject escapes outside worktree |
| `isPathInside(parent, candidate)` | Path containment check |

# Walk and decode

- Recursively collects `.md` files under the bundle root.
- Decodes each file as UTF-8 with `fatal: true` (non-UTF-8 is an error).
- Reserved basenames: `index.md`, `log.md` (not counted as concepts).

# Conformance errors

Concept documents:

- Missing YAML frontmatter
- Unterminated or invalid YAML; frontmatter not a mapping
- Missing or empty string `type`

`index.md`:

- Non-root index must not have frontmatter
- Root index frontmatter, if present, must declare non-empty `okf_version`
- Must contain at least one Markdown section heading
- Must contain at least one bulleted Markdown link (`*` or `-` list item with a standard Markdown link)

`log.md`:

- Must not contain frontmatter
- Must start with a title heading (`# ...`)
- Must have at least one `## YYYY-MM-DD` date heading with a real calendar date
- Date groups must be newest first
- Every date group must contain at least one list entry

Bundle:

- Unreadable directory or non-UTF-8 file

# Warnings (non-failing)

- Missing recommended fields: `title`, `description`, `tags`, and `generated` when no legacy `timestamp` fallback exists
- Legacy `timestamp` values that should migrate to `generated: { by, at }`; malformed legacy timestamps
- Malformed optional v0.2 fields: `generated`, mapping-or-list `verified`, actor identifiers, `sources` and credibility signals, `usage_window`, `status`, `stale_after`, `parameters`, `executor`, and `attester`
- Malformed `resource` values; absolute URLs and bundle-relative paths are accepted
- Empty concept body
- Broken or escaping internal Markdown links

`valid` is `true` when `errors.length === 0`. Warnings never fail validation.

# Link resolution

Internal targets (not `#…`, not `//…`, not scheme URLs):

- Bundle-root links: path starting with `/` resolves from bundle root
- Relative links: resolve from the linking file's directory
- Fragment and query stripped before existence check
- Existence checked against walked filesystem entries

# v0.2-specific error

A concept with `type: Attested Computation` must carry a non-empty string `runtime`. Optional computation contract fields produce warnings when malformed.

# Date and actor formats

Datetime values in `generated.at`, `verified[].at`, and legacy `timestamp` use ISO 8601: `YYYY-MM-DDTHH:mm:ss`, optional fractional seconds, then `Z` or a `±HH:mm` offset, with a real calendar date. `stale_after`, source `last_modified`, and usage-window bounds use `YYYY-MM-DD`.

Actors use `<producer>/<version>`, `human:<id>`, or `process:<id>`.

# Related

* [Conformance](/okf-rules/conformance.md)
* [Frontmatter](/okf-rules/frontmatter.md)
* [Reserved files](/okf-rules/reserved-files.md)
* [okf_validate tool](/tools/okf_validate.md)
