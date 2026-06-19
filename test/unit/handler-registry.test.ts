import { describe, expect, it, vi } from 'vitest';
import { HandlerRegistry } from '../../src/handler-registry.js';
import { TopologicalSortError } from '../../src/utils/topological-sort.js';
import { logProof, logStep } from '../helpers/test-logger.js';

describe('HandlerRegistry', () => {
  it('registers, gets, and checks handlers', () => {
    const registry = new HandlerRegistry();
    const fn = vi.fn();
    registry.register('test', fn, { priority: 50 });

    expect(registry.get('test')?.priority).toBe(50);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('missing')).toBe(false);
    logProof('handler stored and retrievable', registry.get('test')?.name);
  });

  it('unregisters handlers', () => {
    const registry = new HandlerRegistry();
    registry.register('temp', vi.fn());
    expect(registry.unregister('temp')).toBe(true);
    expect(registry.unregister('temp')).toBe(false);
  });

  it('throws when unregistering a handler that others depend on', () => {
    const registry = new HandlerRegistry();
    registry.register('db', vi.fn(), { phase: 'cleanup' });
    registry.register('api', vi.fn(), { phase: 'cleanup', deps: ['db'] });

    expect(() => registry.unregister('db')).toThrow(/depends on it/);
    expect(registry.has('db')).toBe(true);
  });

  it('clears all handlers', () => {
    const registry = new HandlerRegistry();
    registry.register('a', vi.fn());
    registry.clear();
    expect(registry.has('a')).toBe(false);
    logProof('clear removes all handlers', registry.has('a'));
  });

  it('returns empty array for phase with no handlers', () => {
    const registry = new HandlerRegistry();
    expect(registry.getForPhase('pre')).toEqual([]);
    expect(registry.getExecutionBatches('drain')).toEqual([]);
  });

  it('orders handlers by priority within a phase', () => {
    const registry = new HandlerRegistry();
    registry.register('slow', vi.fn(), { priority: 200, phase: 'cleanup' });
    registry.register('fast', vi.fn(), { priority: 10, phase: 'cleanup' });

    const batches = registry.getExecutionBatches('cleanup');
    const names = batches.flat().map((h) => h.name);
    logStep('priority ordering', { names });
    expect(names).toEqual(['fast', 'slow']);
  });

  it('splits same wave into priority batches', () => {
    const registry = new HandlerRegistry();
    registry.register('p10', vi.fn(), { priority: 10, phase: 'cleanup' });
    registry.register('p20a', vi.fn(), { priority: 20, phase: 'cleanup' });
    registry.register('p20b', vi.fn(), { priority: 20, phase: 'cleanup' });

    const batches = registry.getExecutionBatches('cleanup');
    expect(batches).toHaveLength(2);
    expect(batches[0]!.map((h) => h.name)).toEqual(['p10']);
    expect(batches[1]!.map((h) => h.name).sort()).toEqual(['p20a', 'p20b']);
    logProof('same priority runs in parallel batch', batches[1]!.length);
  });

  it('respects dependencies across handlers', () => {
    const registry = new HandlerRegistry();
    registry.register('db', vi.fn(), { phase: 'cleanup' });
    registry.register('api', vi.fn(), { phase: 'cleanup', deps: ['db'] });

    const names = registry
      .getExecutionBatches('cleanup')
      .flat()
      .map((h) => h.name);
    expect(names.indexOf('db')).toBeLessThan(names.indexOf('api'));
    logProof('db runs before api', names);
  });

  it('throws TopologicalSortError on circular deps at execution time', () => {
    const registry = new HandlerRegistry();
    registry.register('a', vi.fn(), { phase: 'cleanup', deps: ['b'] });
    registry.register('b', vi.fn(), { phase: 'cleanup', deps: ['a'] });

    expect(() => registry.getForPhase('cleanup')).toThrow(TopologicalSortError);
    expect(() => registry.getExecutionBatches('cleanup')).toThrow(TopologicalSortError);
  });

  it('throws on invalid handler name', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('', vi.fn())).toThrow(TypeError);
    expect(() => registry.register('  spaced  ', vi.fn())).toThrow(TypeError);
  });

  it('throws on self-dependency', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('loop', vi.fn(), { deps: ['loop'] })).toThrow(
      /depend on itself/,
    );
  });

  it('throws on duplicate dependencies', () => {
    const registry = new HandlerRegistry();
    registry.register('db', vi.fn());
    expect(() => registry.register('api', vi.fn(), { deps: ['db', 'db'] })).toThrow(
      /duplicate dependency/,
    );
  });

  it('throws on invalid dependency name', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('api', vi.fn(), { deps: [''] })).toThrow(TypeError);
  });

  it('throws on non-finite priority', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('bad', vi.fn(), { priority: Number.NaN })).toThrow(RangeError);
  });

  it('throws on non-function handler', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('x', 'not-fn' as never)).toThrow(TypeError);
  });

  it('throws on negative timeoutMs', () => {
    const registry = new HandlerRegistry();
    expect(() => registry.register('slow', vi.fn(), { timeoutMs: -1 })).toThrow(RangeError);
    expect(() => registry.register('bad', vi.fn(), { timeoutMs: Number.NaN })).toThrow(RangeError);
  });

  it('copies deps array and applies defaults', () => {
    const registry = new HandlerRegistry();
    const deps = ['a'];
    registry.register('handler', vi.fn(), { deps });
    deps.push('b');

    const handler = registry.get('handler')!;
    expect(handler.deps).toEqual(['a']);
    expect(handler.priority).toBe(100);
    expect(handler.phase).toBe('cleanup');
    expect(handler.critical).toBe(false);
  });

  it('throws on cross-phase dependency at register time', () => {
    const registry = new HandlerRegistry();
    registry.register('drain-job', vi.fn(), { phase: 'drain' });

    expect(() =>
      registry.register('cleanup-job', vi.fn(), {
        phase: 'cleanup',
        deps: ['drain-job'],
      }),
    ).toThrow(/same phase/);
  });

  it('throws when dependent handler was registered first with cross-phase dep', () => {
    const registry = new HandlerRegistry();
    registry.register('cleanup-job', vi.fn(), { phase: 'cleanup', deps: ['database'] });

    expect(() => registry.register('database', vi.fn(), { phase: 'drain' })).toThrow(
      /already depends on it/,
    );
  });

  it('orders handlers when dependency is registered after dependent', () => {
    const registry = new HandlerRegistry();
    registry.register('api', vi.fn(), { deps: ['db'] });
    registry.register('db', vi.fn());

    const names = registry
      .getExecutionBatches('cleanup')
      .flat()
      .map((h) => h.name);
    expect(names.indexOf('db')).toBeLessThan(names.indexOf('api'));
  });
});
