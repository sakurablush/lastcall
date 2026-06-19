# Exception capture

Optional automatic shutdown on unhandled errors:

```ts
const lastcall = createLastcall({
  captureUncaughtException: true,
  captureUnhandledRejection: true,
});
```

When enabled, `uncaughtException` or `unhandledRejection` triggers the same shutdown flow as SIGTERM.

## Default: disabled

By default lastcall does **not** capture these events — Node.js default behavior is preserved.

## When to enable

Enable in long-running production services where any fatal error should trigger cleanup:

```ts
createLastcall({
  captureUncaughtException: true,
  captureUnhandledRejection: true,
  logger: (msg, meta) => pino.error(meta, msg),
});
```

## Interaction with exit code

Shutdown triggered by an exception still runs all handlers. Exit code depends on handler results (critical failures → 1).
