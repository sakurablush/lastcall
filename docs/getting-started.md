# Getting Started

Published on npm as **`lastcall`**. Repository: [github.com/sakurablush/lastcall](https://github.com/sakurablush/lastcall). Docs: [sakurablush.github.io/lastcall](https://sakurablush.github.io/lastcall/).

## Install

```bash
npm install lastcall
```

Requires **Node.js 18+**. Works with **Bun** (see [Bun guide](/guides/bun)).

## Minimal example

```ts
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const server = createServer((req, res) => {
  res.end('ok');
});

const lastcall = createLastcall();

// 1. Drain HTTP connections (phase: drain) — register before listen()
lastcall.withHttpServer(server);

// 2. Close infrastructure (phase: cleanup)
lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { critical: true },
);

// 3. Optional: stop accepting new work (phase: pre)
let acceptingWork = true;
lastcall.register(
  'health',
  async () => {
    acceptingWork = false;
  },
  { phase: 'pre' },
);

server.listen(3000);
```

When the process receives **SIGTERM** (Kubernetes, Docker) or **Ctrl+C** (SIGINT), lastcall runs your handlers **in phase order**:

1. **`pre`** — handlers you register (e.g. flip health checks)
2. **`drain`** — `withHttpServer()` and other drain handlers
3. **`cleanup`** — databases, queues, caches
4. **`post`** — final metrics or logs

Then it calls `process.exit(0)` — or `1` if a critical handler failed.

Nothing happens automatically unless you register it. `withHttpServer()` is the built-in drain helper; health checks and DB closes are yours to register.

## Manual shutdown

```ts
await lastcall.shutdown('maintenance');
```

## Testing in your app

```ts
const lastcall = createLastcall({
  autoExit: false, // don't call process.exit() in tests
  signals: [], // don't register OS signal listeners
});

lastcall.register('cleanup', vi.fn());
await lastcall.shutdown('test');
```

Use `simulateSignal('SIGTERM')` to test signal paths without sending real OS signals.

Use `resetDefaultLastcall()` when your tests call `getDefaultLastcall()` and need a fresh singleton between cases.

## Health checks

```ts
app.get('/health', (_req, res) => {
  if (lastcall.isShuttingDown()) {
    res.status(503).send('shutting down');
    return;
  }
  res.status(200).send('ok');
});
```

Pair with a `pre` phase handler that flips internal state if you need to stop accepting work before drain begins.

## Next steps

- [Shutdown lifecycle](/architecture/shutdown-lifecycle)
- [Phases](/architecture/phases)
- [Kubernetes guide](/guides/kubernetes)
- [API reference](/api/reference)
