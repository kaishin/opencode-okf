---
type: Command
title: /okf-capture
description: Capture durable knowledge from the current coding session into the bundle log.
tags: [command, capture]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-capture`
- Template: `capturePrompt(bundleDirectory)`
- Description: "Capture durable knowledge from the current coding session"

# Behavior (prompt + tool)

1. Review conversation and worktree outcomes
2. Extract only durable decisions, facts, tradeoffs, constraints, changes, open questions
3. Call `okf_capture` with title, summary, decisions, changes, questions
4. Run `okf_validate` and report

Excludes routine chatter, credentials, secrets, and unsupported assumptions.

# Related

* [okf_capture tool](/tools/okf_capture.md)
* [Capture module](/modules/capture.md)
