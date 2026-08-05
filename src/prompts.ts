const AUTHORING_RULES = `Follow the Open Knowledge Format v0.1 specification:

- Treat the configured bundle directory as the bundle root.
- Store each non-reserved concept as a UTF-8 Markdown file with YAML frontmatter. A non-empty \`type\` is required. Include \`title\`, \`description\`, \`tags\`, and an ISO 8601 UTC \`timestamp\` whenever the source supports them. Include \`resource\` only when a canonical URI is known; never invent one.
- Reserve \`index.md\` for progressive-disclosure listings and \`log.md\` for date-grouped history. They are not concept documents. Keep log dates newest first in \`YYYY-MM-DD\` form.
- Prefer bundle-relative links such as \`/tables/subscriptions.md\` between concepts.
- Use concise, structural Markdown. Explain what a concept means, where its source lives, how it is calculated or used, caveats, and related concepts when those facts are supported.
- Do not invent business rules, formulas, joins, schema details, ownership, dashboard behavior, or URLs. Record unresolved facts as dated \`**Question**\` entries in the nearest \`log.md\`.
- Preserve producer-defined frontmatter fields and supported existing knowledge when updating files.
- Run the \`okf_validate\` tool before finishing and resolve every conformance error. Broken links and missing recommended metadata are warnings, not reasons to fabricate content.`

export type UpdateMode = "repo" | "diff" | "session"

/** Parse hard source mode. First token \`session\` or \`diff\` selects mode; otherwise repo (including no args). */
export function parseUpdateArgs(args: string): { mode: UpdateMode; rest: string } {
  const tokens = args.trim().split(/\s+/).filter(Boolean)
  const first = tokens[0]
  if (first === "session" || first === "diff") {
    return { mode: first, rest: tokens.slice(1).join(" ") }
  }
  return { mode: "repo", rest: args.trim() }
}

export function initPrompt(bundleDirectory: string): string {
  return `Initialize an OKF bundle in \`${bundleDirectory}/\` that captures the repository's most useful domain knowledge for humans and AI agents.

Before writing, inspect the repository broadly. Look for product and business documentation, application models, database schemas and migrations, analytics definitions, queries, dashboards, API contracts, runbooks, and configuration. Use focused searches and read authoritative sources; do not infer commercial semantics from names alone.

Choose a hierarchy and concept types that fit the evidence. Do not force a SaaS-specific template, but prioritize core commercial and operational concepts such as metrics, tables, dashboards, APIs, and playbooks when they exist. Create useful \`index.md\` files and a root \`log.md\`.

${AUTHORING_RULES}

Additional user guidance: $ARGUMENTS

When finished, summarize every file created or changed, list unresolved questions, and report the final validator result.`
}

function updateSourceBlock(bundleDirectory: string, mode: UpdateMode, rest: string): string {
  if (mode === "diff") {
    return `Source mode: **diff** (hard arg \`diff\`).

1. Run the \`okf_diff\` tool first. Optional next token is a git ref (default HEAD = uncommitted changes); further tokens are focus: ${rest || "(none)"}.
2. Read the changed files and their direct dependencies as evidence.
3. Update **concept files and indexes** for knowledge those changes support. Use \`log.md\` only for dated history, open questions, or decisions that do not belong in a concept.
4. Do not broaden into unrelated areas of the repo.`
  }

  if (mode === "session") {
    return `Source mode: **session** (hard arg \`session\`).

1. Review this conversation and work completed in the worktree. Extract evidence-backed decisions, implementation facts, tradeoffs, constraints, meaningful changes, and unresolved questions.
2. Prefer writing or updating **concept files and indexes** when the session established durable product/domain knowledge. Session update is not log-only.
3. Use \`log.md\` (via \`okf_capture\` or direct edit) only for standing decisions, open questions, and history that should not live in a concept file.
4. Skip routine chatter, secrets, and unsupported assumptions. Focus: ${rest || "(none)"}.`
  }

  return `Source mode: **repo** (no hard arg — full repository evidence).

1. Read the current bundle in \`${bundleDirectory}/\` first.
2. Inspect authoritative sources (docs, models, schemas, analytics, APIs, runbooks, config). Do not infer commercial semantics from names alone.
3. Fix stale claims, missing concepts, broken relationships, and stale indexes with the smallest evidence-backed edits.
4. Write concepts and indexes first; use \`log.md\` for meaningful update history and open questions. Focus: ${rest || "(none)"}.`
}

/** When mode is set (Pi), embed it. When omitted (OpenCode/Claude templates), model parses $ARGUMENTS. */
export function updatePrompt(bundleDirectory: string, mode?: UpdateMode, rest = ""): string {
  if (mode) {
    return `Update the existing OKF bundle in \`${bundleDirectory}/\`.

${updateSourceBlock(bundleDirectory, mode, rest)}

Always prefer concept files and indexes for durable knowledge. Logs are secondary.

${AUTHORING_RULES}

When finished, summarize every file created, changed, or removed, list unresolved questions, and report the final validator result.`
  }

  return `Update the existing OKF bundle in \`${bundleDirectory}/\`.

Hard source mode — first token of $ARGUMENTS only:

| Args | Mode | Evidence source |
| --- | --- | --- |
| *(none)* | **repo** | Full repository (docs, schemas, code, config) |
| \`diff\` *[ref] [focus…]* | **diff** | \`okf_diff\` (default base HEAD); scope to changed files |
| \`session\` *[focus…]* | **session** | This conversation + completed work |

Any first token other than \`session\` or \`diff\` is free-form focus under **repo**.

Arguments: $ARGUMENTS

In every mode: read the bundle first; update **concepts and indexes** for durable knowledge; use \`log.md\` only for history, open questions, or decisions that do not belong in a concept. Session mode is not log-only. Never invent facts.

${AUTHORING_RULES}

When finished, summarize every file created, changed, or removed, list unresolved questions, and report the final validator result.`
}

export function compactPrompt(bundleDirectory: string): string {
  return `Compact the \`log.md\` files in the OKF bundle at \`${bundleDirectory}/\` so they keep only durable, future-relevant knowledge.

Read every \`log.md\` in the bundle. For each dated group and list entry, decide whether it still helps a future reader or agent:

- Keep decisions, constraints, tradeoffs, and their rationale; unresolved questions that remain open; pointers to sources of truth; and facts that concept documents do not already cover.
- Promote durable facts that belong in a concept document into the nearest concept file first, then remove them from the log.
- Drop entries that are superseded by newer entries, fully captured in concept documents, routine progress chatter, transient debugging details, or references to work that no longer exists.

Merge duplicate entries, keep dates newest first in \`YYYY-MM-DD\` form, and preserve the log's list formatting and any producer-defined frontmatter. Never delete an unresolved question that is still open, and never invent facts to replace removed ones. If entries were promoted into concept files, refresh the affected \`index.md\` links as needed.

Interpret the arguments as the compaction aggressiveness, defaulting to \`balanced\` when none is given:

- \`conservative\`: remove only entries that are clearly superseded or already fully captured in concept documents. When in doubt, keep the entry.
- \`balanced\`: also drop routine progress chatter, transient debugging details, and duplicates, while keeping decisions, rationale, constraints, and open questions.
- \`aggressive\`: keep only what is still directly useful for future work. Collapse older date groups into brief summaries, drop resolved questions and historical context, and retain just open questions, standing decisions, and constraints.

Any remaining arguments after the aggressiveness level are additional focus or guidance: $ARGUMENTS

When finished, run the \`okf_validate\` tool and report what was kept, promoted, and removed, plus the final validator result.`
}

export function validatePrompt(bundleDirectory: string): string {
  return `Validate the OKF bundle in \`${bundleDirectory}/\` with the \`okf_validate\` tool and report errors and warnings clearly.

Arguments: $ARGUMENTS

Validation is report-only unless the arguments explicitly ask you to fix problems. If fixes are requested, preserve the meaning of existing knowledge, correct only evidence-backed issues, rerun \`okf_validate\`, and summarize the changes.`
}
