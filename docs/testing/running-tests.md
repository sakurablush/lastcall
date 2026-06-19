# Running tests

lastcall uses [Vitest](https://vitest.dev/) with **100% line, function, and statement coverage** (99% branch threshold).

## Commands

| Command                     | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `npm test`                  | Run all tests (silent)                       |
| `npm run test:coverage`     | Run with coverage report                     |
| `npm run test:log`          | Run with **verbose proof logging**           |
| `npm run test:coverage:log` | Coverage + verbose logging                   |
| `npm run test:watch`        | Watch mode                                   |
| `npm run bench`             | Shutdown micro-benchmark                     |
| `npm run ci`                | Full local CI (lint, format, coverage, docs) |

## Verbose test logging

By default tests run **silently**. To log every step and proof of behavior:

```bash
npm run test:log
```

Or:

```bash
LASTCALL_TEST_LOG=1 npm test
# alias:
TEST_VERBOSE=1 npm test
```

Output format:

```
[lastcall:test 2026-06-19T...] START createLastcall > runs handlers on shutdown
[lastcall:proof] ✓ handler invoked on shutdown 1
[lastcall:test 2026-06-19T...] END createLastcall > runs handlers on shutdown
```

Use verbose mode to **demonstrate** that the package works — ideal for demos, debugging, and onboarding.

## Test layout

```
test/
├── helpers/
│   ├── test-logger.ts    # LASTCALL_TEST_LOG gate
│   └── setup.ts          # per-test START/END logging
├── unit/                 # per-module unit tests
├── integration/          # child_process IPC tests
└── verification-matrix.test.ts
```

## CI

GitHub Actions runs `npm test` and `npm run test:coverage` on Node 18/20/22 and Bun.

See [Coverage audit](/testing/coverage-audit) and [Verification matrix](/testing/verification-matrix).
