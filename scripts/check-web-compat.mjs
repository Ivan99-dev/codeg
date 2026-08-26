import { parse } from "@babel/parser"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const unsupportedPatternParts = ["(?<=", "(?<!"]

function listJavaScriptFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...listJavaScriptFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath)
    }
  }

  return files
}

function findUnsupportedRegexNodes(ast) {
  const unsupported = []
  const pending = [ast]

  while (pending.length > 0) {
    const value = pending.pop()
    if (!value || typeof value !== "object") continue

    if (
      value.type === "RegExpLiteral" &&
      unsupportedPatternParts.some((part) => value.pattern.includes(part))
    ) {
      unsupported.push(value)
    }

    for (const child of Object.values(value)) {
      if (Array.isArray(child)) pending.push(...child)
      else if (child && typeof child === "object") pending.push(child)
    }
  }

  return unsupported
}

function scanFile(file) {
  const source = readFileSync(file, "utf8")
  const ast = parse(source, { sourceType: "unambiguous" })
  return findUnsupportedRegexNodes(ast).map((node) => ({
    file,
    line: node.loc?.start.line ?? 1,
    pattern: node.pattern,
  }))
}

function checkWebCompatibility(chunkDirectory) {
  if (!existsSync(chunkDirectory)) {
    throw new Error(`Chunk directory does not exist: ${chunkDirectory}`)
  }

  const files = listJavaScriptFiles(chunkDirectory)
  const failures = files.flatMap(scanFile)

  if (failures.length > 0) {
    const details = failures
      .map(({ file, line, pattern }) => `${file}:${line} /${pattern}/`)
      .join("\n")
    throw new Error(
      `Unsupported regular expression lookbehind found in web chunks:\n${details}`
    )
  }

  console.log(`Web compatibility check passed (${files.length} chunks scanned)`)
}

const chunkDirectory = path.resolve(
  process.argv[2] ?? "out/_next/static/chunks"
)

try {
  checkWebCompatibility(chunkDirectory)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
