# Troubleshooting

## Handler hangs forever

**Symptom:** Process never exits.

**Fix:** Set `timeoutMs` on the handler and/or lower `shutdownTimeoutMs`:

```ts
lastcall.register('slow', handler, { timeoutMs: 10_000 });
```

lastcall logs: `Handler "slow" timed out after 10000ms`

## Exit code is 1

**Symptom:** Kubernetes marks pod as failed.

**Cause:** A handler marked `critical: true` failed or timed out.

**Fix:** Check logs for `Handler "name" failed`. Fix the handler or set `critical: false` if non-essential.

## Double shutdown / duplicate handlers

**Symptom:** Handlers run twice or unexpected overwrite.

**Cause:** Registering handlers multiple times on hot reload, or reusing the same handler name.

**Fix:** Register handlers once at startup. Duplicate names log a warning and overwrite the previous handler. Shutdown is idempotent — signals won't re-run handlers after shutdown completes.

## Handler never runs

**Symptom:** A registered handler is never invoked during shutdown.

**Cause:** The handler's `phase` is not listed in `createLastcall({ phases: [...] })`.

**Fix:** Add the phase to `phases` or move the handler to an active phase. Check logs for `not included in configured phases`.

## `isShuttingDown()` stays true after shutdown

**Symptom:** Health check shows `shutting_down` even after handlers finished.

**Cause:** `isShuttingDown()` is `true` for the entire post-trigger lifecycle (including after handlers complete). The instance is single-use — you cannot register new handlers.

**Fix:** Use `isShutdownComplete()` when you need to know handlers finished. With `autoExit: true` (default), the process exits shortly after.

## Tests call process.exit

**Fix:**

```ts
createLastcall({ autoExit: false, signals: [] });
```

## HTTP requests dropped on deploy

**Fix:** Use `withHttpServer()`, set K8s `preStop` sleep, and mark health unhealthy in `pre` phase.

## Cannot register handlers during shutdown

**Symptom:** `Cannot register handlers while shutdown is in progress`.

**Fix:** Register all handlers at startup. Dynamic registration during shutdown is not supported.

## Cannot find module 'lastcall' in examples

```bash
cd examples/express
npm install
npm start
```

Examples use `"lastcall": "file:../.."` — build the parent package first: `npm run build`.
