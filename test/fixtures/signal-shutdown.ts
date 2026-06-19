import { createLastcall } from '../../src/create-lastcall.js';

/**
 * IPC-triggered shutdown fixture (signals: [] — no OS listeners).
 * Used by integration tests; parent sends { shutdown } via child_process IPC.
 */
const lastcall = createLastcall({
  autoExit: true,
  signals: [],
  logger: () => {},
});

lastcall.register('cleanup', async () => {
  console.log('handler-ran');
});

process.on('message', (msg: unknown) => {
  if (msg === 'shutdown') {
    void lastcall.shutdown('ipc');
  }
});

process.send?.('ready');

// Keep process alive until shutdown; unref so a stuck fixture does not block parent exit.
const keepAlive = setInterval(() => {}, 60_000);
keepAlive.unref();
