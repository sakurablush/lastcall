import { describe, expect, it } from 'vitest';
import {
  groupIntoWaves,
  topologicalSort,
  TopologicalSortError,
} from '../../src/utils/topological-sort.js';
import { logProof, logStep } from '../helpers/test-logger.js';

describe('topologicalSort', () => {
  it('orders handlers by dependencies', () => {
    const names = ['c', 'a', 'b'];
    const deps = new Map([
      ['a', []],
      ['b', ['a']],
      ['c', ['b']],
    ]);

    const order = topologicalSort(names, deps);
    logStep('topological order computed', { order });
    expect(order).toEqual(['a', 'b', 'c']);
    logProof('dependencies run before dependents', order);
  });

  it('handles handlers with no entry in depsMap', () => {
    const deps = new Map<string, string[]>();
    const order = topologicalSort(['solo'], deps);
    expect(order).toEqual(['solo']);
    logProof('missing depsMap entry defaults to no deps', order);
  });

  it('throws on unknown dependency', () => {
    const deps = new Map([['a', ['missing']]]);
    expect(() => topologicalSort(['a'], deps)).toThrow(TopologicalSortError);
    logProof('unknown dependency rejected', 'TopologicalSortError');
  });

  it('throws on circular dependency', () => {
    const deps = new Map([
      ['a', ['b']],
      ['b', ['a']],
    ]);
    expect(() => topologicalSort(['a', 'b'], deps)).toThrow(TopologicalSortError);
    logProof('cycle detected', 'TopologicalSortError');
  });

  it('sorts queue alphabetically for deterministic order', () => {
    const deps = new Map([
      ['b', []],
      ['a', []],
    ]);
    expect(topologicalSort(['b', 'a'], deps)).toEqual(['a', 'b']);
  });
});

describe('groupIntoWaves', () => {
  it('groups independent handlers into the same wave', () => {
    const deps = new Map([
      ['a', []],
      ['b', []],
      ['c', ['a', 'b']],
    ]);
    const waves = groupIntoWaves(['a', 'b', 'c'], deps);
    logStep('execution waves', { waves });
    expect(waves).toEqual([['a', 'b'], ['c']]);
    logProof('parallel wave contains independent handlers', waves[0]);
  });

  it('handles deps not present in waveIndex', () => {
    const deps = new Map([['a', ['external']]]);
    expect(() => groupIntoWaves(['a'], deps)).toThrow(TopologicalSortError);
  });

  it('uses depsMap entries when present in groupIntoWaves', () => {
    const deps = new Map([
      ['a', []],
      ['b', ['a']],
    ]);
    expect(groupIntoWaves(['a', 'b'], deps)).toEqual([['a'], ['b']]);
  });

  it('defaults missing depsMap keys to empty deps', () => {
    expect(groupIntoWaves(['solo'], new Map())).toEqual([['solo']]);
  });
});

describe('TopologicalSortError', () => {
  it('has correct name', () => {
    const err = new TopologicalSortError('test');
    expect(err.name).toBe('TopologicalSortError');
    expect(err.message).toBe('test');
  });
});
