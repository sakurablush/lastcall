import { createLastcall } from 'lastcall';

const lastcall = createLastcall();

lastcall.register('database', async () => {
  // await db.$disconnect();
});

lastcall.register('queue', async () => {
  // await queue.close();
});

// HTTP server (optional)
// lastcall.withHttpServer(server);

console.log('Running — send SIGTERM to shut down gracefully');
