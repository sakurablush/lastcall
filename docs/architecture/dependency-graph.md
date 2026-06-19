# Dependency graph

Handlers can declare dependencies on other handlers by name:

```ts
lastcall.register(
  'database',
  async () => {
    await db.disconnect();
  },
  { phase: 'cleanup' },
);

lastcall.register(
  'api',
  async () => {
    await api.close();
  },
  { phase: 'cleanup', deps: ['database'] },
);
```

`api` will not start until `database` completes.

## Parallel execution

Independent handlers run in parallel within the same dependency wave:

```ts
lastcall.register('redis', async () => {}, { deps: [] });
lastcall.register('cache', async () => {}, { deps: [] });
lastcall.register('app', async () => {}, { deps: ['redis', 'cache'] });
```

Wave 1: `redis` + `cache` (parallel)  
Wave 2: `app`

## Circular dependencies

Circular deps throw at execution time:

```
Handler "a" depends on "b" which depends on "a"
→ TopologicalSortError
```

## Cross-phase dependencies

Dependencies only apply **within the same phase**. Registering a cross-phase dependency throws immediately — including when the dependent handler was registered first.

Phases still run in order (`pre` → `drain` → `cleanup` → `post`), so use phase assignment instead of cross-phase `deps`.
