---
type: Rule
title: Conformance
description: OKF v0.2 conformance criteria and optional-field guidance as enforced by validateBundle.
tags: [okf, validation, conformance]
timestamp: 2026-08-03T09:47:54Z
---

# Source of enforcement

`src/validator.ts` — documented in `README.md` Validation section.

# Hard requirements (errors)

1. Every non-reserved `.md` file has parseable YAML frontmatter with non-empty string `type`
2. Every concept with `type: Attested Computation` has non-empty string `runtime`
3. Documents decode as UTF-8
4. Reserved `index.md` / `log.md` follow structural rules when present

# Tolerated (warnings only)

Missing optional metadata, unknown `type` values and producer-defined fields, malformed optional v0.2 field families, legacy `timestamp`, empty bodies, and broken internal links. The validator reports guidance as warnings and preserves OKF's permissive consumption model.

# Report shape

```text
OKF validation passed|failed: N concept(s), M Markdown file(s), E error(s), W warning(s).
```

Followed by `Errors:` and/or `Warnings:` bullet lists with optional `file: message` prefixes.

# Related

* [Validator](/modules/validator.md)
* [Frontmatter](/okf-rules/frontmatter.md)
* [Reserved files](/okf-rules/reserved-files.md)
