# Bun

lastcall works with Bun. Use the same API:

```ts
import { createLastcall } from 'lastcall';

const lastcall = createLastcall();
```

## Differences

- Signal handling may differ slightly from Node.js
- `SIGHUP` availability varies by platform
- Test with `bun test` or `npm test` (Vitest)

## CI

GitHub Actions runs the test matrix on Bun alongside Node 18/20/22.
