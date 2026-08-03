---
type: Command
title: /okf-create
description: Create an evidence-backed OKF bundle from repository inspection.
tags: [command, authoring]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-create`
- Template: `createPrompt(bundleDirectory)` in `src/prompts.ts`
- Description: "Create an evidence-backed OKF bundle"

# Behavior (prompt-driven)

Instructs the model to:

1. Inspect the repository broadly (docs, models, schemas, analytics, APIs, runbooks, config)
2. Choose hierarchy and concept types from evidence (no forced SaaS template)
3. Create concepts, `index.md` files, and root `log.md` under the configured bundle directory (default `okf/`)
4. Follow shared OKF authoring rules and run `okf_validate`

User arguments become additional guidance via `$ARGUMENTS`.

# Related

* [Prompts](/modules/prompts.md)
* [okf_validate](/tools/okf_validate.md)
