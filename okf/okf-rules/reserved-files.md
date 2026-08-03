---
type: Rule
title: Reserved files
description: Structure required for index.md and log.md at any hierarchy level.
tags: [okf, index, log]
timestamp: 2026-08-03T09:47:54Z
---

# Reserved basenames

`index.md` and `log.md` are never treated as concept documents.

# index.md

- Progressive-disclosure listing
- At least one Markdown section heading (`#`–`######`)
- At least one bulleted link line matching list marker `*` or `-` plus a Markdown link and optional ` - description`
- Frontmatter only on bundle-root `index.md`, requiring `okf_version`

# log.md

- No frontmatter
- Starts with a title heading (`# …`)
- One or more `## YYYY-MM-DD` groups (real calendar dates)
- Groups ordered newest first
- Each group has at least one list entry (`*` or `-`)

# Session capture entry convention

Produced by `captureSession` / `okf_capture` (not a separate reserved name): nested list under a date group with `**Session: …**`, `**Summary**`, optional `**Decisions**` / `**Changes**` / `**Open questions**`.

# Related

* [Capture](/modules/capture.md)
* [Conformance](/okf-rules/conformance.md)
