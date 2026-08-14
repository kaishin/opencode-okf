---
type: Command
title: /okf-upgrade
description: Upgrade an entire OKF bundle to the authoritative current specification.
tags: [command, migration, specification]
timestamp: 2026-08-13T00:00:00Z
---

# Registration

- Name: `okf-upgrade`
- Template: `upgradePrompt(bundleDirectory)` in `src/prompts.ts`
- Description: "Upgrade the entire OKF bundle to the latest fetched spec"

# Behavior

1. Fetch and read the authoritative specification in full with `okf_spec`.
2. Read every concept, `index.md`, and `log.md` before editing.
3. Apply the fetched specification's migration guidance across the whole bundle.
4. Preserve unknown producer-defined fields and legacy data that cannot be migrated safely.
5. Never invent actors, sources, verification events, lifecycle metadata, computations, executors, or attesters.
6. Set the bundle-root `index.md` `okf_version` to the fetched version.
7. Run `okf_validate`, fix conformance errors, and report warnings and unresolved migration questions.

# Related

* [Prompts](/modules/prompts.md)
* [okf_spec tool](/tools/okf_spec.md)
* [okf_validate tool](/tools/okf_validate.md)
