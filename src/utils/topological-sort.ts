export class TopologicalSortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopologicalSortError';
  }
}

/**
 * Returns handler names in dependency order (dependencies first).
 * Throws if a cycle is detected or a dependency is missing.
 */
export function topologicalSort(names: string[], depsMap: Map<string, string[]>): string[] {
  const nameSet = new Set(names);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const name of names) {
    inDegree.set(name, 0);
    adjacency.set(name, []);
  }

  for (const name of names) {
    const deps = depsMap.get(name) ?? [];
    for (const dep of deps) {
      if (!nameSet.has(dep)) {
        throw new TopologicalSortError(`Handler "${name}" depends on unknown handler "${dep}"`);
      }
      adjacency.get(dep)!.push(name);
      inDegree.set(name, inDegree.get(name)! + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    queue.sort();
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current)!) {
      const nextDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== names.length) {
    throw new TopologicalSortError('Circular dependency detected between handlers');
  }

  return sorted;
}

/**
 * Groups handlers into execution waves based on dependencies.
 * Handlers in the same wave can run in parallel.
 */
export function groupIntoWaves(names: string[], depsMap: Map<string, string[]>): string[][] {
  const order = topologicalSort(names, depsMap);
  const position = new Map(order.map((name, index) => [name, index]));
  const waves: string[][] = [];
  const waveIndex = new Map<string, number>();

  for (const name of order) {
    const deps = depsMap.get(name) ?? [];
    let maxDepWave = -1;

    for (const dep of deps) {
      const depWave = waveIndex.get(dep);
      if (depWave !== undefined) {
        maxDepWave = Math.max(maxDepWave, depWave);
      }
    }

    const wave = maxDepWave + 1;
    waveIndex.set(name, wave);

    if (!waves[wave]) {
      waves[wave] = [];
    }

    waves[wave].push(name);
  }

  for (const wave of waves) {
    wave.sort((a, b) => position.get(a)! - position.get(b)!);
  }

  return waves.filter(Boolean);
}
