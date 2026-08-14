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
| `upgradePrompt(bundleDirectory)` | `/okf-upgrade` |
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
- Fetch the authoritative current specification with `okf_spec`; concept `type` values are producer-defined and consumers tolerate unknown values
- Concepts: UTF-8 Markdown + YAML frontmatter; required non-empty `type`; recommended `title`, `description`, and `tags`; record supported authorship/change time with `generated: { by, at }`; use `sources`, `verified`, `status`, and `stale_after` only from evidence; `resource` only when a canonical URI or bundle path is known
- Reserve `index.md` / `log.md`; log dates newest-first `YYYY-MM-DD`
- Prefer bundle-relative links like `/tables/subscriptions.md`
- Concise structural Markdown; no invented business rules or URLs
- Unresolved facts as dated `**Question**` entries in nearest `log.md`
- Preserve producer-defined frontmatter when updating
- Run `okf_validate` before finishing; fix conformance errors; warnings are not grounds to fabricate content

# Version handling

- `/okf-init` fetches the current specification before authoring.
- `/okf-update` reads root `okf_version`, fetches the current specification, and recommends `/okf-upgrade` when the bundle is older rather than silently migrating during a focused update.
- `/okf-upgrade` reads the fetched specification in full, walks the entire bundle, applies its migration guidance, preserves unknown fields and unsafe-to-migrate legacy data, updates root `okf_version`, and validates.
- Prompts never invent actors, sources, verification, lifecycle metadata, computations, executors, or attesters.

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
