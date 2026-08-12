import fs from "node:fs"
import path from "node:path"

const definitions = [
  ["darwin-aarch64", "codeg_aarch64.app.tar.gz"],
  ["darwin-aarch64-app", "codeg_aarch64.app.tar.gz"],
  ["darwin-x86_64", "codeg_x64.app.tar.gz"],
  ["darwin-x86_64-app", "codeg_x64.app.tar.gz"],
  ["linux-x86_64", "codeg_VERSION_amd64.AppImage"],
  ["linux-x86_64-appimage", "codeg_VERSION_amd64.AppImage"],
  ["linux-x86_64-deb", "codeg_VERSION_amd64.deb"],
  ["linux-x86_64-rpm", "codeg-VERSION-1.x86_64.rpm"],
  ["windows-x86_64", "codeg_VERSION_x64-setup.exe"],
  ["windows-x86_64-nsis", "codeg_VERSION_x64-setup.exe"],
  ["windows-aarch64", "codeg_VERSION_arm64-setup.exe"],
  ["windows-aarch64-nsis", "codeg_VERSION_arm64-setup.exe"],
]

function readOption(name) {
  const index = process.argv.indexOf(name)
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing required option ${name}`)
  }
  return process.argv[index + 1]
}

const assetDir = readOption("--asset-dir")
const output = readOption("--output")
const tag = process.env.RELEASE_TAG
const repository = process.env.GITHUB_REPOSITORY

if (!tag?.startsWith("v") || !repository) {
  throw new Error("RELEASE_TAG and GITHUB_REPOSITORY are required")
}

const version = tag.slice(1)
const assetNames = new Set(
  fs
    .readFileSync(path.join(assetDir, "assets.txt"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
)
const notesPath = path.join(assetDir, "notes.md")
const notes = fs.existsSync(notesPath)
  ? fs.readFileSync(notesPath, "utf8").trim()
  : ""

const platforms = Object.fromEntries(
  definitions.map(([platform, template]) => {
    const asset = template.replace("VERSION", version)
    const signatureAsset = `${asset}.sig`
    const signaturePath = path.join(assetDir, signatureAsset)

    if (!assetNames.has(asset) || !assetNames.has(signatureAsset)) {
      throw new Error(`Release is missing updater assets for ${platform}: ${asset}`)
    }
    if (!fs.existsSync(signaturePath)) {
      throw new Error(`Signature was not downloaded: ${signatureAsset}`)
    }

    return [
      platform,
      {
        signature: fs.readFileSync(signaturePath, "utf8").trim(),
        url: `https://github.com/${repository}/releases/download/${tag}/${asset}`,
      },
    ]
  })
)

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
}

fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${output} with ${Object.keys(platforms).length} platforms`)
