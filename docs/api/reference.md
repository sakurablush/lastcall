# API reference

Canonical reference for the `lastcall` public API. Narrative guides live under [Features](/features/handler-registration).

## `createLastcall(options?)`

Creates a new lastcall instance bound to the current process. Registers signal listeners (unless `signals: []`) and orchestrates shutdown when a signal arrives or `shutdown()` is called.

### Options

| Option                      | Type                     | Default                                            |
| --------------------------- | ------------------------ | -------------------------------------------------- |
| `signals`                   | `ShutdownSignal[]`       | `['SIGTERM','SIGINT','SIGHUP']`                    |
| `shutdownTimeoutMs`         | `number`                 | `30000` (must be > 0)                              |
| `phases`                    | `ShutdownPhase[]`        | `['pre','drain','cleanup','post']` (no duplicates) |
| `onHandlerStart`            | `(name, ctx) => void`    | —                                                  |
| `onHandlerEnd`              | `(name, result) => void` | —                                                  |
| `captureUncaughtException`  | `boolean`                | `false`                                            |
| `captureUnhandledRejection` | `boolean`                | `false`                                            |
| `logger`                    | `(msg, meta?) => void`   | `[lastcall]` on stderr                             |
| `autoExit`                  | `boolean`                | `true`                                             |
| `exit`                      | `(code) => never`        | `process.exit`                                     |

Unavailable signals (e.g. `SIGHUP` on Windows) are skipped without error. Duplicate signal entries are deduplicated.

## `getDefaultLastcall(options?)`

Returns a process-wide singleton. **Options apply only on the first call**; later calls return the existing instance and log a warning if options are passed again.

## Instance methods

### `register(name, fn, options?)`

Register a shutdown handler. Throws if called while shutdown is in progress.

Duplicate names log a warning and **overwrite** the previous handler.

| Option      | Type            | Default     | Description                                      |
| ----------- | --------------- | ----------- | ------------------------------------------------ |
| `priority`  | `number`        | `100`       | Lower runs earlier within the same phase         |
| `timeoutMs` | `number`        | —           | Per-handler timeout (`> 0` only; `0` = no limit) |
| `critical`  | `boolean`       | `false`     | Failure or timeout sets exit code to `1`         |
| `deps`      | `string[]`      | `[]`        | Names that must finish first (**same phase**)    |
| `phase`     | `ShutdownPhase` | `'cleanup'` | Shutdown phase                                   |

### `unregister(name)`

Remove a handler by name. Returns `true` if removed. Throws during shutdown. Throws if another registered handler lists this name in `deps`.

### `hasHandler(name)`

Returns `true` if a handler with that name is currently registered.

### `listHandlers()`

Returns a read-only snapshot of registered handlers, sorted by configured phase order, then `priority`, then name. Each entry includes `name`, `phase`, `priority`, `critical`, `deps`, and optional `timeoutMs`. Useful for logging, health dashboards, and test assertions.

### `shutdown(reason?, signal?)`

Trigger shutdown manually. Returns a `Promise<number>` with the exit code (`0` or `1`). Idempotent — concurrent calls share the same promise.

### `isShuttingDown()`

Returns `true` once shutdown has been triggered — including after shutdown completes (until the process exits). Useful for health checks.

### `isShutdownComplete()`

Returns `true` after shutdown has finished (`done` or `force_exit` state).

### `getState()`

Returns the current lifecycle state: `'idle' | 'shutting_down' | 'done' | 'force_exit'`.

### `simulateSignal(signal)`

Invoke the same code path as a real OS signal — for tests only.

### `withHttpServer(server, options?)`

Register an HTTP drain handler. Call **before** `server.listen()`.

| Option           | Default         | Description                             |
| ---------------- | --------------- | --------------------------------------- |
| `name`           | `'http-server'` | Handler name                            |
| `drainTimeoutMs` | `10000`         | Wait before force-closing (must be > 0) |
| `priority`       | `10`            | Order within phase                      |
| `phase`          | `'drain'`       | Usually `drain`                         |

### `on(event, listener)` / `off(event, listener)`

| Event              | Payload                                       |
| ------------------ | --------------------------------------------- |
| `beforeShutdown`   | `{ reason: string, signal?: ShutdownSignal }` |
| `afterShutdown`    | `{ exitCode: number }`                        |
| `handlerError`     | `{ name, phase, durationMs, error }`          |
| `handlerCompleted` | `{ name, phase, durationMs, error? }`         |

Listener errors are swallowed so shutdown always continues.

## Types

```ts
type ShutdownPhase = 'pre' | 'drain' | 'cleanup' | 'post';
type ShutdownSignal = 'SIGTERM' | 'SIGINT' | 'SIGHUP';

interface HandlerContext {
  reason: string;
  signal?: ShutdownSignal;
  phase: ShutdownPhase;
  /** Aborted when global or per-handler timeout fires */
  abortSignal: AbortSignal;
}

interface HandlerSummary {
  name: string;
  phase: ShutdownPhase;
  priority: number;
  critical: boolean;
  deps: readonly string[];
  timeoutMs?: number;
}
```

## `resetDefaultLastcall()`

Clears the process-wide singleton from `getDefaultLastcall()`. **For test isolation only** — do not use in production.

## Exit codes

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| `0`  | All handlers completed; no critical failures or global timeout            |
| `1`  | Critical handler failed/timed out, global timeout, or orchestration error |

## Errors

`TopologicalSortError` is thrown internally for circular or unknown dependencies and results in exit code `1`. Import it to distinguish configuration errors:

```ts
import { TopologicalSortError } from 'lastcall';
```

## Exports

```ts
import {
  createLastcall,
  getDefaultLastcall,
  resetDefaultLastcall,
  DEFAULT_PHASES,
  DEFAULT_SIGNALS,
  TopologicalSortError,
} from 'lastcall';

import type { HandlerSummary, LastcallState } from 'lastcall';
```

## See also

- [Handler registration](/features/handler-registration)
- [HTTP server drain](/features/http-server)
- [Signal handling](/features/signal-handling)
- [Shutdown lifecycle](/architecture/shutdown-lifecycle)
