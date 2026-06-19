# lastcall

[![npm version](https://img.shields.io/npm/v/lastcall.svg)](https://www.npmjs.com/package/lastcall)
[![npm provenance](https://img.shields.io/badge/provenance-SLSA-blue)](https://www.npmjs.com/package/lastcall)
[![CI](https://github.com/sakurablush/lastcall/actions/workflows/ci.yml/badge.svg)](https://github.com/sakurablush/lastcall/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/lastcall)](./LICENSE)

> Graceful process lifecycle management for Node.js and Bun.

Published on npm as **`lastcall`**. Source repository: [sakurablush/lastcall](https://github.com/sakurablush/lastcall). **Documentation:** [sakurablush.github.io/lastcall](https://sakurablush.github.io/lastcall/).

**lastcall** is a zero-dependency, TypeScript-first library for managing graceful shutdown in production applications. It handles SIGTERM/SIGINT from Docker, Kubernetes, and PM2 — with priorities, dependencies, phases, and HTTP server draining built in.

~22 KB ESM bundle · zero production dependencies · 100% line coverage · integration tests via child processes

```bash
npm install lastcall
```

**Try it locally** (clone, install, run tests):

```bash
git clone https://github.com/sakurablush/lastcall.git && cd lastcall && npm ci && npm test
```

## Documentation

**Browse online:** [sakurablush.github.io/lastcall](https://sakurablush.github.io/lastcall/)

📖 VitePress docs cover [getting started](https://sakurablush.github.io/lastcall/getting-started), [API reference](https://sakurablush.github.io/lastcall/api/reference), guides (Kubernetes, Docker, Bun), and [examples](https://sakurablush.github.io/lastcall/examples/).

**Automation:** [CI and automation](docs/contributing/ci-and-automation.md) · Security: [SECURITY.md](SECURITY.md) · See [Contributing](docs/contributing.md).

**Cursor users:** project [Agent Skills](docs/contributing/cursor-skills.md) in `.cursor/skills/` guide the AI through development, testing, and docs.

## Community

| Document                                 | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | Development setup and PR checklist |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards                |
| [CONTRIBUTORS.md](CONTRIBUTORS.md)       | How contributors are recognized    |
| [CHANGELOG.md](CHANGELOG.md)             | Release history                    |
| [SECURITY.md](SECURITY.md)               | Vulnerability reporting            |

## Why lastcall?

| Problem                               | lastcall solution                     |
| ------------------------------------- | ------------------------------------- |
| In-flight requests dropped on SIGTERM | `withHttpServer()` drains connections |
| Cleanup runs in wrong order           | Priorities + dependency graph         |
| Custom signal handlers are buggy      | Test-covered, idempotent shutdown     |
| Hard to test shutdown                 | `simulateSignal()`, `autoExit: false` |
| No observability                      | Metrics hooks + lifecycle events      |

## Quick start

```ts
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const server = createServer((req, res) => {
  res.end('ok');
});

const lastcall = createLastcall();

lastcall.withHttpServer(server); // before listen()

lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { critical: true },
);

server.listen(3000);
// SIGTERM / SIGINT trigger graceful shutdown automatically.
```

## API

### `createLastcall(options?)`

| Option                      | Default                                  | Description                          |
| --------------------------- | ---------------------------------------- | ------------------------------------ |
| `signals`                   | `['SIGTERM', 'SIGINT', 'SIGHUP']`        | Signals to listen for                |
| `shutdownTimeoutMs`         | `30000`                                  | Global shutdown timeout (> 0)        |
| `phases`                    | `['pre', 'drain', 'cleanup', 'post']`    | Shutdown phases (no duplicates)      |
| `onHandlerStart`            | —                                        | Metrics hook when handler starts     |
| `onHandlerEnd`              | —                                        | Metrics hook when handler ends       |
| `captureUncaughtException`  | `false`                                  | Shutdown on uncaught exceptions      |
| `captureUnhandledRejection` | `false`                                  | Shutdown on unhandled rejections     |
| `autoExit`                  | `true`                                   | Call `process.exit()` after shutdown |
| `logger`                    | `console.error` with `[lastcall]` prefix | Custom logger                        |

### `lastcall.register(name, fn, options?)`

| Option      | Default     | Description                                   |
| ----------- | ----------- | --------------------------------------------- |
| `priority`  | `100`       | Lower runs earlier (within same phase)        |
| `timeoutMs` | —           | Per-handler timeout                           |
| `critical`  | `false`     | Failure affects exit code                     |
| `deps`      | `[]`        | Names that must finish first (**same phase**) |
| `phase`     | `'cleanup'` | Shutdown phase                                |

### Shutdown phases

1. **`pre`** — Mark unhealthy, stop accepting new work
2. **`drain`** — Wait for in-flight requests/jobs
3. **`cleanup`** — Close DB, Redis, queues, files
4. **`post`** — Final logs, metrics flush

### `getDefaultLastcall(options?)`

Returns a process-wide singleton. Options apply **only on the first call**.

### Other methods

```ts
await lastcall.shutdown('reason', 'SIGTERM'); // Manual trigger (optional signal)
lastcall.isShuttingDown(); // True once shutdown starts (stays true after completion)
lastcall.isShutdownComplete(); // True after shutdown finishes
lastcall.getState(); // 'idle' | 'shutting_down' | 'done' | 'force_exit'
lastcall.simulateSignal('SIGTERM'); // Testing
lastcall.withHttpServer(server); // HTTP drain
lastcall.unregister('name'); // Remove handler (blocked if others depend on it)
lastcall.hasHandler('name'); // Check if a handler is registered
lastcall.listHandlers(); // Snapshot for logging / health dashboards
lastcall.on('beforeShutdown', fn); // Events
```

### Events

- `beforeShutdown` — `{ reason, signal? }`
- `afterShutdown` — `{ exitCode }`
- `handlerError` — `{ name, phase, durationMs, error }`
- `handlerCompleted` — `{ name, phase, durationMs, error? }`

## HTTP server integration

```ts
import http from 'node:http';
import { createLastcall } from 'lastcall';

const server = http.createServer(handler);
const lastcall = createLastcall();

lastcall.withHttpServer(server, {
  drainTimeoutMs: 10_000,
  priority: 10,
  phase: 'drain',
});

server.listen(3000);
```

Works with Node.js `http`/`https`/`http2` servers. Framework examples: [Express](examples/express/), [Fastify](examples/fastify/), [Hono](examples/hono/).

## Dependencies between handlers

```ts
lastcall.register(
  'database',
  async () => {
    /* ... */
  },
  { phase: 'cleanup' },
);
lastcall.register(
  'cache',
  async () => {
    /* ... */
  },
  {
    phase: 'cleanup',
    deps: ['database'],
  },
);
```

Handlers with `deps` wait for their dependencies to complete **within the same phase**. Circular dependencies throw at shutdown time. Cross-phase dependencies are rejected at registration time.

## Examples

| Example                                          | Description            |
| ------------------------------------------------ | ---------------------- |
| [standalone-worker](examples/standalone-worker/) | Worker without HTTP    |
| [express](examples/express/)                     | Express + health check |
| [fastify](examples/fastify/)                     | Fastify server         |
| [hono](examples/hono/)                           | Hono server            |
| [node-http](examples/node-http/)                 | Raw Node.js http       |
| [docker-k8s](examples/docker-k8s/)               | K8s/Docker guide       |
| [nextjs-standalone](examples/nextjs-standalone/) | Next.js custom server  |
| [pm2-cluster](examples/pm2-cluster/)             | PM2 cluster mode       |

See [examples/README.md](examples/README.md) for how to run them.

## Testing

```bash
npm test                  # silent
npm run test:log          # verbose proof logging (LASTCALL_TEST_LOG=1)
npm run test:coverage     # 100% line coverage (99% branch threshold)
```

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall({
  autoExit: false,
  signals: [],
});

lastcall.register('cleanup', vi.fn());
await lastcall.shutdown('test');
```

See [docs/testing/running-tests.md](docs/testing/running-tests.md) for the full guide.

## Kubernetes / Docker

See [examples/docker-k8s/](examples/docker-k8s/) for deployment best practices.

Key settings:

- Set `terminationGracePeriodSeconds` > `shutdownTimeoutMs`
- Use `preStop` hook for load balancer drain
- Register health check as unhealthy in `pre` phase

```ts
// Readiness probe — fail fast once shutdown starts
app.get('/health', (_req, res) => {
  if (lastcall.isShuttingDown()) {
    res.status(503).send('shutting down');
    return;
  }
  res.status(200).send('ok');
});
```

## Bun compatibility

lastcall works with Bun. Signal handling may differ on Windows — `SIGHUP` is not available on all platforms and is safely skipped.

## Troubleshooting

### Handler hangs forever

Set `timeoutMs` on the handler. lastcall will log a clear timeout message and continue shutdown.

### Multiple SIGTERM signals

Shutdown is idempotent — subsequent signals are ignored while shutting down.

### Exit code is 1

A handler marked `critical: true` failed or timed out. Check logs for `Handler "name" failed`.

### Tests call process.exit

Use `autoExit: false` in test configuration. Use `resetDefaultLastcall()` when testing code that calls `getDefaultLastcall()`.

## Sustain development (optional)

**lastcall** is MIT-licensed and free on npm — no paywall, no paid tier, no feature lock.

Keeping it current still has a real cost: cross-platform signal testing, integration suites via child processes, docs, CI, and compatibility with Node.js and Bun releases. That work runs on a self-funded stack.

**Contribute in code** if that fits you: [Issues](https://github.com/sakurablush/lastcall/issues) or a pull request per [CONTRIBUTING.md](CONTRIBUTING.md).

**Financial support** is optional — only if lastcall saved you time or you want to help cover the next development cycle. No tiers, no perks, no obligation:

| Coin     | Address                                       |
| -------- | --------------------------------------------- |
| Bitcoin  | `bc1qcrj9wreunffxm75fcz0a2gjkw87jshcwvmxv68`  |
| Ethereum | `0xB85Bf389E5fC5E12636FB6F17b68Df7fC990a3dA`  |
| Litecoin | `ltc1q0nsarncmnz8vk34dav7l0vgu9m5k48drr8z6js` |
| Dogecoin | `D6YGoYWpFZxW8JXvEfT5iB9uNXcs8AeY7L`          |

## License

MIT
