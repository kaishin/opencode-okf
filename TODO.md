# TODO

- [x] Research the OpenCode plugin API and OKF v0.1 specification.
- [x] Add OKF authoring and maintenance commands.
- [x] Add deterministic OKF validation.
- [x] Add command and file-edit hooks.
- [x] Verify types, tests, package contents, and documentation.
- [x] Import the diff tool (`okf_diff`) from pi-okf; exposed via `/okf-update diff`.
- [x] Session knowledge via `/okf-update session` (concepts/indexes first; `okf_capture` for log-only leftovers).
- [x] Configurable capture moments (`captureOn.sessionIdle`, `captureOn.compacting`: off/notify/auto).
- [x] More capture moments: `captureOn.compacted` (post-compaction) and `captureOn.todoComplete` (todo list all done).
- [x] Evidence buffering (`captureEvidence`): inject recent tool activity into `/okf-update session` prompts.
