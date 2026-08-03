---
type: Module
title: Prompts
description: Slash-command templates that drive model-led OKF authoring and maintenance.
tags: [prompts, commands, authoring]
timestamp: 2026-08-03T09:47:54Z
---

# Source

`src/prompts.ts`

# Exports

| Function | Command |
| --- | --- |
| `createPrompt(bundleDirectory)` | `/okf-create` |
| `updatePrompt(bundleDirectory)` | `/okf-update` |
| `capturePrompt(bundleDirectory)` | `/okf-capture` |
| `compactPrompt(bundleDirectory)` | `/okf-compact` |
| `diffPrompt(bundleDirectory)` | `/okf-diff` |
| `validatePrompt(bundleDirectory)` | `/okf-validate` |

# Shared authoring rules (`AUTHORING_RULES`)

Embedded in create/update prompts:

- Bundle directory is the OKF root
- Concepts: UTF-8 Markdown + YAML frontmatter; required non-empty `type`; recommended `title`, `description`, `tags`, ISO 8601 UTC `timestamp`; `resource` only when canonical URI is known
- Reserve `index.md` / `log.md`; log dates newest-first `YYYY-MM-DD`
- Prefer bundle-relative links like `/tables/subscriptions.md`
- Concise structural Markdown; no invented business rules or URLs
- Unresolved facts as dated `**Question**` entries in nearest `log.md`
- Preserve producer-defined frontmatter when updating
- Run `okf_validate` before finishing; fix conformance errors; warnings are not grounds to fabricate content

# Argument placeholder

Templates include `$ARGUMENTS` for user-supplied focus text. Plugin hook appends runtime UTC time and configured bundle directory at execute time.

# Compact aggressiveness (prompt-only)

Interpreted from arguments; default `balanced`:

- `conservative` — remove only clearly superseded or fully captured entries
- `balanced` — also drop chatter, transient details, duplicates
- `aggressive` — keep standing decisions, constraints, open questions; summarize older groups

# Related

* [Commands](/commands/index.md)
* [Plugin](/modules/plugin.md)
