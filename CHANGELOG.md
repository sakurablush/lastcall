# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `hasHandler(name)` and `listHandlers()` for handler introspection (logging, health dashboards, tests)
- `resetDefaultLastcall()` — public test helper to clear the `getDefaultLastcall()` singleton
- `HandlerSummary` exported type
- README community section, Kubernetes health-check snippet, sustain-development block
- `CONTRIBUTORS.md`, expanded npm keywords, `funding` field in `package.json`
- Docs: ecosystem comparison in [why lastcall?](docs/design/why-lastcall.md), health-check pattern in getting started

### Fixed

- Global shutdown timeout no longer discards in-flight handler results when racing batch completion
- `withHttpServer()` now respects shutdown-in-progress guard and duplicate-name warning like `register()`
- Invalid `shutdownTimeoutMs` (≤ 0) now throws `RangeError` at construction time
- Duplicate or invalid `phases` entries now throw `RangeError` at construction time
- `unregister()` now rejects when other handlers still depend on the target name
- Negative `timeoutMs` / non-positive `drainTimeoutMs` now throw `RangeError`
- HTTP drain handler now respects global abort via `abortSignal`
- Global abort now stops remaining phases immediately (labeled loop break)
- `globalAbort` listeners no longer leak when handlers complete before the global timeout
- Late handler promise rejections are swallowed after another race participant wins
- Duplicate entries in `signals` are deduplicated at construction time

### Added

- `isShutdownComplete()` and `getState()` for clearer lifecycle introspection
- Registration warning when a handler `deps` entry is not registered yet (forward refs still allowed)
- Shutdown error summary log when any handler fails
- HTTP drain force-close now logs when `drainTimeoutMs` is exceeded
- Stricter validation: handler name whitespace, self/duplicate deps, non-finite timeouts
- Clearer errors when modifying handlers after shutdown completes vs during shutdown
- Exported `LastcallState` type
- Registration warning when handler `phase` is not in configured `phases`
- `priority` must be a finite number
- GitHub automation: Dependabot, PR template, CODEOWNERS, labeler, FUNDING
- Docs: `contributing/cursor-skills.md`, `contributing/ci-and-automation.md`

## [0.1.0] - 2026-06-19

First public release. API may evolve until 1.0.0 based on real-world feedback.

### Added

- Initial release of `lastcall` graceful shutdown manager
- Handler registration with priority, timeout, critical flag, and dependencies
- Configurable shutdown phases: `pre`, `drain`, `cleanup`, `post`
- Signal handling for `SIGTERM`, `SIGINT`, and `SIGHUP`
- HTTP server integration via `withHttpServer()`
- Metrics hooks (`onHandlerStart`, `onHandlerEnd`)
- Event emitter API for shutdown lifecycle
- Testing utilities: `simulateSignal()`, fake timer support
- Zero production dependencies
