---
type: Tool
title: okf_spec
description: Fetch and return the authoritative current Open Knowledge Format specification.
tags: [tool, specification, network]
timestamp: 2026-08-13T00:00:00Z
---

# Source

Registered in `src/index.ts` as `tool.okf_spec`; fetching and version extraction are implemented in `src/spec.ts`.

# Endpoint

`https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/refs/heads/main/okf/SPEC.md`

The request accepts Markdown or plain text and times out after 15 seconds. A non-success HTTP response or a document without a `**Version X.Y**` marker is reported as an error.

# Result

- Title: `OKF specification v<version>`
- Output: source URL followed by the complete fetched specification
- Metadata: `version`, `url`

# Network

The tool requires outbound access to `raw.githubusercontent.com` when invoked.

# Related

* [okf-upgrade command](/commands/okf-upgrade.md)
* [Prompts](/modules/prompts.md)
