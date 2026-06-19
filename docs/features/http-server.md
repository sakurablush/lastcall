# HTTP server drain

## Basic usage

```ts
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const server = createServer(handler);
const lastcall = createLastcall();

lastcall.withHttpServer(server);
server.listen(3000);
```

Works with any object implementing:

```ts
interface HttpServerLike {
  close(callback?: (err?: Error) => void): void;
  closeIdleConnections?(): void;
  closeAllConnections?(): void;
}
```

Node.js `http`/`https`/`http2` servers, Express, Fastify, and Hono (via `app.server`) are supported.

## Options

```ts
lastcall.withHttpServer(server, {
  name: 'api',
  drainTimeoutMs: 10_000,
  priority: 10,
  phase: 'drain',
});
```

| Option           | Default         | Description              |
| ---------------- | --------------- | ------------------------ |
| `name`           | `'http-server'` | Handler name             |
| `drainTimeoutMs` | `10000`         | Max wait for connections |
| `priority`       | `10`            | Handler priority         |
| `phase`          | `'drain'`       | Shutdown phase           |

## What happens on shutdown

1. `closeIdleConnections()` if available (Node 18+)
2. `server.close()` — stop accepting new connections
3. Wait for in-flight requests up to `drainTimeoutMs`
4. `closeAllConnections()` if drain times out (logged via your `logger`)

The HTTP handler is marked **critical** — drain failures and global abort during drain set exit code to 1. Force-close after `drainTimeoutMs` resolves successfully (connections were cut).

## Framework examples

See runnable examples in the repository on GitHub:

- [Express](https://github.com/sakurablush/lastcall/tree/main/examples/express)
- [Fastify](https://github.com/sakurablush/lastcall/tree/main/examples/fastify)
- [Hono](https://github.com/sakurablush/lastcall/tree/main/examples/hono)
- [Raw Node.js http](https://github.com/sakurablush/lastcall/tree/main/examples/node-http)
