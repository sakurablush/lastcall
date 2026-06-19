# Handler registration

## Basic usage

```ts
lastcall.register(name, handler, options?);
```

```ts
lastcall.register('database', async (ctx) => {
  console.log(`Shutting down because: ${ctx.reason}`);
  await db.disconnect();
});
```

## Options

| Option      | Type            | Default     | Description                                                |
| ----------- | --------------- | ----------- | ---------------------------------------------------------- |
| `priority`  | `number`        | `100`       | Lower = earlier within phase                               |
| `timeoutMs` | `number`        | —           | Per-handler timeout                                        |
| `critical`  | `boolean`       | `false`     | Failure sets exit code to 1                                |
| `deps`      | `string[]`      | `[]`        | Handler names that must finish first **in the same phase** |
| `phase`     | `ShutdownPhase` | `'cleanup'` | Shutdown phase                                             |

## Unregister

```ts
lastcall.unregister('database'); // returns true if removed
```

## Critical handlers

Mark infrastructure handlers as critical so failures are visible to orchestrators:

```ts
lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { critical: true },
);
```

## Timeouts

```ts
lastcall.register(
  'slow-service',
  async () => {
    await slow.close();
  },
  { timeoutMs: 5_000 },
);
```

If the handler exceeds 5 seconds, lastcall logs a clear message and continues shutdown.

## Dependencies

Handlers in the `deps` array must be registered in the **same phase**. Cross-phase dependencies throw at registration time:

```ts
// ❌ throws — drain-job is in 'drain', cleanup-job is in 'cleanup'
lastcall.register('drain-job', fn, { phase: 'drain' });
lastcall.register('cleanup-job', fn, { phase: 'cleanup', deps: ['drain-job'] });
```

Circular dependencies within a phase throw `TopologicalSortError` at shutdown time. Catch it via the exported `TopologicalSortError` class if you need programmatic handling.

Registering a handler while shutdown is in progress throws an error — register everything at startup.

## Check shutdown state

```ts
if (lastcall.isShuttingDown()) {
  // reject new work
}
```
