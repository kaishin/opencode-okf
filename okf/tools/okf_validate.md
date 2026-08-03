---
type: Tool
title: okf_validate
description: Validate an Open Knowledge Format v0.1 bundle.
tags: [tool, validation]
timestamp: 2026-08-03T09:47:54Z
---

# Source

Registered in `src/index.ts` as `tool.okf_validate`; implementation `validateBundle` in `src/validator.ts`.

# Arguments

| Arg | Required | Default | Description |
| --- | --- | --- | --- |
| `path` | no | configured `bundleDirectory` | Bundle path relative to worktree |

# Result

- Title: `OKF validation passed` or `OKF validation failed`
- Output: `formatValidationReport`
- Metadata: `valid`, `root`, `files`, `concepts`, `errors`, `warnings` (counts)

# Related

* [Validator](/modules/validator.md)
* [okf-validate command](/commands/okf-validate.md)
