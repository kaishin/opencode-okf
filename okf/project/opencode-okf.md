---
type: Package
title: opencode-okf
description: OpenCode plugin for creating, maintaining, upgrading, and validating Open Knowledge Format bundles.
resource: https://www.npmjs.com/package/opencode-okf
tags: [opencode, plugin, okf, knowledge]
timestamp: 2026-08-03T09:47:54Z
---

# Summary

npm package `opencode-okf` (version `0.3.0` per `package.json`). MIT-licensed TypeScript library that registers OpenCode slash commands, agent tools, and hooks for OKF workflows. Canonical published package URI is the npm page; source lives at https://github.com/kaishin/opencode-okf.

Authoring commands instruct the model to fetch the authoritative current OKF specification and inspect repository evidence before writing knowledge. The validator applies v0.2-aware conformance and optional-field checks so behavior does not depend on model memory.

# Identity

| Field | Value |
| --- | --- |
| Name | `opencode-okf` |
| Version | `0.3.0` |
| License | MIT |
| Engines | Node `>=20` |
| Package manager | bun@1.3.11 |
| Entry | `./dist/index.js` |
| Types | `./dist/index.d.ts` |
| Peer dependency | `@opencode-ai/plugin` `>=1.18.0` |
| Runtime dependency | `yaml` `^2.8.1` |

# Published surface

`package.json` `files` field ships only `dist`, `README.md`, and `LICENSE`.

Public exports from `src/index.ts`:

- default / `OKFPlugin`
- `captureSession`, `formatCaptureReport`
- `diffSources`, `formatDiffReport`
- `validateBundle`, `formatValidationReport`, `resolveBundlePath`
- `fetchOKFSpec`, `formatSpecReport`, `OKF_SPEC_URL`
- related TypeScript types

# Source layout

| Path | Role |
| --- | --- |
| `src/index.ts` | Plugin entry, commands, tools, hooks |
| `src/validator.ts` | OKF v0.2-aware bundle validation |
| `src/spec.ts` | Authoritative specification fetching and version extraction |
| `src/capture.ts` | Session capture into `log.md` |
| `src/diff.ts` | Git-based change listing |
| `src/prompts.ts` | Slash-command prompt templates |
| `tests/*.ts` | Bun tests for modules and plugin wiring |
| `dist/` | Compiled JS and declarations (build output) |

# Related

* [Plugin module](/modules/plugin.md)
* [Plugin options](/configuration/plugin-options.md)
* [Install](/playbooks/install.md)
* [Develop](/playbooks/develop.md)
