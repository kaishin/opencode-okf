---
type: Tool
title: okf_diff
description: List files changed since a git ref for scoping OKF work.
tags: [tool, git, diff]
timestamp: 2026-08-03T09:47:54Z
---

# Source

Registered in `src/index.ts` as `tool.okf_diff`; implementation `diffSources` in `src/diff.ts`.

# Arguments

| Arg | Required | Default | Description |
| --- | --- | --- | --- |
| `base` | no | `HEAD` | Git ref (`origin/main`, SHA, tag, …) |
| `path` | no | whole tree | Subdirectory scope relative to worktree |
| `includeUntracked` | no | `true` | Include untracked files |

# Result

- Title: `N changed file(s) vs <base>` or `Not a git repository`
- Output: `formatDiffReport`
- Metadata: `base`, `scope`, `files`, `notARepository`

# Related

* [Diff module](/modules/diff.md)
* [okf-update command](/commands/okf-update.md) (`diff` mode)
