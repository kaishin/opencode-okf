# opencode-okf

An [OpenCode](https://opencode.ai/) plugin for creating, maintaining, and validating [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundles.

The authoring commands make OpenCode inspect repository evidence before it writes knowledge. The bundled validator checks the actual format, so conformance does not depend on the model remembering every rule.

## Features

- `/okf-create` inspects a repository and creates an evidence-backed OKF bundle.
- `/okf-update` reconciles an existing bundle with current source material.
- `/okf-validate` reports conformance errors and quality warnings, with opt-in fixes.
- `okf_validate` gives agents a deterministic validation tool.
- A command hook supplies the exact UTC timestamp to OKF workflows.
- A debounced file-event hook warns when edits make the bundle nonconformant.
- Existing commands and producer-defined OKF frontmatter are preserved.

## Install

Add the plugin to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-okf"]
}
```

Quit and restart OpenCode after changing plugin configuration. OpenCode installs npm plugins with Bun at startup.

For local development, build this package and reference its compiled entry point with an absolute file URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-okf/dist/index.js"]
}
```

## Usage

Create a bundle using repository-wide evidence:

```text
/okf-create focus on revenue, subscriptions, and customer lifecycle knowledge
```

Refresh an existing bundle:

```text
/okf-update review schema migrations and dashboard changes since the last update
```

Validate without editing:

```text
/okf-validate
```

Ask OpenCode to repair format problems after validation:

```text
/okf-validate fix conformance errors
```

The default output directory is `okf/`. The commands choose a hierarchy from the repository evidence rather than imposing a fixed SaaS template.

## Configuration

Pass plugin options with OpenCode's tuple syntax:

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

| Option | Default | Description |
| --- | --- | --- |
| `bundleDirectory` | `okf` | Bundle directory relative to the worktree. Paths outside the worktree are rejected. |
| `validateOnEdit` | `true` | Debounce validation after bundle file events and show a warning only for conformance errors. |

## Validation

The validator follows OKF v0.1 conformance rules:

- Every non-reserved Markdown file must have parseable YAML frontmatter with a non-empty string `type`.
- `index.md` files must provide progressive-disclosure headings and linked entries. Only the root index may have frontmatter, where it declares `okf_version`.
- `log.md` files must contain newest-first `## YYYY-MM-DD` groups with list entries.
- Documents must decode as UTF-8.

Missing recommended metadata, malformed optional fields, empty bodies, and broken internal links are warnings. They do not fail validation because OKF consumers must tolerate those conditions.

## Development

```sh
bun install
bun run check
bun test
bun run build
```

## References

- [OpenCode plugin documentation](https://opencode.ai/docs/plugins/)
- [Open Knowledge Format v0.1 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [Introducing the Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)
