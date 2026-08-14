---
type: Command
title: /okf-init
description: Initialize an evidence-backed OKF bundle from repository inspection.
tags: [command, authoring]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-init`
- Template: `initPrompt(bundleDirectory)` in `src/prompts.ts`
- Description: "Initialize an evidence-backed OKF bundle"

# Behavior (prompt-driven)

Instructs the model to:

1. Fetch and read the authoritative current specification with `okf_spec`
2. Inspect the repository broadly (docs, models, schemas, analytics, APIs, runbooks, config)
3. Choose hierarchy and free-form concept types from evidence (no forced taxonomy or SaaS template)
4. Create concepts, `index.md` files, and root `log.md` under the configured bundle directory (default `okf/`)
5. Follow shared OKF authoring rules and run `okf_validate`

User arguments become additional guidance via `$ARGUMENTS`.

# Related

* [Prompts](/modules/prompts.md)
* [okf_validate](/tools/okf_validate.md)
