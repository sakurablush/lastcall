---
name: lastcall-ship-release
description: End-to-end workflow to implement, validate, document, and release a lastcall version. Use when the user asks to prepare a release branch, cut a version, tag v*, or ship a patch/minor release.
disable-model-invocation: true
---

# Ship Release

Complete workflow for a lastcall semver release.

## Steps

1. **Branch** — create `release/X.Y.Z` from `main` (or rebase onto `origin/main`).
2. **Implement** — optional `@aether-engineer`; minimal diff; follow `lastcall-contributing`.
3. **Test** — `.cursor/skills/lastcall-pre-commit-ci/SKILL.md` (`npm run ci` until green).
4. **Docs** — sync `docs/`, verification matrix, skills if behavior changed (`lastcall-docs`).
5. **Version** — `.cursor/skills/lastcall-release-versioning/SKILL.md` (CHANGELOG + bump).
6. **Review** — optional: `.cursor/skills/lastcall-review-before-merge/SKILL.md`.
7. **Commit** — only after green gates; user must request commit explicitly.
8. **Tag** — `git tag vX.Y.Z && git push origin vX.Y.Z` (triggers npm publish + GitHub Release); verify npm + GitHub Pages.

## Pre-release checklist

```
- [ ] npm run ci green
- [ ] npm run build green
- [ ] CHANGELOG section dated [X.Y.Z]
- [ ] package.json version matches tag
- [ ] npm trusted publisher configured on npmjs.com (after first publish)
- [ ] GitHub Pages enabled (Settings → Actions)
```

## Report

State: release decision, gate results, suggested release title, and tag command.

## Do not

- Commit with a red gate.
- Tag without `[X.Y.Z]` section dated in `CHANGELOG.md`.
- Bump `package.json` on every PR — defer until release cut unless user asks.
