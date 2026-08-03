---
type: Command
title: /okf-update
description: Reconcile an existing OKF bundle with current repository evidence.
tags: [command, authoring]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-update`
- Template: `updatePrompt(bundleDirectory)`
- Description: "Update an existing OKF bundle from repository evidence"

# Behavior (prompt-driven)

1. Read the current bundle first
2. Inspect relevant history and authoritative sources
3. Fix stale claims, missing concepts, broken relationships, stale indexes
4. Prefer smallest evidence-backed changes
5. Add date-grouped `log.md` entries for meaningful updates
6. Run `okf_validate`

# Related

* [okf-diff](/commands/okf-diff.md)
* [Prompts](/modules/prompts.md)
