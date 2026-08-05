---
type: Tool
title: okf_capture
description: Capture durable session knowledge into the bundle root log.md.
tags: [tool, capture]
timestamp: 2026-08-03T09:47:54Z
---

# Source

Registered in `src/index.ts` as `tool.okf_capture`; implementation `captureSession` in `src/capture.ts`.

# Arguments

| Arg | Required | Description |
| --- | --- | --- |
| `summary` | yes | Concise session outcome |
| `title` | no | Short title |
| `decisions` | no | String list |
| `changes` | no | String list |
| `questions` | no | String list |
| `path` | no | Bundle path relative to worktree (default: configured directory) |

# Result

- Writes/updates `<bundle>/log.md`
- Title: `OKF session captured` or `OKF session captured with errors`
- Output includes relative file path and validation report
- Metadata: `date`, `file`, `created`, `valid`, `errors`, `warnings`

# Related

* [Capture module](/modules/capture.md)
* [okf-update command](/commands/okf-update.md) (`session` mode)
