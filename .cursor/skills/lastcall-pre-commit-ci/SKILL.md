---
name: lastcall-pre-commit-ci
description: Runs lastcall's full CI gate (lint, format, typecheck, coverage, docs) before commit or merge. Use when committing, fixing CI failures, editing Cursor skills, or finishing implementation work.
paths:
  - src/**
  - test/**
  - examples/**
  - .cursor/skills/**
---

# Pre-Commit CI

Run the repository quality gate before any commit or merge-ready sign-off.

## Command

```bash
npm run ci
```

Expands to: `lint` → `format:check` → `typecheck` → `test:coverage` → `docs:build`

## Workflow

1. After edits to `src/`, `test/`, or `examples/`, optionally run `npm run lint` on touched files.
2. After edits to **`.cursor/skills/**/\*.md`**, run `npm run format`(or full`npm run ci`). Markdown tables must pass Prettier.
3. Run `npm run ci` in full — do not substitute `npm test` alone (coverage thresholds are enforced).
4. Fix every error; re-run until exit code 0.
5. Include auto-fixed formatting in the same commit as the feature or fix.

## Verbose test proof

```bash
npm run test:log
npm run test:coverage:log
```

## If `ci` cannot run

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage
```

Format skills only:

```bash
npx prettier --write ".cursor/skills/**/*.md"
```

## Rule reference

`.cursor/rules/pre-commit-quality-gate.mdc`
