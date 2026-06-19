# Examples

Runnable examples live in subfolders with their own `package.json`. Each links to the parent package via `"lastcall": "file:../.."`.

## Prerequisites

From the repository root:

```bash
npm install
npm run build
```

Then in an example folder:

```bash
cd examples/express
npm install
npm start
```

## Examples

| Folder                                    | Description                                         |
| ----------------------------------------- | --------------------------------------------------- |
| [standalone-worker](./standalone-worker/) | Worker without HTTP                                 |
| [express](./express/)                     | Express + health check                              |
| [fastify](./fastify/)                     | Fastify server                                      |
| [hono](./hono/)                           | Hono + `getRequestListener` (drain before `listen`) |
| [node-http](./node-http/)                 | Raw Node.js `http`                                  |
| [docker-k8s](./docker-k8s/)               | Container deployment notes                          |
| [nextjs-standalone](./nextjs-standalone/) | Next.js custom server                               |
| [pm2-cluster](./pm2-cluster/)             | PM2 cluster mode                                    |

## Important

Always call `lastcall.withHttpServer(server)` **before** `listen()`. The Hono example uses `createServer(getRequestListener(...))` for the same reason — `serve()` binds the port immediately.
