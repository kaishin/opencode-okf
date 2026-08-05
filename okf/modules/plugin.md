---
type: Module
title: Plugin
description: OpenCode plugin entry that registers OKF commands, tools, and hooks.
tags: [plugin, opencode, hooks]
timestamp: 2026-08-03T09:47:54Z
---

# Source

`src/index.ts` — default export `OKFPlugin` satisfying `@opencode-ai/plugin` `Plugin`.

# Responsibilities

1. Parse plugin options (`bundleDirectory`, `validateOnEdit`).
2. Resolve the configured bundle root inside the worktree via `resolveBundlePath`.
3. Register slash commands in `config` without overwriting existing user-defined commands (`??=`).
4. Expose tools: `okf_validate`, `okf_capture`, `okf_diff`.
5. On `command.execute.before` for OKF commands, append runtime context (UTC ISO timestamp and configured bundle directory).
6. On `file.edited` / `file.watcher.updated`, optionally debounce-validate (400ms) when the file is inside the bundle root; toast + log only on new conformance errors.
7. Clear the validation timer on `dispose`.

# Command names

`okf-init`, `okf-update`, `okf-validate`, `okf-compact`.

Tools (not slash commands): `okf_validate`, `okf_capture`, `okf_diff`.

# Edit-validation behavior

- Disabled when `validateOnEdit` is `false`.
- Dedupes toasts by error signature (`file:message` joined with `|`).
- Toast message: `N OKF conformance error(s). Run /okf-validate for details.`
- Also writes `client.app.log` at level `warn` with service `opencode-okf`.

# Option validation

- `bundleDirectory` must be a non-empty string.
- `validateOnEdit` must be a boolean.
- Paths outside the worktree throw at plugin construction via `resolveBundlePath`.

# Related

* [Prompts](/modules/prompts.md)
* [Validator](/modules/validator.md)
* [Plugin options](/configuration/plugin-options.md)
* [Commands](/commands/index.md)
* [Tools](/tools/index.md)
