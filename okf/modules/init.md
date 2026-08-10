---
type: Module
title: Init
description: Create missing OKF reserved files without overwriting existing content.
tags: [module, init, scaffolding]
timestamp: 2026-08-10T00:00:00Z
---

# Source

`src/init.ts` — exports `initializeBundle`, `summarizeInit`, and the `InitReport` type.

# Responsibilities

1. Create the bundle directory if missing.
2. Write `index.md` and `log.md` only when they do not already exist.
3. Report created and existing files.

# Safety

Uses `writeFile` with `flag: "wx"` so any existing file is preserved. The module never overwrites producer content.

# Related

* [okf_init tool](/tools/okf_init.md)
* [Plugin](/modules/plugin.md)
