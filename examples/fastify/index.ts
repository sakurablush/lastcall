import Fastify from 'fastify';
import { createLastcall } from 'lastcall';

const app = Fastify({ logger: true });
const lastcall = createLastcall();

app.get('/health', async () => ({
  status: lastcall.isShuttingDown() ? 'shutting_down' : 'ok',
}));

app.get('/', async () => 'Hello from Fastify + lastcall');

// Register HTTP drain before listen so SIGTERM during startup is handled.
lastcall.withHttpServer(app.server);

lastcall.register(
  'redis',
  async () => {
    // await redis.quit();
    console.log('Redis disconnected');
  },
  { phase: 'cleanup' },
);

await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
