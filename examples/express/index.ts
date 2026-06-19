import express from 'express';
import { createServer } from 'node:http';
import { createLastcall } from 'lastcall';

const app = express();
const server = createServer(app);
const lastcall = createLastcall();

app.get('/health', (_req, res) => {
  res.json({ status: lastcall.isShuttingDown() ? 'shutting_down' : 'ok' });
});

app.get('/', (_req, res) => {
  res.send('Hello from Express + lastcall');
});

lastcall.withHttpServer(server);

lastcall.register(
  'database',
  async () => {
    // await prisma.$disconnect();
    console.log('Database disconnected');
  },
  { phase: 'cleanup', critical: true },
);

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
