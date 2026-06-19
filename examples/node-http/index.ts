import http from 'node:http';
import { createLastcall } from 'lastcall';

const lastcall = createLastcall();

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from raw Node.js http + lastcall\n');
});

lastcall.withHttpServer(server);

server.listen(Number(process.env.PORT) || 3003, () => {
  console.log(`Server listening on port ${(server.address() as { port: number }).port}`);
});
