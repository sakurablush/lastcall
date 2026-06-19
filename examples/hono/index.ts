import { Hono } from 'hono';
import { getRequestListener } from '@hono/node-server';
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const app = new Hono();
const lastcall = createLastcall();

app.get('/health', (c) => c.json({ status: lastcall.isShuttingDown() ? 'shutting_down' : 'ok' }));

app.get('/', (c) => c.text('Hello from Hono + lastcall'));

const server = createServer(getRequestListener(app.fetch));

// Register HTTP drain before listen — same pattern as Express and Fastify examples.
lastcall.withHttpServer(server);

lastcall.register(
  'websocket',
  async () => {
    console.log('WebSocket connections closed');
  },
  { phase: 'drain' },
);

const port = Number(process.env.PORT) || 3002;
server.listen(port, () => {
  console.log(`Hono server running on http://localhost:${port}`);
});
