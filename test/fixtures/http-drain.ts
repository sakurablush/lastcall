import http from 'node:http';
import { createLastcall } from '../../src/create-lastcall.js';

const lastcall = createLastcall({
  autoExit: true,
  signals: [],
  shutdownTimeoutMs: 5_000,
  logger: () => {},
});

const server = http.createServer((_req, res) => {
  setTimeout(() => {
    res.end('ok');
    console.log('request-done');
  }, 300);
});

lastcall.withHttpServer(server, { drainTimeoutMs: 2_000 });

lastcall.register('log-close', async () => {
  console.log('server-closed');
});

server.listen(0, () => {
  const port = (server.address() as { port: number }).port;

  http.get(`http://127.0.0.1:${port}/`, () => {});

  setTimeout(() => {
    process.send?.('ready');
  }, 100);
});

process.on('message', (msg: unknown) => {
  if (msg === 'shutdown') {
    void lastcall.shutdown('ipc');
  }
});
