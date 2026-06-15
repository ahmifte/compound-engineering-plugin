import { describe, expect, test } from "bun:test"
import { validateReleasePleaseConfig } from "../src/release/config"

describe("release-please config validation", () => {
  test("rejects upward-relative changelog paths", () => {
    const errors = validateReleasePleaseConfig({
      packages: {
        ".": {
          "changelog-path": "CHANGELOG.md",
        },
        "plugins/compound-engineering": {
          "changelog-path": "../../CHANGELOG.md",
        },
      },
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('Package "plugins/compound-engineering"')
    expect(errors[0]).toContain("../../CHANGELOG.md")
  })

  test("allows package-local changelog paths and skipped changelogs", () => {
    const errors = validateReleasePleaseConfig({
      packages: {
        ".": {
          "changelog-path": "CHANGELOG.md",
        },
        "plugins/compound-engineering": {
          "skip-changelog": true,
        },
        ".claude-plugin": {
          "changelog-path": "CHANGELOG.md",
        },
      },
    })

    expect(errors).toEqual([])
  })

  test("rejects a stale release-as pin that is not ahead of the released version", () => {
    const errors = validateReleasePleaseConfig(
      {
        packages: {
          ".claude-plugin": { "release-as": "1.0.2" },
          ".cursor-plugin": { "release-as": "1.0.0" },
        },
      },
      {
        ".claude-plugin": "1.0.2",
        ".cursor-plugin": "1.0.1",
      },
    )

    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('Package ".claude-plugin"')
    expect(errors[0]).toContain("stale")
    expect(errors[0]).toContain("1.0.2")
    expect(errors[1]).toContain('Package ".cursor-plugin"')
    expect(errors[1]).toContain("1.0.0")
  })

  test("allows a forward release-as pin that is ahead of the released version", () => {
    const errors = validateReleasePleaseConfig(
      {
        packages: {
          ".claude-plugin": { "release-as": "1.0.3" },
          ".cursor-plugin": { "release-as": "1.0.2" },
        },
      },
      {
        ".claude-plugin": "1.0.2",
        ".cursor-plugin": "1.0.1",
      },
    )

    expect(errors).toEqual([])
  })

  test("rejects a release-as pin with no manifest entry to compare against", () => {
    const errors = validateReleasePleaseConfig({
      packages: {
        ".": {
          "release-as": "3.0.2",
        },
      },
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('Package "."')
    expect(errors[0]).toContain("release-as")
    expect(errors[0]).toContain("3.0.2")
  })
})
