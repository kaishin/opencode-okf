---
type: Playbook
title: Develop
description: Build, typecheck, and test opencode-okf locally.
tags: [development, bun, typescript]
timestamp: 2026-08-03T09:47:54Z
---

# Commands

From `README.md` and `package.json` scripts:

```sh
bun install
bun run check    # tsc --noEmit
bun test         # bun test
bun run build    # tsc -> dist/
```

`prepublishOnly` runs `bun run test && bun run build`.

# Toolchain

| Item | Value |
| --- | --- |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`, unused locals/params) |
| Module | NodeNext |
| Target | ES2022 |
| Test runner | Bun test |
| Compile output | `dist/` with declarations and source maps |

# Test coverage (by file)

| File | Focus |
| --- | --- |
| `tests/validator.test.ts` | Conformant bundle, frontmatter errors, warnings, index/log structure, path resolve |
| `tests/capture.test.ts` | Log creation, same-day prepend, newest-first dates |
| `tests/diff.test.ts` | Statuses, path scope, non-repo |
| `tests/plugin.test.ts` | Command registration/preservation, tools, hooks, path rejection |

# Related

* [Install](/playbooks/install.md)
* [Plugin module](/modules/plugin.md)
