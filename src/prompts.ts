
const AUTHORING_RULES = `Follow the latest Open Knowledge Format specification fetched with the \`okf_spec\` tool:

- Treat the configured bundle directory as the bundle root.
- Before authoring or updating, run the \`okf_inspect\` tool and read authoritative product docs, models, schemas, migrations, analytics, APIs, runbooks, and configuration relevant to the request.
- Store each non-reserved concept as a UTF-8 Markdown file with YAML frontmatter. A non-empty \`type\` is required. Include \`title\`, \`description\`, and \`tags\` when supported. Record authorship and meaningful content changes with \`generated: { by, at }\`; use \`sources\`, \`verified\`, \`status\`, and \`stale_after\` only when supported by evidence. Include \`resource\` only when a canonical URI or bundle path is known; never invent one.
- Reserve \`index.md\` for progressive-disclosure listings and \`log.md\` for date-grouped history. They are not concept documents. Keep log dates newest first in \`YYYY-MM-DD\` form.
- Prefer concept files and indexes for durable knowledge. Use \`log.md\` only for history, standing decisions, and unresolved questions that do not belong in a concept.
- Prefer bundle-relative links such as \`/tables/subscriptions.md\` between concepts.
- Use concise, structural Markdown. Explain what a concept means, where its source lives, how it is calculated or used, caveats, and related concepts when those facts are supported.
- Do not invent business rules, formulas, joins, schema details, ownership, dashboard behavior, or URLs. Record unresolved facts as dated \`**Question**\` entries in the nearest \`log.md\`.
- Preserve producer-defined frontmatter fields and supported existing knowledge when updating files. Consumers must tolerate unknown types and fields.
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

Before writing, run the \`okf_spec\` tool to fetch and read the authoritative current specification, then run \`okf_inspect\` to inventory likely sources and inspect the repository broadly. Look for product and business documentation, application models, database schemas and migrations, analytics definitions, queries, dashboards, API contracts, runbooks, and configuration. Use focused searches and read authoritative sources; do not infer commercial semantics from names alone.

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

In every mode: read the bundle and its root \`okf_version\` first. Fetch the current specification with \`okf_spec\`. If the bundle declares an older version, do not silently perform a bundle-wide migration during a focused update: recommend \`/okf-upgrade\` (unless the user explicitly requested migration). Update **concepts and indexes** for durable knowledge; use \`log.md\` only for history, open questions, or decisions that do not belong in a concept. Session mode is not log-only. Never invent facts.

${AUTHORING_RULES}

When finished, summarize every file created, changed, or removed, list unresolved questions, and report the final validator result.`
}

export type CompactScope = "logs" | "all"
export type CompactAggressiveness = "conservative" | "balanced" | "aggressive"

const AGGRESSIVENESS_LEVELS = new Set<string>(["conservative", "balanced", "aggressive"])

/** Parse compact args: optional hard \`all\`, then optional aggressiveness, then focus. */
export function parseCompactArgs(args: string): {
  scope: CompactScope
  aggressiveness: CompactAggressiveness
  rest: string
} {
  const tokens = args.trim().split(/\s+/).filter(Boolean)
  let scope: CompactScope = "logs"
  if (tokens[0] === "all") {
    scope = "all"
    tokens.shift()
  }
  let aggressiveness: CompactAggressiveness = "balanced"
  if (tokens[0] && AGGRESSIVENESS_LEVELS.has(tokens[0])) {
    aggressiveness = tokens.shift() as CompactAggressiveness
  }
  return { scope, aggressiveness, rest: tokens.join(" ") }
}

const LOG_COMPACT_STEPS = `For each \`log.md\`, and for each dated group and list entry, decide whether it still helps a future reader or agent:

- Keep decisions, constraints, tradeoffs, and their rationale; unresolved questions that remain open; pointers to sources of truth; and facts that concept documents do not already cover.
- Promote durable facts that belong in a concept document into the nearest concept file first, then remove them from the log.
- Drop entries that are superseded by newer entries, fully captured in concept documents, routine progress chatter, transient debugging details, or references to work that no longer exists.

Merge duplicate entries, keep dates newest first in \`YYYY-MM-DD\` form, and preserve the log's list formatting and any producer-defined frontmatter. Never delete an unresolved question that is still open, and never invent facts to replace removed ones. If entries were promoted into concept files, refresh the affected \`index.md\` links as needed.`

const ALL_COMPACT_STEPS = `Walk the **entire** bundle — concept files, \`index.md\` files, and \`log.md\` files — not just logs.

Concepts:

- Merge duplicate or near-duplicate concepts; keep one canonical file and retarget links.
- Remove concepts that are empty, fully superseded, or no longer supported by any evidence in the repo (only when clearly obsolete — when in doubt under \`conservative\`, keep).
- Tighten verbose prose: drop repetition and filler while preserving meaning, sources, formulas, caveats, and related links.
- Normalize frontmatter for the fetched current spec (required \`type\`; recommended \`title\`, \`description\`, \`tags\`; \`generated: { by, at }\` for authorship/change time); never invent a \`resource\`, source, verifier, or actor.
- Do not invent business rules or facts. Prefer smallest evidence-backed edits.

Indexes:

- Rebuild or refresh every \`index.md\` so listings match remaining concepts.
- Drop dead links; keep progressive-disclosure structure useful for humans and agents.

Logs:

${LOG_COMPACT_STEPS}`

const AGGRESSIVENESS_BLOCK = `Aggressiveness levels:

- \`conservative\`: remove only what is clearly superseded, duplicated, or fully captured elsewhere. When in doubt, keep.
- \`balanced\`: also drop chatter, transient details, redundant concept prose, and obvious duplicates, while keeping decisions, rationale, constraints, and open questions.
- \`aggressive\`: keep only what is still directly useful. Collapse older log groups into brief summaries; drop resolved questions and historical context; merge or remove low-value concepts; tighten indexes to the essentials.`

function compactScopeBlock(scope: CompactScope): string {
  if (scope === "all") {
    return `Scope: **all** (hard arg \`all\`) — compact the whole bundle.

${ALL_COMPACT_STEPS}`
  }
  return `Scope: **logs** (default) — compact only \`log.md\` files.

Read every \`log.md\` in the bundle.

${LOG_COMPACT_STEPS}`
}

/** When scope/aggressiveness are set (Pi), embed them. When omitted, model parses $ARGUMENTS. */
export function compactPrompt(
  bundleDirectory: string,
  scope?: CompactScope,
  aggressiveness?: CompactAggressiveness,
  rest = "",
): string {
  if (scope && aggressiveness) {
    return `Compact the OKF bundle at \`${bundleDirectory}/\`.

${compactScopeBlock(scope)}

Apply the \`${aggressiveness}\` aggressiveness level:

${AGGRESSIVENESS_BLOCK}

${rest ? `Additional focus or guidance: ${rest}\n\n` : ""}When finished, run the \`okf_validate\` tool and report what was kept, merged, promoted, removed, and rewritten, plus the final validator result.`
  }

  return `Compact the OKF bundle at \`${bundleDirectory}/\`.

Hard scope — first token of $ARGUMENTS:

| Args | Scope |
| --- | --- |
| *(none)* or aggressiveness/focus only | **logs** — only \`log.md\` files |
| \`all\` *[aggressiveness] [focus…]* | **all** — concepts, indexes, and logs |

Then optional aggressiveness (\`conservative\` | \`balanced\` | \`aggressive\`, default \`balanced\`), then free-form focus.

Arguments: $ARGUMENTS

${compactScopeBlock("logs")}

When the first arg is \`all\`, instead:

${ALL_COMPACT_STEPS}

${AGGRESSIVENESS_BLOCK}

When finished, run the \`okf_validate\` tool and report what was kept, merged, promoted, removed, and rewritten, plus the final validator result.`
}

export function upgradePrompt(bundleDirectory: string): string {
  return `Upgrade the entire OKF bundle in \`${bundleDirectory}/\` to the latest authoritative specification.

1. Run \`okf_spec\` first. Read the fetched specification in full and determine its version; do not rely on model memory or a bundled summary.
2. Read every concept, \`index.md\`, and \`log.md\` in the bundle before editing.
3. Apply the fetched spec's migration guidance across the whole bundle. For v0.1→v0.2 this includes migrating legacy \`timestamp\` to \`generated.at\` with an evidence-backed actor, migrating body \`# Citations\` lists to frontmatter \`sources\`, preserving legacy data when a safe migration is impossible, and retaining all producer-defined fields.
4. Never invent source metadata, actors, verification events, lifecycle state, stale dates, computations, executors, or attesters. Leave unsupported optional fields absent and report anything that needs human input.
5. Update only the bundle-root \`index.md\` frontmatter to declare the fetched \`okf_version\`. Preserve its listings and body.
6. Run \`okf_validate\`, fix every conformance error, and report remaining warnings.

Additional user guidance: $ARGUMENTS

When finished, summarize all migrated files, preserved legacy data, unresolved migration questions, and the final validator result.`
}

export function validatePrompt(bundleDirectory: string): string {
  return `Validate the OKF bundle in \`${bundleDirectory}/\` with the \`okf_validate\` tool and report errors and warnings clearly.

Arguments: $ARGUMENTS

Validation is report-only unless the arguments explicitly ask you to fix problems. If fixes are requested, preserve the meaning of existing knowledge, correct only evidence-backed issues, rerun \`okf_validate\`, and summarize the changes.`
}
