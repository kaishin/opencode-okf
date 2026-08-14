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

`title`, `description`, `tags`, and `generated`. A legacy `timestamp` remains consumable as a fallback but triggers migration guidance.

# Optional field shape checks (warnings)

| Field | Expected shape |
| --- | --- |
| `title` | Non-empty string when present |
| `description` | Non-empty string when present |
| `tags` | YAML list of non-empty strings |
| `generated` | Mapping with actor `by` and ISO 8601 datetime `at` |
| `verified` | One `{ by, at }` mapping or a non-empty list of them |
| `sources` | Non-empty list; each entry has non-empty string `resource`; optional `id`, actor `author`, non-negative `usage_count`, ISO date `last_modified` |
| `usage_window` | Mapping with ISO dates `from` and `to` |
| `status` | `draft`, `stable`, or `deprecated` |
| `stale_after` | ISO date (`YYYY-MM-DD`) |
| `resource` | Non-empty absolute URL or bundle-relative path |
| `parameters` | List of `{ name, type, required }` mappings |
| `executor`, `attester` | Mapping containing non-empty `resource` |

# Authoring policy (prompts)

- Include recommended and optional fields only when evidence supports them
- Record meaningful content changes as `generated: { by, at }` only when the actor is known
- Include `resource` only when a canonical URI or bundle path is known; never invent one
- Never invent actors, sources, verification events, lifecycle state, computations, executors, or attesters
- Preserve producer-defined frontmatter fields when updating
- Treat `type` values as free-form; consumers tolerate unknown values

# Attested Computation

A concept with `type: Attested Computation` must have non-empty string `runtime`; the validator treats its absence as an error. Its optional computation contract fields are shape-checked as warnings.

# Root index exception

Only bundle-root `index.md` may have frontmatter, and only to declare `okf_version` (non-empty string). Nested indexes must have no frontmatter.

# Related

* [Conformance](/okf-rules/conformance.md)
* [Validator](/modules/validator.md)
