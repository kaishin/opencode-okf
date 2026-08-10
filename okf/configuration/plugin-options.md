---
type: Configuration
title: Plugin options
description: Runtime options for the opencode-okf OpenCode plugin.
tags: [configuration, opencode]
timestamp: 2026-08-10T11:01:22Z
---

# How to set

OpenCode tuple syntax in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-okf",
      {
        "bundleDirectory": "knowledge/okf",
        "validateOnEdit": false,
        "captureEvidence": true,
        "captureOn": {
          "sessionIdle": "notify",
          "compacting": "auto",
          "compacted": "notify",
          "todoComplete": "notify"
        }
      }
    ]
  ]
}
```

# Options

| Option | Type | Default | Rules |
| --- | --- | --- | --- |
| `bundleDirectory` | string | `"okf"` | Non-empty; resolved path must stay inside the worktree |
| `validateOnEdit` | boolean | `true` | Debounced validation after bundle file events; warnings only for conformance errors |
| `captureEvidence` | boolean | `false` | Buffers recent tool activity per session via `tool.execute.after` (last 50 entries) and injects it into `okf-update session` prompts; drained on use and cleared on `session.deleted` |
| `captureOn.sessionIdle` | `"off" \| "notify" \| "auto"` | `"off"` | `notify`: toast suggesting `/okf-update session` on `session.idle`; `auto`: sends the `okf-update session` command to the idled session |
| `captureOn.compacting` | `"off" \| "notify" \| "auto"` | `"off"` | `notify`: toast before context compaction; `auto`: pushes OKF preservation instructions into the `experimental.session.compacting` context |
| `captureOn.compacted` | `"off" \| "notify" \| "auto"` | `"off"` | `notify`/`auto`: toast or capture command on `session.compacted`; fires every time (no once-per-activity guard) since compaction is a discrete knowledge-loss event |
| `captureOn.todoComplete` | `"off" \| "notify" \| "auto"` | `"off"` | `notify`/`auto` on `todo.updated` when every todo is `completed` or `cancelled`; requires prior user activity and an non-empty todo list |

# Capture moments

Capture behavior is per moment and defaults to `"off"` (manual capture unchanged). Moments act at most once per stretch of user activity (re-armed by the next user message), only when the bundle directory exists, and skip subagent sessions. An automatic idle capture enters a `capturing` state so the command's own messages do not retrigger it.

Note that `compacting: "auto"` only injects preservation instructions into the compaction context — it does not write to the bundle by itself; its effect shows up as capture-worthy facts surviving the compaction summary.

# Dogfooding in this repo

This repository loads its own plugin via a root `opencode.json` pointing at the local build:

```json
"plugin": [
  [
    "file://<absolute path>/dist/index.js",
    {
      "bundleDirectory": "okf",
      "validateOnEdit": true,
      "captureOn": { "sessionIdle": "auto", "compacting": "auto" }
    }
  ]
]
```

Requires `bun run build` after source changes since the config loads `dist/`, and a reload/restart of OpenCode to pick up option changes. The file URL is absolute, so the config is machine-specific.

# Type definition

`OKFPluginOptions`, `CaptureMoments`, and `CaptureBehavior` in `src/index.ts`.

# Path safety

`resolveBundlePath(worktree, bundleDirectory)` rejects paths that escape the worktree (e.g. `../outside`).

# Related

* [Install](/playbooks/install.md)
* [Plugin module](/modules/plugin.md)
