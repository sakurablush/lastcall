---
name: lastcall-release-versioning
description: Cuts a lastcall release or updates CHANGELOG and version files per SemVer. Use when shipping consumer-visible changes, bumping version, tagging v*, or preparing GitHub Release notes.
paths:
  - CHANGELOG.md
  - package.json
  - package-lock.json
  - README.md
---

# Release Versioning

Shippable work in lastcall requires a release decision and CHANGELOG entry.

## Authority

- Changelog format: `CHANGELOG.md` (Keep a Changelog)
- Publish procedure: `.github/workflows/publish.yml` (tag `v*` → npm + GitHub Release)
- Current version: `0.1.0` — first public line; API may evolve until `1.0.0`

## Decision

| Outcome     | When                                                                |
| ----------- | ------------------------------------------------------------------- |
| **No bump** | Internal refactors, maintainer-only CI, `.cursor/` policy — say why |
| **Defer**   | Normal PR — `[Unreleased]` entry only; do not bump `package.json`   |
| **Patch**   | Bug or security fix, no public API break                            |
| **Minor**   | Backward-compatible feature while on `0.y.z`                        |
| **Major**   | Breaking public API or stable `1.0.0` API promise                   |

Read current version from `package.json` — never guess.

## Workflow

1. Decide bump level; state rationale in final output.
2. Add bullets under `[Unreleased]` (or new `## [X.Y.Z] - YYYY-MM-DD` when cutting).
3. Sections: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security** — omit empty.
4. On release bump: sync `package.json`, `package-lock.json` (`npm install --package-lock-only`).
5. Tag `vX.Y.Z` and push — publish workflow runs on tag push.
6. Run `.cursor/skills/lastcall-pre-commit-ci/SKILL.md` before commit.

## Rule reference

`.cursor/rules/lastcall-release-changelog.mdc`

## End-to-end ship

For a full release workflow, see `.cursor/skills/lastcall-ship-release/SKILL.md`.
