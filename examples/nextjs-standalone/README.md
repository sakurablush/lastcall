# Next.js Standalone

For Next.js standalone output (`output: 'standalone'` in `next.config.js`):

```ts
// server.js (custom entry after build)
import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { createLastcall } from 'lastcall';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const lastcall = createLastcall();

await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

lastcall.withHttpServer(server);

lastcall.register(
  'next',
  async () => {
    // Next.js does not expose a stable close() API on all versions.
    // HTTP drain via withHttpServer() covers in-flight requests.
  },
  { phase: 'cleanup' },
);

server.listen(3000);
```

## Notes

- Register `withHttpServer` before `server.listen()`
- Use `pre` phase to mark health checks unhealthy before drain
- Set K8s `terminationGracePeriodSeconds` to at least 45s
