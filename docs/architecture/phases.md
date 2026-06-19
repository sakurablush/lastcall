# Shutdown phases

lastcall runs handlers in four configurable phases:

| Phase     | Order | Purpose                 | Example handlers                   |
| --------- | ----- | ----------------------- | ---------------------------------- |
| `pre`     | 1     | Stop accepting new work | Mark health check unhealthy        |
| `drain`   | 2     | Wait for in-flight work | HTTP server drain, WebSocket drain |
| `cleanup` | 3     | Close resources         | DB, Redis, queues, files           |
| `post`    | 4     | Final flush             | Metrics, logs                      |

Default order: `['pre', 'drain', 'cleanup', 'post']`

## Assigning handlers to phases

```ts
lastcall.register(
  'health',
  async () => {
    isHealthy = false;
  },
  { phase: 'pre', priority: 1 },
);

lastcall.withHttpServer(server); // defaults to phase: 'drain'

lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { phase: 'cleanup', critical: true },
);

lastcall.register(
  'metrics',
  async () => {
    await metrics.flush();
  },
  { phase: 'post' },
);
```

## Priority within a phase

Lower `priority` values run **earlier**. Default: `100`.

```ts
lastcall.register('cache', async () => {}, { priority: 50 });
lastcall.register('db', async () => {}, { priority: 10 }); // runs first
```

Handlers with the **same priority** in the same dependency wave run **in parallel**.

## Custom phase order

```ts
const lastcall = createLastcall({
  phases: ['drain', 'cleanup'], // skip pre and post
});
```
