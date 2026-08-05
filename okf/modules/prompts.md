---
type: Module
title: Prompts
description: Slash-command templates that drive model-led OKF authoring and maintenance.
tags: [prompts, commands, authoring]
timestamp: 2026-08-05T00:00:00Z
---

# Source

`src/prompts.ts`

# Exports

| Function | Command |
| --- | --- |
| `initPrompt(bundleDirectory)` | `/okf-init` |
| `updatePrompt(bundleDirectory, mode?, rest?)` | `/okf-update` |
| `parseUpdateArgs(args)` | hard mode parser for update |
| `compactPrompt(bundleDirectory, scope?, aggressiveness?, rest?)` | `/okf-compact` |
| `parseCompactArgs(args)` | hard scope/aggressiveness parser |
| `validatePrompt(bundleDirectory)` | `/okf-validate` |

# Update hard modes

| Args | Mode |
| --- | --- |
| *(none)* | repo — full repository |
| `diff [ref] [focus…]` | git diff via `okf_diff` |
| `session [focus…]` | conversation + work; concepts/indexes first, not log-only |

# Shared authoring rules (`AUTHORING_RULES`)

Embedded in init/update prompts:

- Bundle directory is the OKF root
- Concepts: UTF-8 Markdown + YAML frontmatter; required non-empty `type`; recommended `title`, `description`, `tags`, ISO 8601 UTC `timestamp`; `resource` only when canonical URI is known
- Reserve `index.md` / `log.md`; log dates newest-first `YYYY-MM-DD`
- Prefer bundle-relative links like `/tables/subscriptions.md`
- Concise structural Markdown; no invented business rules or URLs
- Unresolved facts as dated `**Question**` entries in nearest `log.md`
- Preserve producer-defined frontmatter when updating
- Run `okf_validate` before finishing; fix conformance errors; warnings are not grounds to fabricate content

# Argument placeholder

Templates include `$ARGUMENTS` for user-supplied text. Plugin hook appends runtime UTC time and configured bundle directory at execute time.

# Compact args

| Args | Scope |
| --- | --- |
| *(none)* or aggressiveness/focus only | **logs** |
| `all` *[aggressiveness] [focus…]* | **all** — concepts, indexes, logs |

Aggressiveness (default `balanced`):

- `conservative` — remove only clearly superseded or fully captured entries
- `balanced` — also drop chatter, transient details, duplicates, redundant prose
- `aggressive` — keep only what is still directly useful; merge/remove low-value concepts

# Related

* [Commands](/commands/index.md)
* [Plugin](/modules/plugin.md)
