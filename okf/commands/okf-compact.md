---
type: Command
title: /okf-compact
description: Compact OKF log files, keeping only durable, future-relevant knowledge.
tags: [command, log, maintenance]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-compact`
- Template: `compactPrompt(bundleDirectory)`
- Description: "Compact OKF log files, keeping only durable, future-relevant knowledge"

# Behavior (prompt-only)

No dedicated deterministic tool today. Whether one should exist is open: judgment-heavy steps (what is durable, what is superseded, how to rewrite summaries) likely stay model-led; candidates for determinism include parsing aggressiveness args, walking every `log.md`, validating structure after edits, and applying purely mechanical keep/drop rules if they are ever defined.

The model reads every `log.md` in the bundle and:

- Keeps decisions, constraints, tradeoffs, open questions, pointers to sources of truth, and facts not already in concept docs
- Promotes durable facts into concept files when appropriate, then removes them from the log
- Drops superseded, duplicated, chatter, transient debugging, or obsolete references
- Preserves newest-first dates and list formatting
- Never deletes still-open questions; never invents replacement facts

# Aggressiveness

First argument (default `balanced`):

| Level | Effect |
| --- | --- |
| `conservative` | Remove only clearly superseded or fully captured entries |
| `balanced` | Also drop chatter, transient details, duplicates |
| `aggressive` | Keep standing decisions, constraints, open questions; summarize older groups |

Remaining arguments are additional focus.

# Related

* [Prompts](/modules/prompts.md)
* [Reserved files](/okf-rules/reserved-files.md)
