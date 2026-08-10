---
type: Tool
title: okf_inspect
description: Read-only inventory of likely repository knowledge sources.
tags: [tool, inspect, inventory]
timestamp: 2026-08-10T00:00:00Z
---

# okf_inspect

Scans the repository for files likely to contain durable knowledge: product docs, schemas, migrations, analytics definitions, dashboards, and configuration.

## Parameters

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `string?` | worktree root | Subdirectory to inspect |
| `maxFiles` | `integer?` | 500 | Scan limit (1–5000) |

## Behavior

- Skips `.git`, `node_modules`, `dist`, `build`, and other generated or vendored directories.
- Classifies candidates by source directory, data/schema extension, dashboard naming, and documentation keywords.
- Returns a list of `[category] path` entries so the agent can read authoritative files before writing.

## When to use

Run before `/okf-init` or `/okf-update` to gather evidence sources. Do not invent content from names alone; read the files `okf_inspect` reports.
