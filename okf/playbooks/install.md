---
type: Playbook
title: Install
description: Install opencode-okf in an OpenCode configuration.
tags: [install, opencode, ocx]
timestamp: 2026-08-05T10:30:00Z
---

# With OCX

Install [OCX](https://ocx.kdco.dev):

```sh
curl -fsSL https://ocx.kdco.dev/install.sh | sh
```

Initialize global config (once):

```sh
ocx init --global
```

Add the plugin globally:

```sh
ocx add npm:opencode-okf -g
```

Or to a named profile:

```sh
ocx add npm:opencode-okf -p default
```

Launch OpenCode:

```sh
ocx oc
# or:
ocx oc -p default
```

Quit and restart OpenCode after changing plugin configuration.

# Manual (published plugin)

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
