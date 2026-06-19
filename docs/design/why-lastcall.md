# Why lastcall?

## The problem

Production Node.js apps receive **SIGTERM** when:

- Kubernetes deletes a pod
- Docker stops a container
- PM2 reloads a worker
- You press Ctrl+C locally

Without graceful shutdown:

- In-flight HTTP requests are dropped
- Database connections leak
- Queue consumers stop mid-job
- Exit codes are wrong for orchestrators

## Why not custom signal handlers?

Every team writes the same buggy code:

```ts
process.on('SIGTERM', async () => {
  server.close();
  await db.end();
  process.exit(0);
});
```

Problems:

- Not idempotent (double SIGTERM breaks things)
- No ordering between cleanups
- No global timeout (hangs forever)
- Hard to test
- No metrics

## Why lastcall?

| Feature                | Custom code | lastcall                              |
| ---------------------- | ----------- | ------------------------------------- |
| Idempotent shutdown    | Manual      | Built-in                              |
| Handler ordering       | Manual      | Priority + deps                       |
| Phases (drain/cleanup) | Manual      | Built-in                              |
| HTTP drain             | Manual      | `withHttpServer()`                    |
| Per-handler timeout    | Rarely      | `timeoutMs`                           |
| Global timeout         | Rarely      | `shutdownTimeoutMs`                   |
| Test utilities         | None        | `autoExit: false`, `simulateSignal()` |
| Zero dependencies      | ✓           | ✓                                     |

## The name

**lastcall** = "last call" at the bar. Finish your drinks (in-flight requests), then we close.

Short, memorable, and npm-available.

## Alternatives considered

- `lifeline` — taken on npm (unshiftio)
- `graceful-shutdown-*` — crowded namespace
- `prestop` — too Kubernetes-specific

## Ecosystem comparison

| Library                                                              | Phases | Deps | HTTP drain | Zero deps | Test helpers                        |
| -------------------------------------------------------------------- | ------ | ---- | ---------- | --------- | ----------------------------------- |
| **lastcall**                                                         | ✓      | ✓    | ✓          | ✓         | `simulateSignal`, `autoExit: false` |
| [close-with-grace](https://www.npmjs.com/package/close-with-grace)   | —      | —    | partial    | ✓         | delay option                        |
| [@godaddy/terminus](https://www.npmjs.com/package/@godaddy/terminus) | —      | —    | ✓          | ✗         | health hooks                        |

lastcall targets teams that want **phased shutdown**, **dependency ordering**, and **first-class testability** without pulling in framework-specific glue.
