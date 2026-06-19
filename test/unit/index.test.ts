import { describe, expect, it } from 'vitest';
import * as lastcall from '../../src/index.js';

describe('package exports', () => {
  it('re-exports public API from index', () => {
    expect(typeof lastcall.createLastcall).toBe('function');
    expect(typeof lastcall.getDefaultLastcall).toBe('function');
    expect(typeof lastcall.resetDefaultLastcall).toBe('function');
    expect(lastcall.TopologicalSortError).toBeDefined();
    expect(lastcall.DEFAULT_PHASES).toEqual(['pre', 'drain', 'cleanup', 'post']);
    expect(lastcall.DEFAULT_SIGNALS).toEqual(['SIGTERM', 'SIGINT', 'SIGHUP']);
  });
});
