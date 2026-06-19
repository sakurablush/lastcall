# Signal handling

## Default signals

```ts
createLastcall(); // listens for SIGTERM, SIGINT, SIGHUP
```

| Signal    | Source                                |
| --------- | ------------------------------------- |
| `SIGTERM` | Kubernetes, Docker, `kill <pid>`      |
| `SIGINT`  | Ctrl+C, PM2                           |
| `SIGHUP`  | Terminal close, some process managers |

## Custom signals

```ts
const lastcall = createLastcall({
  signals: ['SIGTERM', 'SIGINT'],
});
```

## Platform notes

- **Windows**: `SIGHUP` may not be available — safely skipped
- **Bun**: Compatible; see [Bun guide](/guides/bun)
- **Docker**: Sends SIGTERM, then SIGKILL after grace period

## Testing signals

```ts
const lastcall = createLastcall({
  autoExit: false,
  signals: ['SIGTERM'],
});

lastcall.simulateSignal('SIGTERM');
```

## Idempotency

Multiple signals during shutdown are ignored. The first signal starts shutdown; subsequent ones are no-ops.

## Signal in handler context

When shutdown is triggered by a signal, handlers receive `ctx.signal`:

```ts
lastcall.register('log', async (ctx) => {
  console.log(ctx.signal); // 'SIGTERM'
});
```
