export const OKF_SPEC_URL =
  "https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/refs/heads/main/okf/SPEC.md"

export interface OKFSpec {
  url: string
  version: string
  content: string
}

export async function fetchOKFSpec(fetcher: typeof fetch = fetch): Promise<OKFSpec> {
  const response = await fetcher(OKF_SPEC_URL, {
    headers: { accept: "text/markdown, text/plain;q=0.9" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Could not fetch OKF specification: HTTP ${response.status} ${response.statusText}`)
  }

  const content = await response.text()
  const match = /^\*\*Version\s+([^*\s]+)\*\*/m.exec(content)
  if (!match?.[1]) throw new Error("Could not determine OKF version from the fetched specification")
  return { url: OKF_SPEC_URL, version: match[1], content }
}

export function formatSpecReport(spec: OKFSpec): string {
  return [`OKF specification v${spec.version}`, `Source: ${spec.url}`, "", spec.content].join("\n")
}
