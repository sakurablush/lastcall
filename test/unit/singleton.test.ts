import { describe, expect, it, afterEach } from 'vitest';
import {
  getGlobalSingleton,
  LASTCALL_SINGLETON_KEY,
  resetGlobalLastcall,
} from '../../src/utils/singleton.js';
import { logProof } from '../helpers/test-logger.js';

describe('singleton', () => {
  afterEach(() => {
    resetGlobalLastcall();
  });
  it('returns the same instance from global singleton', () => {
    const key = Symbol.for('test.singleton.unique');
    const a = getGlobalSingleton(key, () => ({ id: 1 }));
    const b = getGlobalSingleton(key, () => ({ id: 2 }));
    expect(a).toBe(b);
    expect(a.id).toBe(1);
    logProof('singleton returns first factory result', { a, bSame: a === b });
  });

  it('exports LASTCALL_SINGLETON_KEY symbol', () => {
    expect(typeof LASTCALL_SINGLETON_KEY).toBe('symbol');
    expect(Symbol.for('lastcall.default')).toBe(LASTCALL_SINGLETON_KEY);
  });

  it('resetGlobalLastcall clears the process-wide instance', () => {
    resetGlobalLastcall();
    expect((globalThis as Record<symbol, unknown>)[LASTCALL_SINGLETON_KEY]).toBeUndefined();
  });
});
