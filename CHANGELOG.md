# Changelog

All notable changes to **lastcall** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-06-20

Patch release — no public API changes. Publishes via GitHub Actions (npm trusted publishing on tag push).

### Changed

- Release procedure documented for tag-driven CI publish ([npm publishing](docs/contributing/npm-publishing.md))

## [0.1.0] - 2026-06-19

First public release on npm as **lastcall** ([sakurablush/lastcall](https://github.com/sakurablush/lastcall)). API may evolve until 1.0.0 based on real-world feedback.

### Added

- Graceful shutdown manager with handler registration — priority, per-handler timeout, critical flag, and dependency graph
- Configurable shutdown phases: `pre`, `drain`, `cleanup`, `post` (topological execution within each phase)
- Signal handling for `SIGTERM`, `SIGINT`, and `SIGHUP` (platform-dependent availability)
- HTTP server integration via `withHttpServer()` — idle connection close, in-flight request drain, force-close on timeout
- Metrics hooks (`onHandlerStart`, `onHandlerEnd`) and event emitter API for shutdown lifecycle
- Introspection API: `getState()`, `isShutdownComplete()`, `hasHandler()`, `listHandlers()`, exported `LastcallState` and `HandlerSummary` types
- `resetDefaultLastcall()` — public helper to clear the `getDefaultLastcall()` singleton (tests and advanced setups)
- Testing utilities: `simulateSignal()`, fake timer support, verbose proof logging (`LASTCALL_TEST_LOG=1`)
- **155 automated tests** — 100% line/function/statement coverage, 98% branch threshold; integration tests via child-process IPC
- `test/unit/production-scenarios.test.ts` — Kubernetes lifecycle, diamond dependencies, HTTP under load, cooperative abort, negative guards
- [Verification matrix](docs/testing/verification-matrix.md) enforced in CI via `test/verification-matrix.test.ts`
- Zero production dependencies; ESM + CJS bundles targeting Node 18+
- VitePress documentation site ([sakurablush.github.io/lastcall](https://sakurablush.github.io/lastcall/)) with guides for Docker, Kubernetes, Bun, and Windows
- Examples: Express, Fastify, Hono, Node HTTP, standalone worker
- GitHub automation: **CI** (Node 22 merge gate + Bun compatibility job + bundle size check), **CodeQL**, **Docs** deploy, **Publish** (npm trusted publishing on `v*` tags), **Labeler**, **Dependabot**
- [CI and automation](docs/contributing/ci-and-automation.md) and [npm publishing](docs/contributing/npm-publishing.md) maintainer guides
- Publish helpers: `scripts/publish.sh`, `scripts/publish.ps1`, `scripts/extract-changelog-section.mjs`
- Cursor agent skills and rules in `.cursor/`; [cursor-skills.md](docs/contributing/cursor-skills.md)
- `CONTRIBUTORS.md`, community section in README, `funding` field in `package.json`, `.github/FUNDING.yml`

### Changed

- Dev toolchain: `cross-env` 10, `eslint` 10, `typescript` 6, `vitest` 4, `@vitest/coverage-v8` 4, `vitepress` 2.0.0-alpha.17
- `packageManager` pinned to `npm@11.4.2`; `esbuild` override `^0.28.1` for patched dev-toolchain
- `tsconfig.json`: `"types": ["node"]` and `"ignoreDeprecations": "6.0"` for TypeScript 6 / tsup DTS builds
- `npm run ci` — canonical pre-commit gate: lint, format, typecheck, coverage, audit (docs build runs in CI workflow)

### Fixed

- Global shutdown timeout no longer discards in-flight handler results when racing batch completion
- `withHttpServer()` respects shutdown-in-progress guard and duplicate-name warning (consistent with `register()`)
- `unregister()` rejects when other handlers still depend on the target name
- HTTP drain handler respects global abort via `abortSignal`; force-close logs when `drainTimeoutMs` is exceeded
- Global abort stops remaining phases immediately; `globalAbort` listeners no longer leak on early completion
- Late handler promise rejections are swallowed after another race participant wins
- Construction-time validation: invalid `shutdownTimeoutMs`, duplicate/invalid `phases`, negative timeouts, non-finite `priority`, handler name whitespace, self/duplicate deps
- Duplicate entries in `signals` deduplicated at construction; registration warnings for unknown `deps` and unconfigured `phase`
- Clearer errors when modifying handlers after shutdown completes vs during shutdown; shutdown error summary when any handler fails
