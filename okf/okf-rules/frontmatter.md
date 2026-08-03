---
type: Rule
title: Frontmatter
description: Concept document frontmatter fields checked by the validator.
tags: [okf, frontmatter, metadata]
timestamp: 2026-08-03T09:47:54Z
---

# Required

| Field | Rule |
| --- | --- |
| `type` | Non-empty string (error if missing/empty) |

# Recommended (warning if absent)

`title`, `description`, `tags`, `timestamp`

# Optional field shape checks (warnings)

| Field | Expected shape |
| --- | --- |
| `title` | Non-empty string when present |
| `description` | Non-empty string when present |
| `tags` | YAML list of non-empty strings |
| `timestamp` | ISO 8601 datetime (`YYYY-MM-DDTHH:mm:ss[.f]Z` or offset) with real calendar date |
| `resource` | Non-empty valid URI when present |

# Authoring policy (prompts)

- Include recommended fields when source supports them
- Include `resource` only when a canonical URI is known; never invent one
- Preserve producer-defined frontmatter fields when updating

# Root index exception

Only bundle-root `index.md` may have frontmatter, and only to declare `okf_version` (non-empty string). Nested indexes must have no frontmatter.

# Related

* [Conformance](/okf-rules/conformance.md)
* [Validator](/modules/validator.md)
