import type { HandlerOptions, HandlerSummary, RegisteredHandler, ShutdownPhase } from './types.js';
import { groupIntoWaves, topologicalSort } from './utils/topological-sort.js';

const DEFAULT_PRIORITY = 100;
const DEFAULT_PHASE: ShutdownPhase = 'cleanup';

export class HandlerRegistry {
  private readonly handlers = new Map<string, RegisteredHandler>();

  register(name: string, fn: RegisteredHandler['fn'], options: HandlerOptions = {}): void {
    if (!name || typeof name !== 'string' || name.trim() !== name || name.trim().length === 0) {
      throw new TypeError(
        'Handler name must be a non-empty string without leading or trailing whitespace',
      );
    }

    if (typeof fn !== 'function') {
      throw new TypeError(`Handler "${name}" must be a function`);
    }

    if (
      options.timeoutMs !== undefined &&
      (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 0)
    ) {
      throw new RangeError(`Handler "${name}" timeoutMs must be a finite number >= 0`);
    }

    const phase = options.phase ?? DEFAULT_PHASE;
    const deps = normalizeDeps(name, options.deps);
    const priority = options.priority ?? DEFAULT_PRIORITY;

    if (!Number.isFinite(priority)) {
      throw new RangeError(`Handler "${name}" priority must be a finite number`);
    }

    for (const dep of deps) {
      const existing = this.handlers.get(dep);
      if (existing && existing.phase !== phase) {
        throw new Error(
          `Handler "${name}" (phase "${phase}") cannot depend on "${dep}" (phase "${existing.phase}") — deps must be in the same phase`,
        );
      }
    }

    for (const existing of this.handlers.values()) {
      if (existing.name === name) {
        continue;
      }
      if (existing.deps.includes(name) && existing.phase !== phase) {
        throw new Error(
          `Handler "${name}" (phase "${phase}") cannot be registered — "${existing.name}" (phase "${existing.phase}") already depends on it`,
        );
      }
    }

    this.handlers.set(name, {
      name,
      fn,
      priority,
      timeoutMs: options.timeoutMs,
      critical: options.critical ?? false,
      deps,
      phase,
    });
  }

  unregister(name: string): boolean {
    if (!this.handlers.has(name)) {
      return false;
    }

    for (const handler of this.handlers.values()) {
      if (handler.name !== name && handler.deps.includes(name)) {
        throw new Error(`Cannot unregister "${name}" — handler "${handler.name}" depends on it`);
      }
    }

    return this.handlers.delete(name);
  }

  get(name: string): RegisteredHandler | undefined {
    return this.handlers.get(name);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  listSummaries(): HandlerSummary[] {
    return [...this.handlers.values()].map((handler) => ({
      name: handler.name,
      phase: handler.phase,
      priority: handler.priority,
      critical: handler.critical,
      deps: [...handler.deps],
      ...(handler.timeoutMs !== undefined ? { timeoutMs: handler.timeoutMs } : {}),
    }));
  }

  getForPhase(phase: ShutdownPhase): RegisteredHandler[] {
    const handlers = [...this.handlers.values()].filter((h) => h.phase === phase);

    if (handlers.length === 0) {
      return [];
    }

    const names = handlers.map((h) => h.name);
    const depsMap = new Map(handlers.map((h) => [h.name, h.deps]));

    const order = topologicalSort(names, depsMap);
    const byName = new Map(handlers.map((h) => [h.name, h]));
    return order.map((name) => byName.get(name)!);
  }

  /**
   * Groups handlers into priority batches within dependency waves.
   */
  getExecutionBatches(phase: ShutdownPhase): RegisteredHandler[][] {
    const handlers = this.getForPhase(phase);
    if (handlers.length === 0) {
      return [];
    }

    const names = handlers.map((h) => h.name);
    const depsMap = new Map(handlers.map((h) => [h.name, h.deps]));
    const byName = new Map(handlers.map((h) => [h.name, h]));

    const waves = groupIntoWaves(names, depsMap);
    const batches: RegisteredHandler[][] = [];

    for (const wave of waves) {
      const waveHandlers = wave.map((name) => byName.get(name)!);
      waveHandlers.sort((a, b) => a.priority - b.priority);

      let currentPriority: number | null = null;
      let currentBatch: RegisteredHandler[] = [];

      for (const handler of waveHandlers) {
        if (currentPriority !== null && handler.priority !== currentPriority) {
          batches.push(currentBatch);
          currentBatch = [];
        }
        currentPriority = handler.priority;
        currentBatch.push(handler);
      }

      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
    }

    return batches;
  }

  clear(): void {
    this.handlers.clear();
  }
}

function normalizeDeps(name: string, deps: string[] | undefined): string[] {
  if (!deps) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const dep of deps) {
    if (!dep || typeof dep !== 'string' || dep.trim() !== dep || dep.trim().length === 0) {
      throw new TypeError(`Handler "${name}" has an invalid dependency name`);
    }

    if (dep === name) {
      throw new Error(`Handler "${name}" cannot depend on itself`);
    }

    if (seen.has(dep)) {
      throw new TypeError(`Handler "${name}" has duplicate dependency "${dep}"`);
    }

    seen.add(dep);
    normalized.push(dep);
  }

  return normalized;
}
