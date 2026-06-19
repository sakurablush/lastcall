# Architecture overview

lastcall is a **zero-dependency** TypeScript library with a small internal architecture:

```
createLastcall()
    ├── HandlerRegistry     — stores handlers, priority, deps, phases
    ├── SignalListener      — SIGTERM / SIGINT / SIGHUP
    ├── LastcallEvents      — beforeShutdown, afterShutdown, handler events
    └── shutdown-runner     — phase execution, timeouts, HTTP drain
```

## Singleton

`getDefaultLastcall()` returns a process-wide singleton via `globalThis` — safe when the module is imported multiple times.

## State machine

```
idle → shutting_down → [phases] → done | force_exit
```

During shutdown, subsequent signals are ignored (idempotent).

## Module map

| File                        | Responsibility                         |
| --------------------------- | -------------------------------------- |
| `create-lastcall.ts`        | Public factory, options, orchestration |
| `handler-registry.ts`       | Register handlers, topo sort, batches  |
| `shutdown-runner.ts`        | Run phases, timeouts, HTTP handler     |
| `signal-listener.ts`        | OS signal registration                 |
| `events.ts`                 | Typed event emitter                    |
| `utils/topological-sort.ts` | Dependency ordering                    |
| `utils/singleton.ts`        | Global singleton                       |
| `utils/logger.ts`           | Default `[lastcall]` logger            |

## Design principles

1. **Zero production dependencies**
2. **Fail-safe** — listener errors never break shutdown
3. **Explicit phases** — drain before cleanup
4. **Escape hatches** — custom `exit`, `logger`, `autoExit: false`

See [Shutdown lifecycle](/architecture/shutdown-lifecycle) for the full flow.
