# Verification matrix

Every public feature maps to automated tests. The matrix is enforced by `test/verification-matrix.test.ts`, which verifies that:

1. Each feature references at least one test file
2. Those files exist on disk
3. Those files contain keywords proving the feature is exercised

| Feature                             | Test files                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| `createLastcall()`                  | `test/unit/create-lastcall.test.ts`                          |
| `getDefaultLastcall()`              | `create-lastcall.test.ts`, `singleton.test.ts`               |
| `register()` / `unregister()`       | `handler-registry.test.ts`, `create-lastcall.test.ts`        |
| Shutdown idempotency                | `create-lastcall.test.ts`                                    |
| Phases (pre/drain/cleanup/post)     | `shutdown-runner.test.ts`, `create-lastcall.test.ts`         |
| Priority ordering                   | `handler-registry.test.ts`                                   |
| Dependency graph                    | `topological-sort.test.ts`, `handler-registry.test.ts`       |
| Per-handler timeout                 | `create-lastcall.test.ts`                                    |
| Global shutdown timeout             | `shutdown-runner.test.ts`                                    |
| Critical vs non-critical exit codes | `shutdown-runner.test.ts`, `create-lastcall.test.ts`         |
| Signal handling                     | `signal-listener.test.ts`, `create-lastcall.test.ts`         |
| `simulateSignal()`                  | `create-lastcall.test.ts`                                    |
| `withHttpServer()`                  | `shutdown-runner.test.ts`, `integration/integration.test.ts` |
| Lifecycle events                    | `events.test.ts`, `create-lastcall.test.ts`                  |
| Metrics hooks                       | `shutdown-runner.test.ts`                                    |
| Exception capture                   | `create-lastcall.test.ts`                                    |
| `autoExit` / custom `exit()`        | `create-lastcall.test.ts`                                    |
| Default logger                      | `logger.test.ts`, `create-lastcall.test.ts`                  |
| Handler context + `abortSignal`     | `create-lastcall.test.ts`, `shutdown-runner.test.ts`         |
| Child process integration (IPC)     | `integration/integration.test.ts`                            |
| Package exports                     | `index.test.ts`                                              |
| Cross-phase dependency validation   | `handler-registry.test.ts`                                   |
| Register blocked during shutdown    | `create-lastcall.test.ts`                                    |
| `TopologicalSortError` export       | `index.test.ts`                                              |
| Process listener cleanup            | `create-lastcall.test.ts`                                    |
| Async handler failures              | `shutdown-runner.test.ts`, `create-lastcall.test.ts`         |
| Handler overwrite semantics         | `create-lastcall.test.ts`                                    |

Integration tests trigger shutdown via **child-process IPC**, not OS signals — reliable on Windows and Linux alike.
