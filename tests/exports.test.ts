import { describe, expect, test } from "bun:test"
import * as pluginEntry from "../src/index.js"
import * as libEntry from "../src/lib.js"

describe("package exports", () => {
  test("the main entry only exports the plugin", () => {
    expect(Object.keys(pluginEntry).sort()).toEqual(["OKFPlugin", "default"])
    expect(pluginEntry.default).toBe(pluginEntry.OKFPlugin)
  })

  test("the lib entry exports reusable helpers and constants", () => {
    expect(typeof libEntry.validateBundle).toBe("function")
    expect(typeof libEntry.captureSession).toBe("function")
    expect(typeof libEntry.OKF_SPEC_URL).toBe("string")
  })
})
