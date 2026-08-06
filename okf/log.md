# Bundle Update Log

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
