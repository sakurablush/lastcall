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

GitHub Actions runs a dedicated **Bun compatibility** job (`npm test` + `npm run build`) alongside the main Node 22 merge gate. See [CI and automation](/contributing/ci-and-automation).
