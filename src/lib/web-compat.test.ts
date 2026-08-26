import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const temporaryDirectories: string[] = []
const scannerPath = path.resolve("scripts/check-web-compat.mjs")

function createChunkDirectory(source: string) {
  const root = mkdtempSync(path.join(tmpdir(), "codeg-web-compat-"))
  const chunks = path.join(root, "_next", "static", "chunks", "nested")
  mkdirSync(chunks, { recursive: true })
  writeFileSync(path.join(chunks, "fixture.js"), source)
  temporaryDirectories.push(root)
  return path.join(root, "_next", "static", "chunks")
}

function runScanner(chunkDirectory: string) {
  return spawnSync(process.execPath, [scannerPath, chunkDirectory], {
    encoding: "utf8",
  })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("web compatibility build gate", () => {
  it("accepts JavaScript chunks without unsupported regex lookbehind", () => {
    const chunks = createChunkDirectory(
      "const email = /[-.\\w+]+@[-\\w]+(?:\\.[-\\w]+)+/gu"
    )

    const result = runScanner(chunks)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Web compatibility check passed")
  })

  it("rejects JavaScript chunks that contain regex lookbehind", () => {
    const chunks = createChunkDirectory(
      "const email = /(?<=^|\\s)([-.\\w+]+)@[-\\w]+/gu"
    )

    const result = runScanner(chunks)

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/fixture\.js/)
  })
})
