import { createLastcall } from '../src/create-lastcall.js';

const ITERATIONS = 100;

const lastcall = createLastcall({
  autoExit: false,
  signals: [],
  logger: () => {},
});

for (let i = 0; i < ITERATIONS; i++) {
  lastcall.register(`handler-${i}`, async () => {});
}

const start = performance.now();
await lastcall.shutdown('bench');
const durationMs = performance.now() - start;

console.log(`Shutdown ${ITERATIONS} handlers in ${durationMs.toFixed(2)}ms`);
console.log(`Avg per handler: ${(durationMs / ITERATIONS).toFixed(3)}ms`);
