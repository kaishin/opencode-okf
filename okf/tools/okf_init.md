---
type: Tool
title: okf_init
description: Create missing OKF reserved files without overwriting.
tags: [tool, init, scaffolding]
timestamp: 2026-08-10T00:00:00Z
---

# okf_init

Creates `index.md` and `log.md` in the configured bundle directory when they do not already exist.

## Parameters

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `string?` | `okf` | Bundle directory relative to the worktree |

## Behavior

- Creates the bundle directory recursively if missing.
- Uses `writeFile` with `flag: "wx"` so existing files are never overwritten.
- Reports which files were created and which already existed.

## When to use

Use only for missing scaffolding. This tool does not authorize inventing concept content; it only ensures the reserved files exist.
