# Windows

lastcall runs on Windows with these notes:

## SIGINT

Ctrl+C sends **SIGINT** — fully supported.

## SIGTERM

`SIGTERM` support on Windows depends on how the process is started. Docker Desktop and WSL2 behave like Linux.

## SIGHUP

Not available on Windows — safely skipped during signal registration.

## Testing

All tests pass on Windows. Integration tests use IPC (not OS signals) for cross-platform reliability.

## Recommendation

For local Windows development, use:

```ts
createLastcall({ signals: ['SIGINT'] });
```

Production containers (Linux) should use the default signal list.
