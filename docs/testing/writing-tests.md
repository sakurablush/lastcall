# Writing tests

## Test your app's shutdown

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall({
  autoExit: false,
  signals: [],
});

it('cleans up on shutdown', async () => {
  const cleanup = vi.fn();
  lastcall.register('db', cleanup);
  await lastcall.shutdown('test');
  expect(cleanup).toHaveBeenCalled();
});
```

## Fake timers

```ts
vi.useFakeTimers();

lastcall.register('slow', () => new Promise(() => {}), { timeoutMs: 100 });
const p = lastcall.shutdown('test');
await vi.advanceTimersByTimeAsync(150);
expect(await p).toBe(1);

vi.useRealTimers();
```

## Simulate signals

```ts
lastcall.simulateSignal('SIGTERM');
await vi.waitFor(() => expect(handler).toHaveBeenCalled());
```

## Custom exit

```ts
const exit = vi.fn();
const lastcall = createLastcall({ autoExit: true, exit, signals: [] });
```

## Verbose logging in your tests

```ts
import { logStep, logProof } from './helpers/test-logger';

it('proves ordering', async () => {
  logStep('registering handlers');
  // ...
  logProof('phases ran in order', order);
});
```

Run with `LASTCALL_TEST_LOG=1` to see output.

## Contributing tests

- One test file per source module in `test/unit/`
- Use `logStep` / `logProof` for demonstrable behavior
- Maintain 100% line coverage (`npm run test:coverage`)
