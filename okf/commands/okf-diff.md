---
type: Command
title: /okf-diff
description: List files changed since a git ref to scope OKF bundle work.
tags: [command, git, diff]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-diff`
- Template: `diffPrompt(bundleDirectory)`
- Description: "List files changed since a git ref to scope OKF bundle work"

# Behavior (prompt + tool)

1. Run `okf_diff` with optional base ref and path scope from arguments
2. Default base: `HEAD` (uncommitted / working-tree changes vs HEAD)
3. If arguments ask for a bundle update, scope update to knowledge supported by changed files
4. Otherwise report-only and suggest next steps (e.g. `/okf-update`)

# Related

* [okf_diff tool](/tools/okf_diff.md)
* [Diff module](/modules/diff.md)
