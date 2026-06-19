---
name: lastcall-local-testing
description: Runs and validates lastcall locally — npm run ci, test:log, test:coverage, integration child-process tests, examples, and bench. Use when running tests, validating before release, or debugging test failures.
disable-model-invocation: true
---

# lastcall Local Testing

Human doc: `docs/testing/running-tests.md` · Skill index: `docs/contributing/cursor-skills.md`

## What gets tested

| Layer       | Command                 | Proves                                        |
| ----------- | ----------------------- | --------------------------------------------- |
| CI gate     | `npm run ci`            | lint, format, types, coverage, audit          |
| Unit        | `npm test`              | All Vitest tests (silent)                     |
| Coverage    | `npm run test:coverage` | 100% lines/functions/statements, 99% branches |
| Proof log   | `npm run test:log`      | Step-by-step `LASTCALL_TEST_LOG=1` output     |
| Integration | `test/integration/`     | Child-process IPC shutdown (not OS SIGTERM)   |
| Matrix      | `verification-matrix`   | Feature → test file mapping enforced          |
| Build       | `npm run build`         | `dist/` ESM + CJS + types                     |
| Package     | `npm pack --dry-run`    | Tarball = dist + README + LICENSE             |
| Bench       | `npm run bench`         | Shutdown micro-benchmark (informal)           |

**Full local acceptance (matches CI workflow):**

```bash
npm run ci && npm run build && npm run docs:build && npm pack --dry-run
```

## Verbose proof mode

```bash
npm run test:log
# or
LASTCALL_TEST_LOG=1 npm test
```

Output uses `[lastcall:test]` and `[lastcall:proof]` prefixes — ideal for demos and onboarding.

## Integration tests note

`test/integration/integration.test.ts` triggers shutdown via **child-process IPC**, not OS signal delivery. This is intentional for cross-platform CI (especially Windows).

## Examples smoke test

```bash
npm run build
cd examples/express && npm install && npm start
# Ctrl+C or kill — verify graceful shutdown logs
```

## Troubleshooting

| Symptom                                     | Fix                                                     |
| ------------------------------------------- | ------------------------------------------------------- |
| Coverage threshold failure                  | Add targeted unit test; check `vitest.config.ts`        |
| Flaky `vi.waitFor`                          | Use fake timers; see `create-lastcall.test.ts` patterns |
| `Cannot find module 'lastcall'` in examples | `npm run build` in repo root first                      |
| Integration timeout                         | Check `testTimeout` in `vitest.config.ts` (15s)         |

## Related

- `.cursor/skills/lastcall-pre-commit-ci/SKILL.md`
- `docs/testing/coverage-audit.md`
- `docs/testing/verification-matrix.md`
