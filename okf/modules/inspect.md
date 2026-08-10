---
type: Module
title: Inspect
description: Read-only repository scanner that inventories likely OKF knowledge sources.
tags: [module, inspect, inventory]
timestamp: 2026-08-10T00:00:00Z
---

# Source

`src/inspect.ts` — exports `inspectProject`, `formatInspectionReport`, and the `InspectionReport` type.

# Responsibilities

1. Walk the repository up to a configurable file limit.
2. Skip ignored directories such as `.git`, `node_modules`, and `dist`.
3. Classify files as `source directory`, `data or schema artifact`, `dashboard artifact`, or `documentation candidate`.
4. Return a formatted report for the `okf_inspect` tool.

# Classification heuristics

- **Source directory**: file lives under `docs/`, `schemas/`, `migrations/`, `analytics/`, `dashboards/`, `models/`, etc.
- **Data or schema artifact**: extension is `.sql`, `.dbml`, `.prisma`, `.yaml`, `.yml`, `.json`, or `.csv`.
- **Dashboard artifact**: filename matches `dashboard|lookml|metabase|superset|tableau`.
- **Documentation candidate**: filename matches `readme|product|analytics|metric|revenue|churn|subscription`.

# Related

* [okf_inspect tool](/tools/okf_inspect.md)
* [Plugin](/modules/plugin.md)
