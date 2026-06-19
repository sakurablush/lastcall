# Events and metrics

## Lifecycle events

```ts
lastcall.on('beforeShutdown', ({ reason, signal }) => {});
lastcall.on('afterShutdown', ({ exitCode }) => {});
lastcall.on('handlerError', ({ name, phase, durationMs, error }) => {});
lastcall.on('handlerCompleted', ({ name, phase, durationMs, error }) => {});

lastcall.off('beforeShutdown', listener);
```

Listener errors are swallowed — they never break shutdown.

## Metrics hooks

```ts
const lastcall = createLastcall({
  onHandlerStart(name, ctx) {
    metrics.increment('shutdown.handler.start', { name, phase: ctx.phase });
  },
  onHandlerEnd(name, { durationMs, error, phase }) {
    metrics.timing('shutdown.handler.duration', durationMs, { name, phase });
    if (error) metrics.increment('shutdown.handler.error', { name });
  },
});
```

## Prometheus example

```ts
onHandlerEnd(name, { durationMs, error, phase }) {
  shutdownDuration.observe({ handler: name, phase }, durationMs / 1000);
  if (error) shutdownErrors.inc({ handler: name, phase });
}
```

## OpenTelemetry

Use `onHandlerStart` / `onHandlerEnd` to wrap handlers in spans or record events on an active shutdown span.
