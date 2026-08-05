---
type: Module
title: Capture
description: Appends durable session knowledge as a dated entry in the bundle root log.md.
tags: [capture, log, session]
timestamp: 2026-08-03T09:47:54Z
---

# Source

`src/capture.ts`

# Public API

| Symbol | Role |
| --- | --- |
| `captureSession(bundleRoot, options, now?)` | Write entry; return `CaptureReport` |
| `formatCaptureReport(report)` | Human-readable result including validation |

# Options

| Field | Required | Behavior |
| --- | --- | --- |
| `summary` | yes | Non-empty after trim/collapse whitespace |
| `title` | no | Defaults to `Session capture` |
| `decisions` | no | Cleaned list; omitted section if empty |
| `changes` | no | Cleaned list; omitted section if empty |
| `questions` | no | Cleaned list; omitted section if empty |

# Entry shape

```text
* **Session: <title>** (<ISO timestamp>)
  * **Summary**: <summary>
  * **Decisions**:
    * ...
  * **Changes**:
    * ...
  * **Open questions**:
    * ...
```

# Log insertion rules

- Target file: `<bundleRoot>/log.md`
- Creates bundle directory recursively if needed
- Date group heading: `## YYYY-MM-DD` from `now.toISOString().slice(0, 10)`
- Same-day: insert new entry at top of that date group (after heading / blank lines)
- New day newer than existing groups: insert new `## date` before first older heading
- Empty/missing log: write `# Bundle Update Log` plus date group and entry
- After write, runs `validateBundle` on the bundle root

# Related

* [okf_capture tool](/tools/okf_capture.md)
* [okf-update command](/commands/okf-update.md) (`session` mode; concepts first, not log-only)
* [Reserved files](/okf-rules/reserved-files.md)
