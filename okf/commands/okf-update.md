---
type: Command
title: /okf-update
description: Update an OKF bundle from repo evidence, git diff, or the current session.
tags: [command, authoring]
timestamp: 2026-08-05T00:00:00Z
---

# Registration

- Name: `okf-update`
- Template: `updatePrompt(bundleDirectory)`
- Description: "Update OKF bundle from repo, git diff, or session (args: [session|diff])"

# Hard arguments

| Invocation | Source |
| --- | --- |
| `/okf-update` | Full repository evidence |
| `/okf-update diff [git-ref] [focus…]` | `okf_diff` first (default base HEAD); scope to changed files |
| `/okf-update session [focus…]` | Current conversation + completed work |

Any first token other than `session` or `diff` is free-form focus under **repo** mode.

# Behavior

1. Read the current bundle and root `okf_version` first
2. Fetch the authoritative current specification with `okf_spec`
3. If the bundle targets an older version, recommend `/okf-upgrade` instead of silently performing a bundle-wide migration during a focused update
4. Gather evidence per source mode
5. Write **concept files and indexes** for durable knowledge (session mode is not log-only)
6. Use `log.md` / `okf_capture` only for history, open questions, or decisions that do not belong in a concept
7. Run `okf_validate`

# Related

* [okf_diff tool](/tools/okf_diff.md)
* [okf_capture tool](/tools/okf_capture.md)
* [Prompts](/modules/prompts.md)
