# CI and automation

Overview of GitHub Actions, Dependabot, and PR automation for lastcall.

## Workflows

| Workflow    | Trigger                     | Purpose                                      |
| ----------- | --------------------------- | -------------------------------------------- |
| **CI**      | Push/PR to `main`, `master` | Lint, typecheck, test, build, coverage, docs |
| **Docs**    | Push to `main`, `master`    | Deploy VitePress to GitHub Pages             |
| **Publish** | GitHub Release published    | npm publish with provenance                  |
| **Labeler** | PR opened/updated           | Path-based labels on pull requests           |

See [`.github/workflows/README.md`](https://github.com/sakurablush/lastcall/blob/main/.github/workflows/README.md) in the repository.

## CI merge gate

Local equivalent:

```bash
npm run ci
```

Runs: `lint` → `format:check` → `typecheck` → `test:coverage` → `docs:build`

GitHub CI (`.github/workflows/ci.yml`) additionally runs:

- Matrix: Node 18, 20, 22, Bun
- `npm run build`
- Bundle size check (15 KB gzipped ESM limit on Node 22)

## Dependabot

[`.github/dependabot.yml`](https://github.com/sakurablush/lastcall/blob/main/.github/dependabot.yml) opens weekly grouped PRs for devDependencies with labels `dependencies` and `automated`.

## Labels {#labels}

[`.github/labeler.yml`](https://github.com/sakurablush/lastcall/blob/main/.github/labeler.yml) applies PR labels:

| Label           | Paths                    |
| --------------- | ------------------------ |
| `ci`            | `.github/**`             |
| `dependencies`  | `package.json`, lockfile |
| `documentation` | `docs/`, `*.md`          |
| `code`          | `src/**`                 |
| `tests`         | `test/**`                |
| `examples`      | `examples/**`            |
| `cursor`        | `.cursor/**`             |
| `security`      | `SECURITY.md`, core src  |

## Publishing

1. Merge release PR with dated `CHANGELOG` section and version bump
2. Create GitHub Release `vX.Y.Z`
3. `publish.yml` runs `npm publish --provenance`
4. Requires `NPM_TOKEN` repository secret

## Cursor automation

Agent skills and rules live in `.cursor/` and are documented in [Cursor skills](./cursor-skills.md). They are tracked in git (unlike `.cursor/plans/`).
