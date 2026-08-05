---
type: Command
title: /okf-compact
description: Compact OKF logs, or the whole bundle with hard arg all.
tags: [command, log, maintenance]
timestamp: 2026-08-05T00:00:00Z
---

# Registration

- Name: `okf-compact`
- Template: `compactPrompt(bundleDirectory)`
- Description: "Compact OKF logs, or the whole bundle with `all`"

# Hard arguments

| Invocation | Scope |
| --- | --- |
| `/okf-compact` | **logs** only |
| `/okf-compact all` | **all** — concepts, indexes, and logs |
| `/okf-compact all aggressive` | whole bundle, aggressive |
| `/okf-compact balanced focus…` | logs only, balanced + focus |

Optional aggressiveness after scope: `conservative` | `balanced` (default) | `aggressive`. Remaining tokens are focus.

# Behavior (prompt-only)

## logs (default)

- Keep durable decisions, constraints, open questions, source pointers
- Promote facts into concepts when appropriate, then drop from the log
- Drop superseded, duplicated, chatter, transient debugging

## all

Everything in **logs**, plus:

- Merge duplicate/near-duplicate concepts; retarget links
- Remove clearly obsolete or empty concepts (respect aggressiveness)
- Tighten verbose concept prose without inventing or dropping meaning
- Refresh every `index.md` to match remaining concepts
- Normalize frontmatter; never invent `resource` URIs

Never delete still-open questions; never invent replacement facts.

# Related

* [Prompts](/modules/prompts.md)
* [Reserved files](/okf-rules/reserved-files.md)
