const LASTCALL_SINGLETON_KEY = Symbol.for('lastcall.default');
const LASTCALL_SINGLETON_INITIALIZED = Symbol.for('lastcall.default.initialized');

export function getGlobalSingleton<T>(key: symbol, factory: () => T): T {
  const globalStore = globalThis as typeof globalThis & {
    [k: symbol]: T | undefined;
  };

  if (!globalStore[key]) {
    globalStore[key] = factory();
  }

  return globalStore[key];
}

/** @internal Reset process-wide singleton — for tests only */
export function resetGlobalLastcall(): void {
  const globalStore = globalThis as typeof globalThis & {
    [LASTCALL_SINGLETON_KEY]?: unknown;
    [LASTCALL_SINGLETON_INITIALIZED]?: boolean;
  };
  delete globalStore[LASTCALL_SINGLETON_KEY];
  delete globalStore[LASTCALL_SINGLETON_INITIALIZED];
}

export { LASTCALL_SINGLETON_KEY, LASTCALL_SINGLETON_INITIALIZED };
