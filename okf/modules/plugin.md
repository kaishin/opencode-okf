---
type: Module
title: Plugin
description: OpenCode plugin entry that registers OKF commands, tools, and hooks.
tags: [plugin, opencode, hooks]
timestamp: 2026-08-10T11:02:27Z
---

# Source

`src/index.ts` — default export `OKFPlugin` satisfying `@opencode-ai/plugin` `Plugin`.

# Responsibilities

1. Parse plugin options (`bundleDirectory`, `validateOnEdit`, `captureEvidence`, `captureOn`).
2. Resolve the configured bundle root inside the worktree via `resolveBundlePath`.
3. Register slash commands in `config` without overwriting existing user-defined commands (`??=`).
4. Expose tools: `okf_validate`, `okf_capture`, `okf_diff`, `okf_inspect`, `okf_init`.
5. On `command.execute.before` for OKF commands, append runtime context (UTC ISO timestamp and configured bundle directory); for `okf-update session`, also drain buffered tool evidence when `captureEvidence` is on.
6. On `experimental.chat.system.transform`, inject OKF authoring guidance when the system prompt mentions OKF.
7. On `file.edited` / `file.watcher.updated`, optionally debounce-validate (400ms) when the file is inside the bundle root; toast + log only on new conformance errors.
8. Drive capture moments (`sessionIdle`, `compacted`, `todoComplete`) from events through `runCaptureMoment`, which toasts (`notify`) or sends `okf-update session` (`auto`); `compacting` is handled in `experimental.session.compacting` and injects preservation context instead of capturing.
9. On `tool.execute.after`, buffer `tool: title` lines per session when `captureEvidence` is on (FIFO, 50-entry cap).
10. Clear the validation timer on `dispose`; clear per-session capture state and evidence on `session.deleted`.

# Command names

`okf-init`, `okf-update`, `okf-validate`, `okf-compact`.

Tools (not slash commands): `okf_validate`, `okf_capture`, `okf_diff`, `okf_inspect`, `okf_init`.

# Edit-validation behavior

- Disabled when `validateOnEdit` is `false`.
- Dedupes toasts by error signature (`file:message` joined with `|`).
- Toast message: `N OKF conformance error(s). Run /okf-validate for details.`
- Also writes `client.app.log` at level `warn` with service `opencode-okf`.

# Option validation

- `bundleDirectory` must be a non-empty string.
- `validateOnEdit` and `captureEvidence` must be booleans.
- `captureOn` must be an object; each moment must be `"off"`, `"notify"`, or `"auto"`.
- Paths outside the worktree throw at plugin construction via `resolveBundlePath`.

# Capture state machine

Per session: `armed` (after a user `message.updated`) → `consumed` (after a moment acted) or `capturing` (while an auto-capture command runs). While `capturing`, the command's own user messages do not re-arm the session; the next `session.idle` settles the state to `consumed`. `sessionIdle` and `todoComplete` require `armed`; `compacted` fires unconditionally per event. All moments skip subagent sessions and no-op without an existing bundle directory.

# Related

* [Prompts](/modules/prompts.md)
* [Validator](/modules/validator.md)
* [Plugin options](/configuration/plugin-options.md)
* [Commands](/commands/index.md)
* [Tools](/tools/index.md)
