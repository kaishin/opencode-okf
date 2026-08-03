---
type: Playbook
title: Install
description: Install opencode-okf in an OpenCode configuration.
tags: [install, opencode]
timestamp: 2026-08-03T09:47:54Z
---

# Published plugin

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-okf"]
}
```

Quit and restart OpenCode after changing plugin configuration. OpenCode installs npm plugins with Bun at startup.

# Local development entry

Build the package, then reference the compiled entry with an absolute file URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-okf/dist/index.js"]
}
```

# Optional options

See [Plugin options](/configuration/plugin-options.md) for `bundleDirectory` and `validateOnEdit`.

# Related

* [opencode-okf package](/project/opencode-okf.md)
* [Develop](/playbooks/develop.md)
