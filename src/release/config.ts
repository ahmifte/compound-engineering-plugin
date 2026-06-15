import path from "path"

type ReleasePleasePackageConfig = {
  "changelog-path"?: string
  "skip-changelog"?: boolean
  "release-as"?: string
}

type ReleasePleaseConfig = {
  packages: Record<string, ReleasePleasePackageConfig>
}

// Maps a release component path (e.g. ".claude-plugin") to its last-released
// version, mirroring .github/.release-please-manifest.json.
type ReleasePleaseManifest = Record<string, string>

// Compares two plain "x.y.z" versions. Returns a negative number when `a` is
// lower than `b`, 0 when equal, positive when higher. Any pre-release suffix is
// ignored -- release-owned versions in this repo are plain semver.
function compareReleaseVersions(a: string, b: string): number {
  const parse = (version: string) =>
    version
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0)
  const left = parse(a)
  const right = parse(b)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function validateReleasePleaseConfig(
  config: ReleasePleaseConfig,
  manifest: ReleasePleaseManifest = {},
): string[] {
  const errors: string[] = []

  for (const [packagePath, packageConfig] of Object.entries(config.packages)) {
    const releaseAs = packageConfig["release-as"]
    if (releaseAs) {
      // A release-as pin is only legitimate as a one-shot forward override:
      // it must be strictly ahead of the last-released version so it drives
      // exactly one release. Once that release ships, release-please advances
      // the manifest to match the pin (it does not edit the config), so the
      // pin becomes stale -- and the check below then fails, forcing cleanup.
      // This is what bit the repo in #674: a pin left behind at-or-below the
      // released version silently re-pins every subsequent release.
      const released = manifest[packagePath]
      if (released === undefined) {
        errors.push(
          `Package "${packagePath}" uses a release-as pin "${releaseAs}" but has no release-please manifest entry to compare against. A pin must be a strict forward bump over the last-released version; remove it or add the manifest entry.`,
        )
      } else if (compareReleaseVersions(releaseAs, released) <= 0) {
        errors.push(
          `Package "${packagePath}" uses a stale release-as pin "${releaseAs}" that is not ahead of the released version "${released}". Remove release-as after the pinned release ships so future releases can bump normally.`,
        )
      }
    }

    const changelogPath = packageConfig["changelog-path"]
    if (!changelogPath) continue

    const normalized = path.posix.normalize(changelogPath)
    const segments = normalized.split("/")
    if (segments.includes("..")) {
      errors.push(
        `Package "${packagePath}" uses an unsupported changelog-path "${changelogPath}". release-please does not allow upward-relative paths like "../".`,
      )
    }
  }

  return errors
}
