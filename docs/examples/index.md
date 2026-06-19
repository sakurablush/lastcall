# Examples

Runnable examples live in the repository `examples/` folder.

| Example                                                                                           | Description                |
| ------------------------------------------------------------------------------------------------- | -------------------------- |
| [standalone-worker](https://github.com/sakurablush/lastcall/tree/main/examples/standalone-worker) | Worker without HTTP        |
| [express](https://github.com/sakurablush/lastcall/tree/main/examples/express)                     | Express + health check     |
| [fastify](https://github.com/sakurablush/lastcall/tree/main/examples/fastify)                     | Fastify server             |
| [hono](https://github.com/sakurablush/lastcall/tree/main/examples/hono)                           | Hono server                |
| [node-http](https://github.com/sakurablush/lastcall/tree/main/examples/node-http)                 | Raw Node.js http           |
| [docker-k8s](https://github.com/sakurablush/lastcall/tree/main/examples/docker-k8s)               | Container deployment notes |
| [nextjs-standalone](https://github.com/sakurablush/lastcall/tree/main/examples/nextjs-standalone) | Next.js custom server      |
| [pm2-cluster](https://github.com/sakurablush/lastcall/tree/main/examples/pm2-cluster)             | PM2 cluster mode           |

## Run an example

```bash
npm run build
cd examples/express
npm install
npm start
```

Send Ctrl+C to trigger graceful shutdown.
