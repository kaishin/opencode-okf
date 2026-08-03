# Bundle Update Log

## 2026-08-03

* **Decision**: Canonical package `resource` is the npm page (`https://www.npmjs.com/package/opencode-okf`); GitHub remains the source repository, not the release URI.
* **Update**: Set [opencode-okf](/project/opencode-okf.md) `resource` to the npm package URL; noted open design space for deterministic compact helpers on [okf-compact](/commands/okf-compact.md).
* **Creation**: Initial OKF bundle for opencode-okf, covering project identity, source modules, slash commands, agent tools, plugin configuration, validator-enforced OKF rules, and install/development playbooks.
* **Sources**: `README.md`, `package.json`, `TODO.md`, `src/*.ts`, `tests/*.ts`, `LICENSE`, `npm view opencode-okf`.
* **Question**: What parts of `/okf-compact` (if any) can be made deterministic—structure-preserving edits, aggressiveness parsing, entry classification heuristics, or promotion into concepts—versus remaining model judgment?
