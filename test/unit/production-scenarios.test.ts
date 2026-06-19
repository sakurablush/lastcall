/**
 * Realistic production scenarios — Kubernetes-style shutdown, dependency graphs,
 * cooperative abort, and negative paths that must not corrupt orchestration.
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { createLastcall } from '../../src/create-lastcall.js';
import { HandlerRegistry } from '../../src/handler-registry.js';
import { runShutdown } from '../../src/shutdown-runner.js';
import { LastcallEvents } from '../../src/events.js';
import type { ResolvedLastcallOptions } from '../../src/types.js';
import { logProof } from '../helpers/test-logger.js';

function createTestLastcall(overrides: Parameters<typeof createLastcall>[0] = {}) {
  return createLastcall({
    autoExit: false,
    signals: [],
    logger: () => {},
    ...overrides,
  });
}

describe('production scenarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('runs full Kubernetes-style lifecycle: pre → drain → cleanup → post', async () => {
    const timeline: string[] = [];
    let acceptingTraffic = true;
    let inFlight = 2;

    const lastcall = createTestLastcall();

    lastcall.register(
      'health',
      async () => {
        acceptingTraffic = false;
        timeline.push('pre:health');
      },
      { phase: 'pre', priority: 1 },
    );

    lastcall.withHttpServer(
      {
        closeIdleConnections: vi.fn(),
        close: (cb) => {
          timeline.push('drain:http-close-called');
          setTimeout(() => {
            inFlight = 0;
            timeline.push('drain:http-closed');
            cb?.();
          }, 10);
        },
      },
      { phase: 'drain', priority: 10 },
    );

    lastcall.register(
      'queue',
      async () => {
        timeline.push('cleanup:queue');
      },
      { phase: 'cleanup', priority: 20, deps: ['database'] },
    );

    lastcall.register(
      'database',
      async () => {
        timeline.push('cleanup:database');
      },
      { phase: 'cleanup', priority: 10, critical: true },
    );

    lastcall.register(
      'metrics',
      async () => {
        timeline.push('post:metrics');
      },
      { phase: 'post', priority: 5 },
    );

    expect(acceptingTraffic).toBe(true);
    expect(inFlight).toBe(2);

    const code = await lastcall.shutdown('SIGTERM', 'SIGTERM');

    expect(code).toBe(0);
    expect(acceptingTraffic).toBe(false);
    expect(inFlight).toBe(0);
    expect(timeline).toEqual([
      'pre:health',
      'drain:http-close-called',
      'drain:http-closed',
      'cleanup:database',
      'cleanup:queue',
      'post:metrics',
    ]);
    logProof('k8s lifecycle order', timeline);
  });

  it('drains in-flight work cooperatively via abortSignal before global timeout', async () => {
    vi.useFakeTimers();

    const lastcall = createTestLastcall({ shutdownTimeoutMs: 5_000 });
    const activeJobs = new Set(['job-1', 'job-2']);
    const drained: string[] = [];

    lastcall.register(
      'stop-accepting',
      async () => {
        drained.push('pre');
      },
      { phase: 'pre' },
    );

    lastcall.register(
      'job-drain',
      (ctx) =>
        new Promise<void>((resolve) => {
          drained.push('drain:started');
          ctx.abortSignal.addEventListener(
            'abort',
            () => {
              activeJobs.clear();
              drained.push('drain:aborted');
              resolve();
            },
            { once: true },
          );
        }),
      { phase: 'drain', timeoutMs: 100 },
    );

    const shutdownPromise = lastcall.shutdown('pod-delete');
    await vi.advanceTimersByTimeAsync(150);
    const code = await shutdownPromise;

    expect(code).toBe(0);
    expect(activeJobs.size).toBe(0);
    expect(drained).toEqual(['pre', 'drain:started', 'drain:aborted']);
  });

  it('executes diamond dependency graph in correct waves', async () => {
    const registry = new HandlerRegistry();
    const order: string[] = [];

    registry.register(
      'database',
      () => {
        order.push('database');
      },
      { phase: 'cleanup' },
    );
    registry.register(
      'cache',
      () => {
        order.push('cache');
      },
      { phase: 'cleanup', deps: ['database'] },
    );
    registry.register(
      'queue',
      () => {
        order.push('queue');
      },
      { phase: 'cleanup', deps: ['database'] },
    );
    registry.register(
      'api',
      () => {
        order.push('api');
      },
      { phase: 'cleanup', deps: ['cache', 'queue'] },
    );

    const batches = registry
      .getExecutionBatches('cleanup')
      .map((batch) => batch.map((h) => h.name));

    expect(batches).toEqual([['database'], ['cache', 'queue'], ['api']]);

    const events = new LastcallEvents();
    const options: ResolvedLastcallOptions = {
      signals: [],
      shutdownTimeoutMs: 5_000,
      phases: ['cleanup'],
      captureUncaughtException: false,
      captureUnhandledRejection: false,
      logger: vi.fn(),
      autoExit: false,
    };

    await runShutdown(
      {
        registry,
        events,
        options,
        exitFn: ((code: number) => {
          throw new Error(`exit:${code}`);
        }) as (code: number) => never,
      },
      'test',
    );

    expect(order.indexOf('database')).toBeLessThan(order.indexOf('cache'));
    expect(order.indexOf('database')).toBeLessThan(order.indexOf('queue'));
    expect(order.indexOf('cache')).toBeLessThan(order.indexOf('api'));
    expect(order.indexOf('queue')).toBeLessThan(order.indexOf('api'));
  });

  it('returns exit code 1 when parallel batch has a critical failure but still runs siblings', async () => {
    const lastcall = createTestLastcall();
    const ran: string[] = [];

    lastcall.register(
      'ok',
      async () => {
        await Promise.resolve();
        ran.push('ok');
      },
      { phase: 'cleanup', priority: 10 },
    );
    lastcall.register(
      'critical-fail',
      () => {
        ran.push('critical-fail');
        throw new Error('redis disconnect failed');
      },
      { phase: 'cleanup', priority: 10, critical: true },
    );

    const code = await lastcall.shutdown('test');

    expect(code).toBe(1);
    expect(ran.sort()).toEqual(['critical-fail', 'ok']);
  });

  it('ignores a second SIGTERM while shutdown is already in progress', async () => {
    vi.useFakeTimers();

    const lastcall = createTestLastcall({
      signals: ['SIGTERM'],
      shutdownTimeoutMs: 5_000,
    });
    const handler = vi.fn();

    lastcall.register('cleanup', () => new Promise(() => {}));
    lastcall.register('once', handler, { phase: 'post' });

    lastcall.simulateSignal('SIGTERM');
    await vi.waitFor(() => expect(lastcall.isShuttingDown()).toBe(true));

    lastcall.simulateSignal('SIGTERM');
    await vi.advanceTimersByTimeAsync(5_000);

    expect(handler).not.toHaveBeenCalled();
  });

  it('shuts down cleanly with zero registered handlers', async () => {
    const lastcall = createTestLastcall();
    const before = vi.fn();
    const after = vi.fn();

    lastcall.on('beforeShutdown', before);
    lastcall.on('afterShutdown', after);

    expect(await lastcall.shutdown('empty')).toBe(0);
    expect(before).toHaveBeenCalledOnce();
    expect(after).toHaveBeenCalledWith({ exitCode: 0 });
    expect(lastcall.getState()).toBe('done');
  });

  it('allows introspection during shutdown but blocks new registrations', async () => {
    vi.useFakeTimers();

    const lastcall = createTestLastcall({ shutdownTimeoutMs: 5_000 });
    lastcall.register('blocker', () => new Promise(() => {}), { phase: 'cleanup' });

    void lastcall.shutdown('test');
    await vi.waitFor(() => expect(lastcall.isShuttingDown()).toBe(true));

    expect(lastcall.hasHandler('blocker')).toBe(true);
    expect(lastcall.listHandlers()).toEqual([
      expect.objectContaining({ name: 'blocker', phase: 'cleanup' }),
    ]);
    expect(() => lastcall.register('late', vi.fn())).toThrow(/shutdown is in progress/);

    await vi.advanceTimersByTimeAsync(5_000);
  });

  it('records handler durationMs in metrics hooks for async handlers', async () => {
    const onEnd = vi.fn();
    const lastcall = createTestLastcall({ onHandlerEnd: onEnd });

    lastcall.register('async', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    await lastcall.shutdown('test');

    expect(onEnd).toHaveBeenCalledWith(
      'async',
      expect.objectContaining({
        durationMs: expect.any(Number),
        phase: 'cleanup',
      }),
    );
    expect(onEnd.mock.calls[0]![1].durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('production scenarios — negative paths', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rejects invalid handler at registration before shutdown starts', () => {
    const lastcall = createTestLastcall();

    expect(() => lastcall.register('', vi.fn())).toThrow(TypeError);
    expect(() => lastcall.register('bad', null as never)).toThrow(TypeError);
    expect(() => lastcall.register('self', vi.fn(), { deps: ['self'] })).toThrow(
      /depend on itself/,
    );
  });

  it('rejects cross-phase dependency chains that violate phase boundaries', () => {
    const lastcall = createTestLastcall();

    lastcall.register('http', vi.fn(), { phase: 'drain' });

    expect(() =>
      lastcall.register('db', vi.fn(), {
        phase: 'cleanup',
        deps: ['http'],
      }),
    ).toThrow(/same phase/);
  });

  it('returns exit code 1 for unknown dependency at shutdown without running orphan', async () => {
    const lastcall = createTestLastcall();
    const orphan = vi.fn();

    lastcall.register('orphan', orphan, { deps: ['ghost'] });

    expect(await lastcall.shutdown('test')).toBe(1);
    expect(orphan).not.toHaveBeenCalled();
  });

  it('treats timeoutMs 0 as unlimited until global shutdown timeout', async () => {
    vi.useFakeTimers();

    const lastcall = createTestLastcall({ shutdownTimeoutMs: 200 });
    const handler = vi.fn(() => new Promise(() => {}));

    lastcall.register('hang', handler, { timeoutMs: 0 });

    const promise = lastcall.shutdown('test');
    await vi.advanceTimersByTimeAsync(250);

    expect(await promise).toBe(1);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call process.exit when autoExit is false even after critical failure', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);
    const lastcall = createTestLastcall();

    lastcall.register(
      'fail',
      () => {
        throw new Error('critical');
      },
      { critical: true },
    );

    expect(await lastcall.shutdown('test')).toBe(1);
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('simulateSignal still works when signals array is empty (test path)', async () => {
    const lastcall = createTestLastcall({ signals: [] });
    const handler = vi.fn();

    lastcall.register('cleanup', handler);
    lastcall.simulateSignal('SIGTERM');

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
  });

  it('emits handlerCompleted with error for failed handlers', async () => {
    const lastcall = createTestLastcall();
    const completed = vi.fn();

    lastcall.on('handlerCompleted', completed);
    lastcall.register('bad', () => {
      throw new Error('cleanup failed');
    });

    await lastcall.shutdown('test');

    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bad',
        error: expect.objectContaining({ message: 'cleanup failed' }),
      }),
    );
  });
});

describe('production scenarios — HTTP under load', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for server.close callback before advancing to cleanup phase', async () => {
    const timeline: string[] = [];
    let closeCallback: ((err?: Error) => void) | undefined;

    const lastcall = createTestLastcall({
      phases: ['drain', 'cleanup'],
      shutdownTimeoutMs: 10_000,
    });

    lastcall.withHttpServer(
      {
        closeIdleConnections: vi.fn(),
        close: (cb) => {
          timeline.push('close-called');
          closeCallback = cb;
        },
      },
      { drainTimeoutMs: 5_000 },
    );

    lastcall.register(
      'database',
      async () => {
        timeline.push('database');
      },
      { phase: 'cleanup', critical: true },
    );

    const shutdownPromise = lastcall.shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(100);
    expect(timeline).toEqual(['close-called']);

    closeCallback?.();
    await shutdownPromise;

    expect(timeline).toEqual(['close-called', 'database']);
  });

  it('force-closes connections when drain exceeds drainTimeoutMs', async () => {
    const closeAllConnections = vi.fn();
    const lastcall = createTestLastcall({ phases: ['drain'] });

    lastcall.withHttpServer(
      {
        close: () => {},
        closeIdleConnections: vi.fn(),
        closeAllConnections,
      },
      { drainTimeoutMs: 1_000 },
    );

    const promise = lastcall.shutdown('test');
    await vi.advanceTimersByTimeAsync(1_100);
    expect(await promise).toBe(0);
    expect(closeAllConnections).toHaveBeenCalled();
  });
});
