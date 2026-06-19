/**
 * Verification matrix — maps every public feature to its test file(s).
 * Ensures referenced test files exist and contain expected feature keywords.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logStep } from './helpers/test-logger.js';

const FEATURE_MATRIX = [
  {
    feature: 'createLastcall()',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['createLastcall'],
  },
  {
    feature: 'getDefaultLastcall()',
    tests: ['test/unit/create-lastcall.test.ts', 'test/unit/singleton.test.ts'],
    keywords: ['getDefaultLastcall'],
  },
  {
    feature: 'register() / unregister()',
    tests: ['test/unit/handler-registry.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['register', 'unregister'],
  },
  {
    feature: 'shutdown() idempotency',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['idempotent'],
  },
  {
    feature: 'shutdown phases (pre/drain/cleanup/post)',
    tests: ['test/unit/shutdown-runner.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['phase'],
  },
  {
    feature: 'priority ordering',
    tests: ['test/unit/handler-registry.test.ts'],
    keywords: ['priority'],
  },
  {
    feature: 'dependency graph + topo sort',
    tests: ['test/unit/topological-sort.test.ts', 'test/unit/handler-registry.test.ts'],
    keywords: ['deps', 'TopologicalSortError'],
  },
  {
    feature: 'per-handler timeout',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['timeoutMs'],
  },
  {
    feature: 'global shutdown timeout',
    tests: ['test/unit/shutdown-runner.test.ts'],
    keywords: ['shutdownTimeoutMs'],
  },
  {
    feature: 'critical vs non-critical exit codes',
    tests: ['test/unit/shutdown-runner.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['critical'],
  },
  {
    feature: 'signal handling (SIGTERM/SIGINT/SIGHUP)',
    tests: ['test/unit/signal-listener.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['SIGTERM'],
  },
  {
    feature: 'simulateSignal()',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['simulateSignal'],
  },
  {
    feature: 'withHttpServer() + drain',
    tests: ['test/unit/shutdown-runner.test.ts', 'test/integration/integration.test.ts'],
    keywords: ['withHttpServer', 'http-drain'],
  },
  {
    feature: 'lifecycle events',
    tests: ['test/unit/events.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['beforeShutdown', 'afterShutdown'],
  },
  {
    feature: 'metrics hooks (onHandlerStart/End)',
    tests: ['test/unit/shutdown-runner.test.ts'],
    keywords: ['onHandlerStart'],
  },
  {
    feature: 'uncaughtException capture',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['uncaughtException'],
  },
  {
    feature: 'unhandledRejection capture',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['unhandledRejection'],
  },
  {
    feature: 'autoExit + custom exit()',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['autoExit'],
  },
  {
    feature: 'default logger',
    tests: ['test/unit/logger.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['defaultLastcallLogger', 'default logger'],
  },
  {
    feature: 'HandlerContext (reason, signal, phase, abortSignal)',
    tests: ['test/unit/create-lastcall.test.ts', 'test/unit/shutdown-runner.test.ts'],
    keywords: ['abortSignal'],
  },
  {
    feature: 'child process IPC integration',
    tests: ['test/integration/integration.test.ts'],
    keywords: ['child_process'],
  },
  {
    feature: 'OS signal shutdown (SIGTERM) in child',
    tests: ['test/integration/integration.test.ts'],
    keywords: ['signal-os-shutdown', 'SIGTERM', 'SIGINT'],
  },
  {
    feature: 'shared fixture runner (runFixture)',
    tests: ['test/integration/integration.test.ts'],
    keywords: ['runFixture'],
  },
  {
    feature: 'package public exports',
    tests: ['test/unit/index.test.ts'],
    keywords: ['createLastcall'],
  },
  {
    feature: 'cross-phase dependency validation',
    tests: ['test/unit/handler-registry.test.ts'],
    keywords: ['cross-phase', 'same phase'],
  },
  {
    feature: 'register/unregister blocked during shutdown',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['shutdown is in progress'],
  },
  {
    feature: 'TopologicalSortError export',
    tests: ['test/unit/index.test.ts'],
    keywords: ['TopologicalSortError'],
  },
  {
    feature: 'process listener cleanup after shutdown',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['disposes signal listeners'],
  },
  {
    feature: 'async handler failures',
    tests: ['test/unit/shutdown-runner.test.ts', 'test/unit/create-lastcall.test.ts'],
    keywords: ['async'],
  },
  {
    feature: 'handler overwrite semantics',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['overwritten', 'overwrite'],
  },
  {
    feature: 'lifecycle state (getState / isShutdownComplete)',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['isShutdownComplete', 'getState'],
  },
  {
    feature: 'missing dependency registration warning',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['not registered yet'],
  },
  {
    feature: 'shutdown error summary logging',
    tests: ['test/unit/shutdown-runner.test.ts'],
    keywords: ['handler error(s)'],
  },
  {
    feature: 'dependency name validation (self/duplicate/whitespace)',
    tests: ['test/unit/handler-registry.test.ts'],
    keywords: ['depend on itself', 'duplicate dependency'],
  },
  {
    feature: 'inactive phase registration warning',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['not included in configured phases'],
  },
  {
    feature: 'handler introspection (hasHandler / listHandlers)',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['hasHandler', 'listHandlers'],
  },
  {
    feature: 'resetDefaultLastcall() test helper',
    tests: ['test/unit/create-lastcall.test.ts', 'test/unit/index.test.ts'],
    keywords: ['resetDefaultLastcall'],
  },
  {
    feature: 'signal deduplication',
    tests: ['test/unit/create-lastcall.test.ts'],
    keywords: ['deduplicates duplicate signals'],
  },
  {
    feature: 'late handler rejection swallowing',
    tests: ['test/unit/shutdown-runner.test.ts'],
    keywords: ['late handler rejections'],
  },
] as const;

describe('verification matrix', () => {
  it('documents full feature coverage', () => {
    logStep('feature matrix', { count: FEATURE_MATRIX.length });
    expect(FEATURE_MATRIX.length).toBeGreaterThanOrEqual(20);
  });

  it('every feature maps to at least one test file', () => {
    for (const row of FEATURE_MATRIX) {
      expect(row.tests.length).toBeGreaterThan(0);
      for (const file of row.tests) {
        expect(file).toMatch(/\.test\.ts$/);
      }
    }
  });

  it('every referenced test file exists on disk', () => {
    for (const row of FEATURE_MATRIX) {
      for (const file of row.tests) {
        expect(existsSync(join(process.cwd(), file))).toBe(true);
      }
    }
  });

  it('referenced test files mention feature keywords', () => {
    for (const row of FEATURE_MATRIX) {
      const content = row.tests
        .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
        .join('\n');

      const matched = row.keywords.some((keyword) => content.includes(keyword));
      expect(
        matched,
        `no keyword from [${row.keywords.join(', ')}] in ${row.tests.join(', ')}`,
      ).toBe(true);
    }
  });
});
