---
type: Command
title: /okf-validate
description: Validate an OKF bundle and optionally fix conformance problems.
tags: [command, validation]
timestamp: 2026-08-03T09:47:54Z
---

# Registration

- Name: `okf-validate`
- Template: `validatePrompt(bundleDirectory)`
- Description: "Validate an OKF bundle and optionally fix it"

# Behavior (prompt + tool)

1. Run `okf_validate` on the configured bundle path
2. Report errors and warnings clearly
3. Fix only when arguments explicitly request fixes
4. If fixing: preserve meaning, correct evidence-backed issues, rerun validation

# Related

* [okf_validate tool](/tools/okf_validate.md)
* [Validator](/modules/validator.md)
