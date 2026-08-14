import { describe, expect, test } from "bun:test"
import { fetchOKFSpec, OKF_SPEC_URL } from "../src/spec.js"

describe("fetchOKFSpec", () => {
  test("fetches the authoritative URL and extracts the version", async () => {
    let requested = ""
    const fetcher = (async (input: string | URL | Request) => {
      requested = String(input)
      return new Response("# Open Knowledge Format (OKF)\n\n**Version 0.2**\n")
    }) as typeof fetch

    const spec = await fetchOKFSpec(fetcher)

    expect(requested).toBe(OKF_SPEC_URL)
    expect(spec.version).toBe("0.2")
    expect(spec.content).toContain("Open Knowledge Format")
  })

  test("rejects unsuccessful and unversioned responses", async () => {
    const failing = (async () => new Response("nope", { status: 503, statusText: "Unavailable" })) as unknown as typeof fetch
    await expect(fetchOKFSpec(failing)).rejects.toThrow("HTTP 503")

    const unversioned = (async () => new Response("# OKF")) as unknown as typeof fetch
    await expect(fetchOKFSpec(unversioned)).rejects.toThrow("determine OKF version")
  })
})
