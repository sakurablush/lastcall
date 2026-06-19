/**
 * Manual / integration fixture: real OS signal shutdown (SIGTERM / SIGINT).
 * Spawn via test/fixtures/run-os-signal.ts — do not run bare in a terminal
 * unless you plan to send a signal yourself (Ctrl+C = SIGINT).
 */
import { createLastcall } from '../../src/create-lastcall.js';

const lastcall = createLastcall({
  autoExit: false,
  signals: ['SIGTERM', 'SIGINT'],
  logger: (message, meta) => {
    console.log(JSON.stringify({ event: 'log', message, meta: meta ?? null }));
  },
});

lastcall.on('beforeShutdown', (payload) => {
  console.log(JSON.stringify({ event: 'beforeShutdown', ...payload }));
});

lastcall.on('afterShutdown', (payload) => {
  console.log(JSON.stringify({ event: 'afterShutdown', ...payload }));
  process.exit(payload.exitCode);
});

lastcall.register('cleanup', async (ctx) => {
  console.log(
    JSON.stringify({
      event: 'handler-ran',
      reason: ctx.reason,
      signal: ctx.signal ?? null,
      phase: ctx.phase,
    }),
  );
});

console.log(JSON.stringify({ event: 'ready', pid: process.pid, platform: process.platform }));

process.on('message', (msg: unknown) => {
  if (msg === 'exit') {
    void lastcall.shutdown('ipc-exit').then((code) => process.exit(code));
  }

  if (typeof msg === 'string' && msg.startsWith('signal:')) {
    const signal = msg.slice('signal:'.length) as 'SIGTERM' | 'SIGINT';
    console.log(JSON.stringify({ event: 'inject-signal', signal, via: 'simulateSignal' }));
    lastcall.simulateSignal(signal);
  }
});
