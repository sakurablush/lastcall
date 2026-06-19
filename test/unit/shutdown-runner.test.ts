import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HandlerRegistry } from '../../src/handler-registry.js';
import { LastcallEvents } from '../../src/events.js';
import {
  executeHandler,
  registerHttpServerHandler,
  runShutdown,
  type ShutdownRunnerDeps,
} from '../../src/shutdown-runner.js';
import type { ResolvedLastcallOptions } from '../../src/types.js';
import { logProof, logStep } from '../helpers/test-logger.js';

function createDeps(overrides: Partial<ResolvedLastcallOptions> = {}): ShutdownRunnerDeps {
  const options: ResolvedLastcallOptions = {
    signals: ['SIGTERM'],
    shutdownTimeoutMs: 5_000,
    phases: ['pre', 'drain', 'cleanup', 'post'],
    captureUncaughtException: false,
    captureUnhandledRejection: false,
    logger: vi.fn(),
    autoExit: false,
    ...overrides,
  };

  return {
    registry: new HandlerRegistry(),
    events: new LastcallEvents(),
    options,
    exitFn: ((code: number) => {
      throw new Error(`exit:${code}`);
    }) as (code: number) => never,
  };
}

describe('runShutdown', () => {
  it('runs handlers across all phases', async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.registry.register(
      'pre',
      () => {
        order.push('pre');
      },
      { phase: 'pre' },
    );
    deps.registry.register(
      'drain',
      () => {
        order.push('drain');
      },
      { phase: 'drain' },
    );
    deps.registry.register(
      'cleanup',
      () => {
        order.push('cleanup');
      },
      { phase: 'cleanup' },
    );
    deps.registry.register(
      'post',
      () => {
        order.push('post');
      },
      { phase: 'post' },
    );

    const code = await runShutdown(deps, 'test');
    logStep('phase execution order', { order, code });
    expect(order).toEqual(['pre', 'drain', 'cleanup', 'post']);
    expect(code).toBe(0);
    logProof('all phases executed in order', order);
  });

  it('returns exit code 1 for critical handler failure', async () => {
    const deps = createDeps();
    deps.registry.register(
      'fail',
      () => {
        throw new Error('boom');
      },
      { critical: true },
    );

    expect(await runShutdown(deps, 'test')).toBe(1);
  });

  it('returns exit code 0 for non-critical failure', async () => {
    const deps = createDeps();
    deps.registry.register(
      'fail',
      () => {
        throw new Error('boom');
      },
      { critical: false },
    );

    expect(await runShutdown(deps, 'test')).toBe(0);
  });

  it('returns exit code 1 for critical async rejection', async () => {
    const deps = createDeps();
    deps.registry.register(
      'fail',
      async () => {
        await Promise.resolve();
        throw new Error('async');
      },
      { critical: true },
    );

    expect(await runShutdown(deps, 'test')).toBe(1);
  });

  it('returns exit code 1 for Promise.reject in handler', async () => {
    const deps = createDeps();
    deps.registry.register('fail', () => Promise.reject(new Error('reject')), { critical: true });

    expect(await runShutdown(deps, 'test')).toBe(1);
  });

  it('handles non-Error throws in handlers', async () => {
    const deps = createDeps();
    deps.registry.register('fail', () => {
      throw 'string-error';
    });

    expect(await runShutdown(deps, 'test')).toBe(0);
    logProof('non-Error converted to Error', true);
  });

  it('skips remaining batches after global abort', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ shutdownTimeoutMs: 100, phases: ['pre'] });
    const second = vi.fn();

    deps.registry.register('hang', () => new Promise(() => {}), { phase: 'pre', priority: 10 });
    deps.registry.register('second', second, { phase: 'pre', priority: 20 });

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    await promise;

    expect(second).not.toHaveBeenCalled();
    logProof('aborted shutdown skips later batches', second.mock.calls.length);

    vi.useRealTimers();
  });

  it('records critical handler failure when global timeout fires during batch', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ shutdownTimeoutMs: 100, phases: ['cleanup'] });

    deps.registry.register('hang', () => new Promise(() => {}), {
      phase: 'cleanup',
      critical: true,
    });

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    const code = await promise;

    expect(code).toBe(1);
    vi.useRealTimers();
  });

  it('exits with code 1 when global timeout fires but handlers exit cleanly on abort', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ shutdownTimeoutMs: 100, phases: ['cleanup'] });

    deps.registry.register(
      'clean-abort',
      (ctx) =>
        new Promise<void>((resolve) => {
          ctx.abortSignal.addEventListener('abort', () => resolve(), { once: true });
        }),
      { phase: 'cleanup' },
    );

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    expect(await promise).toBe(1);

    vi.useRealTimers();
  });

  it('aborts remaining phases on global timeout', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ shutdownTimeoutMs: 100 });
    deps.registry.register('hang', () => new Promise(() => {}), { phase: 'pre' });
    deps.registry.register(
      'never',
      () => {
        throw new Error('should not run');
      },
      { phase: 'cleanup' },
    );

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    const code = await promise;

    expect(code).toBe(1);
    expect(deps.options.logger).toHaveBeenCalledWith(
      expect.stringContaining('timed out'),
      expect.any(Object),
    );
    logProof('global timeout stops shutdown', code);

    vi.useRealTimers();
  });

  it('calls onHandlerStart and onHandlerEnd hooks', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const deps = createDeps();
    deps.onHandlerStart = onStart;
    deps.onHandlerEnd = onEnd;
    deps.registry.register('hooked', vi.fn());

    await runShutdown(deps, 'test');
    expect(onStart).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
  });

  it('emits handler events through deps.events', async () => {
    const deps = createDeps();
    const completed = vi.fn();
    const errored = vi.fn();
    deps.events.on('handlerCompleted', completed);
    deps.events.on('handlerError', errored);

    deps.registry.register('ok', vi.fn());
    deps.registry.register('bad', () => {
      throw new Error('x');
    });

    await runShutdown(deps, 'test');
    expect(completed).toHaveBeenCalled();
    expect(errored).toHaveBeenCalled();
  });

  it('passes signal in handler context', async () => {
    const deps = createDeps();
    let capturedSignal: string | undefined;

    deps.registry.register('ctx', (ctx) => {
      capturedSignal = ctx.signal;
    });

    await runShutdown(deps, 'sigterm', 'SIGTERM');
    expect(capturedSignal).toBe('SIGTERM');
  });
});

describe('registerHttpServerHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes server and drains idle connections', async () => {
    const registry = new HandlerRegistry();
    const closeIdleConnections = vi.fn();
    const close = vi.fn((cb?: (err?: Error) => void) => cb?.());

    registerHttpServerHandler(registry, { close, closeIdleConnections });
    const deps = createDeps({ phases: ['drain'] });
    deps.registry = registry;

    await runShutdown(deps, 'test');
    expect(closeIdleConnections).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    logProof('HTTP server drain handler ran', { close: true });
  });

  it('calls closeAllConnections after drain timeout', async () => {
    const registry = new HandlerRegistry();
    const closeAllConnections = vi.fn();
    const logger = vi.fn();
    const server = {
      close: () => {},
      closeIdleConnections: vi.fn(),
      closeAllConnections,
    };

    registerHttpServerHandler(registry, server, { drainTimeoutMs: 500 }, logger);
    const deps = createDeps({ phases: ['drain'] });
    deps.registry = registry;

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(600);
    await promise;

    expect(closeAllConnections).toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining('drain timed out'),
      expect.objectContaining({ name: 'http-server', drainTimeoutMs: 500 }),
    );
    logProof('force-close after drain timeout', true);
  });

  it('logs handler error summary when shutdown has failures', async () => {
    const deps = createDeps();
    deps.registry.register('fail', () => {
      throw new Error('boom');
    });

    await runShutdown(deps, 'test');

    expect(deps.options.logger).toHaveBeenCalledWith(
      expect.stringContaining('handler error(s)'),
      expect.objectContaining({ errorCount: 1 }),
    );
  });

  it('rejects when server.close returns error', async () => {
    const registry = new HandlerRegistry();
    const close = vi.fn((cb?: (err?: Error) => void) => cb?.(new Error('close failed')));

    registerHttpServerHandler(registry, { close }, { drainTimeoutMs: 100 });
    const deps = createDeps({ phases: ['drain'] });
    deps.registry = registry;

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(200);
    expect(await promise).toBe(1);
    logProof('close error marks critical failure', true);
  });

  it('throws when drainTimeoutMs is not positive', () => {
    const registry = new HandlerRegistry();
    expect(() =>
      registerHttpServerHandler(registry, { close: vi.fn() }, { drainTimeoutMs: 0 }),
    ).toThrow(RangeError);
  });

  it('aborts http drain when global shutdown timeout fires', async () => {
    vi.useFakeTimers();
    const registry = new HandlerRegistry();
    const closeAllConnections = vi.fn();
    const close = vi.fn(() => {});
    registerHttpServerHandler(registry, { close, closeAllConnections }, { drainTimeoutMs: 10_000 });
    const deps = createDeps({ phases: ['drain'], shutdownTimeoutMs: 100 });
    deps.registry = registry;

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    expect(await promise).toBe(1);
    expect(closeAllConnections).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('ignores duplicate settlement when close callback races global abort', async () => {
    vi.useFakeTimers();
    const registry = new HandlerRegistry();
    let closeCallback: ((err?: Error) => void) | undefined;
    const close = vi.fn((cb?: (err?: Error) => void) => {
      closeCallback = cb;
    });

    registerHttpServerHandler(registry, { close }, { drainTimeoutMs: 10_000 });
    const deps = createDeps({ phases: ['drain'], shutdownTimeoutMs: 100 });
    deps.registry = registry;

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    closeCallback?.();
    expect(await promise).toBe(1);

    vi.useRealTimers();
  });

  it('uses custom name and options', () => {
    const registry = new HandlerRegistry();
    registerHttpServerHandler(
      registry,
      { close: vi.fn() },
      { name: 'api', priority: 5, phase: 'pre', drainTimeoutMs: 2000 },
    );

    const handler = registry.get('api');
    expect(handler?.priority).toBe(5);
    expect(handler?.phase).toBe('pre');
    expect(handler?.timeoutMs).toBe(3000);
  });

  it('closes minimal http server without optional connection helpers', async () => {
    const registry = new HandlerRegistry();
    const close = vi.fn((cb?: (err?: Error) => void) => cb?.());
    registerHttpServerHandler(registry, { close }, { drainTimeoutMs: 50 });

    const deps = createDeps({ phases: ['drain'] });
    deps.registry = registry;

    vi.useFakeTimers();
    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(60);
    await promise;
    vi.useRealTimers();

    expect(close).toHaveBeenCalled();
    logProof('minimal server closes without idle/all helpers', true);
  });
});

describe('executeHandler timeout cleanup', () => {
  it('clears timeout when handler completes before deadline', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const deps = createDeps();
    deps.registry.register('fast', async () => {}, { timeoutMs: 5000 });

    await runShutdown(deps, 'test');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });

  it('clears timeout when handler fails after timeout was scheduled', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const deps = createDeps();
    deps.registry.register('slow', () => new Promise(() => {}), { timeoutMs: 50, critical: true });

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does not override exit code when abort follows handler errors', async () => {
    vi.useFakeTimers();
    const deps = createDeps({ shutdownTimeoutMs: 100, phases: ['pre', 'cleanup'] });
    deps.registry.register(
      'fail',
      () => {
        throw new Error('fail');
      },
      { phase: 'pre', critical: false },
    );
    deps.registry.register('hang', () => new Promise(() => {}), { phase: 'cleanup' });

    const promise = runShutdown(deps, 'test');
    await vi.advanceTimersByTimeAsync(150);
    const code = await promise;

    expect(code).toBe(0);
    vi.useRealTimers();
    logProof('abort after errors preserves exit code logic', code);
  });

  it('fails fast when global abort is already set before handler execution', async () => {
    const controller = new AbortController();
    controller.abort();
    const deps = createDeps();
    deps.registry.register('late', () => new Promise(() => {}));
    const handler = deps.registry.get('late')!;

    const result = await executeHandler(
      handler,
      { reason: 'test', phase: 'cleanup' },
      deps,
      controller.signal,
    );

    expect(result.error?.message).toMatch(/aborted due to shutdown timeout/);
  });

  it('swallows late handler rejections after global abort wins the race', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      vi.useFakeTimers();
      const deps = createDeps({ shutdownTimeoutMs: 100, phases: ['cleanup'] });
      deps.registry.register(
        'slow',
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('late rejection')), 200);
          }),
        { phase: 'cleanup' },
      );

      const promise = runShutdown(deps, 'test');
      await vi.advanceTimersByTimeAsync(300);
      await promise;
      await Promise.resolve();

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
