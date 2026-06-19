---
name: lastcall-contributing
description: Guides lastcall library development — npm run ci gate, ESM conventions, PR checklist, verification matrix, and where to change src/. Use when contributing, fixing bugs, adding shutdown features, editing tests/examples, or preparing a pull request.
paths:
  - src/**
  - test/**
  - examples/**
  - CHANGELOG.md
  - package.json
---

# lastcall Contributing

Human doc: `docs/contributing.md` · Skill index: `docs/contributing/cursor-skills.md`

## Quick start

```bash
git clone https://github.com/sakurablush/lastcall.git
cd lastcall
npm ci
npm run ci          # must pass before PR
npm run build
```

**Requirements:** Node ≥ 18 (`engines` in `package.json`). CI runs Node 18/20/22 and Bun.

## CI gate (mandatory)

`npm run ci` runs in order:

1. `lint` — ESLint on `src/`, `test/`, `examples/`
2. `format:check` — Prettier
3. `typecheck` — `tsc --noEmit`
4. `test:coverage` — Vitest with 100% line/function/statement coverage (99% branches)
5. `docs:build` — VitePress

GitHub Actions (`.github/workflows/ci.yml`) also runs `build` and bundle size check on Node 22.

**All workflows:** `docs/contributing/ci-and-automation.md`

## Code conventions

| Rule            | Detail                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| Module system   | ESM (`"type": "module"`)                                                       |
| TS imports      | Use `.js` extension: `import { x } from './foo.js'`                            |
| Package surface | Public API in `src/index.ts`; npm ships `dist/`, `README.md`, `LICENSE`        |
| Zero deps       | No production `dependencies` — keep the package lean                           |
| Tests           | `test/unit/` per module; `test/integration/` for child_process IPC             |
| Test logging    | `logStep` / `logProof` via `test/helpers/test-logger.ts` when proving behavior |

## Where to change what

| Change                    | Location                                 |
| ------------------------- | ---------------------------------------- |
| Factory + orchestration   | `src/create-lastcall.ts`                 |
| Handler registry          | `src/handler-registry.ts`                |
| Phase execution + HTTP    | `src/shutdown-runner.ts`                 |
| Signal listeners          | `src/signal-listener.ts`                 |
| Events                    | `src/events.ts`                          |
| Types + public interfaces | `src/types.ts`                           |
| Topological sort          | `src/utils/topological-sort.ts`          |
| Public exports            | `src/index.ts` + `docs/api/reference.md` |

## Version & CHANGELOG (mandatory)

Follow `.cursor/rules/lastcall-release-changelog.mdc` before finishing any consumer-facing change.

1. **Changelog** — notable changes go under `## [Unreleased]` in `CHANGELOG.md`.
2. **Version** — normal PRs defer the bump; release PRs align `package.json`, dated `CHANGELOG` section, and `vX.Y.Z` tag.
3. **Report** — state changelog yes/no and whether version was bumped or deferred.

## PR checklist

```
- [ ] npm run ci passes
- [ ] New behavior has unit tests; integration when child-process proof needed
- [ ] docs/api/reference.md updated for public API changes
- [ ] docs/testing/verification-matrix.md + test/verification-matrix.test.ts updated
- [ ] Feature doc under docs/features/ updated if user-facing
- [ ] CHANGELOG.md updated under [Unreleased] when consumer impact exists
- [ ] package.json version bumped only when preparing a release (not every PR)
- [ ] No unrelated refactors
- [ ] Do not commit .cursor/plans/ or other ephemeral AI plan files
```

## Adding behavior

1. Implement in `src/`
2. Add unit test in `test/unit/`
3. Add row to `test/verification-matrix.test.ts` + `docs/testing/verification-matrix.md`
4. Update feature doc and API reference as needed
5. Run full CI gate — `.cursor/skills/lastcall-pre-commit-ci/SKILL.md`

## Useful commands

| Command                     | Purpose                    |
| --------------------------- | -------------------------- |
| `npm run test:log`          | Verbose proof logging      |
| `npm run test:coverage:log` | Coverage + verbose logging |
| `npm run dev`               | `tsup --watch`             |
| `npm run bench`             | Shutdown micro-benchmark   |
| `npm run docs:dev`          | VitePress local preview    |
| `npm pack --dry-run`        | Verify tarball contents    |

## Related

- `CONTRIBUTING.md` — contributor guide (repo root)
- `docs/contributing/ci-and-automation.md` — GitHub Actions
- `docs/testing/writing-tests.md` — test patterns
- `docs/architecture/overview.md` — shutdown lifecycle
