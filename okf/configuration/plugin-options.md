---
type: Configuration
title: Plugin options
description: Runtime options for the opencode-okf OpenCode plugin.
tags: [configuration, opencode]
timestamp: 2026-08-03T09:47:54Z
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
        "validateOnEdit": false
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

# Type definition

`OKFPluginOptions` in `src/index.ts`.

# Path safety

`resolveBundlePath(worktree, bundleDirectory)` rejects paths that escape the worktree (e.g. `../outside`).

# Related

* [Install](/playbooks/install.md)
* [Plugin module](/modules/plugin.md)
