---
type: Module
title: Diff
description: Lists files changed since a git ref to scope OKF bundle work.
tags: [git, diff, scope]
timestamp: 2026-08-03T09:47:54Z
---

# Source

`src/diff.ts`

# Public API

| Symbol | Role |
| --- | --- |
| `diffSources(cwd, options?)` | Return `DiffReport` |
| `formatDiffReport(report)` | Human-readable listing |

# Options

| Field | Default | Meaning |
| --- | --- | --- |
| `base` | `HEAD` | Git ref for `git diff --name-status -z` |
| `includeUntracked` | `true` | Also run `git ls-files --others --exclude-standard -z` |
| `path` | `.` | Optional pathspec scope |

# Behavior

- Non-repo cwd: `notARepository: true`, empty `changedFiles`
- Status mapping (`mapStatus`): `A`→added, `D`→deleted, `M`→modified, `T`→type-changed, `R`→renamed, `C`→added, other→modified
- Rename/copy null-separated records: destination path recorded; status `renamed` for `R`, `modified` for `C`, with `fromPath` set
- Results sorted by path
- Git stdout buffer cap: 16 MiB

# FileStatus values

`modified` | `added` | `deleted` | `renamed` | `type-changed` | `untracked`

# Related

* [okf_diff tool](/tools/okf_diff.md)
* [okf-update command](/commands/okf-update.md) (`diff` mode)
