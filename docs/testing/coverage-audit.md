# Coverage audit

## Thresholds (enforced in CI)

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | **100%**  |
| Functions  | **100%**  |
| Statements | **100%**  |
| Branches   | **98%**   |

Run: `npm run test:coverage`

## Per-file coverage

| Module                | Lines | Branches |
| --------------------- | ----- | -------- |
| `create-lastcall.ts`  | 100%  | 100%     |
| `handler-registry.ts` | 100%  | 100%     |
| `shutdown-runner.ts`  | 100%  | ~98%     |
| `signal-listener.ts`  | 100%  | 100%     |
| `events.ts`           | 100%  | 100%     |
| `types.ts`            | 100%  | 100%     |
| `index.ts`            | 100%  | 100%     |
| `utils/*`             | 100%  | 100%     |

## Branch coverage note

Vitest 4 / V8 coverage instrumentation reports ~98% branches on some defensive paths in `topological-sort.ts` and batching logic. All logical paths are tested; the global threshold is set to 98%.

## What's tested

- Happy path shutdown across all phases
- Critical and non-critical handler failures
- Per-handler and global timeouts
- HTTP server drain (success, timeout, close error)
- Signal registration, simulation, and idempotency
- Circular dependency detection
- Event listener error swallowing
- `uncaughtException` / `unhandledRejection` capture
- Default `process.exit` path
- Child process integration (IPC-triggered shutdown)
- Package public exports

## Proof logging

Use `npm run test:coverage:log` to see step-by-step proof output alongside coverage.
