# Bundle Update Log

## 2026-08-13

* **Upgrade**: Upgraded the bundle declaration and internal documentation to the fetched authoritative OKF v0.2 specification; documented `okf_spec`, `/okf-upgrade`, update-time version detection, and v0.2-aware validation.
* **Migration note**: Preserved legacy concept `timestamp` fields because the bundle does not record the actors required for lossless `generated: { by, at }` migration; the v0.2 spec permits consumers to use this fallback.

## 2026-08-10

* **Session: More capture moments and evidence buffering** (2026-08-10T11:11:12.952Z)
  * **Summary**: Added captureOn.compacted and captureOn.todoComplete moments plus a captureEvidence option that buffers tool activity into okf-update session prompts. All three suggestions from the hook-surface review are now implemented.
  * **Decisions**:
    * compacted fires on every session.compacted event (no once-per-activity guard) because compaction is a discrete knowledge-loss event; todoComplete and sessionIdle keep the armed/consumed once-per-activity guard
    * All auto moments share runCaptureMoment, which sets the per-session capturing state so the injected okf-update command's own messages cannot re-arm or loop
    * captureEvidence buffers `tool: title` lines per session (FIFO, 50-entry cap), drains them into the okf-update session prompt via command.execute.before, and clears on session.deleted
    * todoComplete treats completed and cancelled todos as done and requires a non-empty list plus prior user activity
  * **Changes**:
    * src/index.ts: CaptureMoments gains compacted and todoComplete; new captureEvidence option with validation; extracted isSubagentSession, sendCaptureCommand, runCaptureMoment helpers; todo.updated, session.compacted, session.deleted event handling; tool.execute.after buffering
    * tests/plugin.test.ts: 9 new tests covering compacted notify/auto/off, todoComplete arming and loop-guard, evidence injection/drain/off, session.deleted cleanup, option validation (42 tests total)
    * README.md, okf/configuration/plugin-options.md, okf/modules/plugin.md, TODO.md updated for the new options
  * **Open questions**:
    * Is a sessionError capture moment (notify-only) worth adding for failure/debugging sessions?
    * Should experimental.chat.system.transform get a continuous-OKF-context injection option separate from capture moments?

* **Session: Dogfooding capture config** (2026-08-10T11:01:22.268Z)
  * **Summary**: Added a root `opencode.json` so this repo loads its own plugin from the local `dist/` build, and verified compaction behavior after a real compaction event.
  * **Decisions**:
    * User set both capture moments to `"auto"` in the repo config (initial draft had `sessionIdle: "notify"`)
  * **Changes**:
    * Created `opencode.json` with `bundleDirectory: "okf"`, `validateOnEdit: true`, `captureOn: { sessionIdle: "auto", compacting: "auto" }`
    * Documented the dogfooding setup and the inject-only nature of `compacting: "auto"` in [plugin-options](/configuration/plugin-options.md)
  * **Verified**:
    * After an actual compaction with `compacting: "auto"`, no new bundle writes occurred — confirmed expected, since the hook injects preservation instructions into the compaction context rather than capturing
  * **Open questions** (carried): post-compaction nudge via `session.compacted`; `tool.execute.after` evidence buffering
* **Session: Configurable capture moments** (2026-08-10T00:00:00.000Z)
  * **Summary**: Implemented the `captureOn` plugin option so users configure automatic capture at lifecycle moments: `sessionIdle` and `compacting`, each `"off"` (default), `"notify"` (toast nudge), or `"auto"`.
  * **Decisions**:
    * Idle `auto` sends the `okf-update session` command to the idled session; compacting `auto` injects OKF preservation instructions into `experimental.session.compacting` context instead of running capture mid-compaction
    * Per-session state machine (armed/consumed/capturing) prevents the auto-capture command's own messages from retriggering capture
    * Capture moments skip subagent sessions and only fire when the bundle directory exists
  * **Changes**:
    * Added `CaptureBehavior`/`CaptureMoments` types and `captureOn` validation in `src/index.ts`
    * Added `session.idle`/`message.updated` handling in the event hook and the `experimental.session.compacting` hook
    * Documented the options in README and `okf/configuration/plugin-options.md`; added 8 plugin tests
  * **Open questions**:
    * Should `session.compacted` also trigger a post-compaction capture nudge?
    * Is `tool.execute.after` evidence buffering (from the 2026-08-06 analysis) still worth adding?

## 2026-08-06

* **Session: Plugin hooks for timed OKF capture** (2026-08-06T08:06:50.897Z)
  * **Summary**: Session mapped OpenCode plugin hooks to OKF capture timing. Current plugin uses command.execute.before and file-edit events; best next hooks for automatic/timely capture are session.idle, experimental.session.compacting, tool.execute.after, and experimental.chat.system.transform.
  * **Decisions**:
    * Prioritize session.idle as the primary end-of-work capture nudge
    * Treat experimental.session.compacting as critical last-chance capture or OKF injection before context loss
    * Use tool.execute.after to buffer session change evidence so capture is not pure model memory
    * Use experimental.chat.system.transform for continuous OKF context injection, not capture itself
  * **Changes**:
    * Documented already-used hooks: command.execute.before (UTC/runtime context) and event file.edited/file.watcher.updated (debounced validate-on-edit)
    * Produced hooks fitness table for capture timing vs weak/skip hooks (chat.params, shell.env, raw message.updated flood)
  * **Open questions**:
    * Should idle nudge auto-run capture, only toast/suggest /okf-capture, or stay fully manual?
    * Should pre-compaction capture write log entries automatically or only inject OKF summary into the compaction prompt?
    * Where should the hooks roadmap table live as a durable concept (playbook vs module vs project doc)?

## 2026-08-03

* **Decision**: Canonical package `resource` is the npm page (`https://www.npmjs.com/package/opencode-okf`); GitHub remains the source repository, not the release URI.
* **Update**: Set [opencode-okf](/project/opencode-okf.md) `resource` to the npm package URL; noted open design space for deterministic compact helpers on [okf-compact](/commands/okf-compact.md).
* **Creation**: Initial OKF bundle for opencode-okf, covering project identity, source modules, slash commands, agent tools, plugin configuration, validator-enforced OKF rules, and install/development playbooks.
* **Sources**: `README.md`, `package.json`, `TODO.md`, `src/*.ts`, `tests/*.ts`, `LICENSE`, `npm view opencode-okf`.
* **Question**: What parts of `/okf-compact` (if any) can be made deterministic—structure-preserving edits, aggressiveness parsing, entry classification heuristics, or promotion into concepts—versus remaining model judgment?
