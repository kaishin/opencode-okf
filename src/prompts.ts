const AUTHORING_RULES = `Follow the Open Knowledge Format v0.1 specification:

- Treat the configured bundle directory as the bundle root.
- Store each non-reserved concept as a UTF-8 Markdown file with YAML frontmatter. A non-empty \`type\` is required. Include \`title\`, \`description\`, \`tags\`, and an ISO 8601 UTC \`timestamp\` whenever the source supports them. Include \`resource\` only when a canonical URI is known; never invent one.
- Reserve \`index.md\` for progressive-disclosure listings and \`log.md\` for date-grouped history. They are not concept documents. Keep log dates newest first in \`YYYY-MM-DD\` form.
- Prefer bundle-relative links such as \`/tables/subscriptions.md\` between concepts.
- Use concise, structural Markdown. Explain what a concept means, where its source lives, how it is calculated or used, caveats, and related concepts when those facts are supported.
- Do not invent business rules, formulas, joins, schema details, ownership, dashboard behavior, or URLs. Record unresolved facts as dated \`**Question**\` entries in the nearest \`log.md\`.
- Preserve producer-defined frontmatter fields and supported existing knowledge when updating files.
- Run the \`okf_validate\` tool before finishing and resolve every conformance error. Broken links and missing recommended metadata are warnings, not reasons to fabricate content.`

export function createPrompt(bundleDirectory: string): string {
  return `Create an OKF bundle in \`${bundleDirectory}/\` that captures the repository's most useful domain knowledge for humans and AI agents.

Before writing, inspect the repository broadly. Look for product and business documentation, application models, database schemas and migrations, analytics definitions, queries, dashboards, API contracts, runbooks, and configuration. Use focused searches and read authoritative sources; do not infer commercial semantics from names alone.

Choose a hierarchy and concept types that fit the evidence. Do not force a SaaS-specific template, but prioritize core commercial and operational concepts such as metrics, tables, dashboards, APIs, and playbooks when they exist. Create useful \`index.md\` files and a root \`log.md\`.

${AUTHORING_RULES}

Additional user guidance: $ARGUMENTS

When finished, summarize every file created or changed, list unresolved questions, and report the final validator result.`
}

export function updatePrompt(bundleDirectory: string): string {
  return `Update the existing OKF bundle in \`${bundleDirectory}/\` so it accurately reflects the repository now.

Read the current bundle first, then inspect relevant repository history and authoritative source files. Identify stale claims, missing high-value concepts, changed schemas or calculations, broken relationships, and indexes that need refreshing. Make the smallest evidence-backed changes and add date-grouped entries to \`log.md\` for meaningful updates.

${AUTHORING_RULES}

Update focus or additional guidance: $ARGUMENTS

When finished, summarize every file created, changed, or removed, list unresolved questions, and report the final validator result.`
}

export function validatePrompt(bundleDirectory: string): string {
  return `Validate the OKF bundle in \`${bundleDirectory}/\` with the \`okf_validate\` tool and report errors and warnings clearly.

Arguments: $ARGUMENTS

Validation is report-only unless the arguments explicitly ask you to fix problems. If fixes are requested, preserve the meaning of existing knowledge, correct only evidence-backed issues, rerun \`okf_validate\`, and summarize the changes.`
}
