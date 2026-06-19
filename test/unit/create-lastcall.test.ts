import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createLastcall,
  getDefaultLastcall,
  resetDefaultLastcall,
} from '../../src/create-lastcall.js';
import { HandlerRegistry } from '../../src/handler-registry.js';
import { resetGlobalLastcall } from '../../src/utils/singleton.js';
import { logProof, logStep } from '../helpers/test-logger.js';

function createTestLastcall() {
  return createLastcall({
    autoExit: false,
    signals: [],
    logger: () => {},
  });
}

describe('createLastcall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs handlers on shutdown', async () => {
    const lastcall = createTestLastcall();
    const handler = vi.fn();

    lastcall.register('cleanup', handler);
    await lastcall.shutdown('test');

    expect(handler).toHaveBeenCalledOnce();
    expect(lastcall.isShuttingDown()).toBe(true);
    logProof('handler invoked on shutdown', handler.mock.calls.length);
  });

  it('is idempotent on multiple shutdown calls', async () => {
    const lastcall = createTestLastcall();
    const handler = vi.fn();
    lastcall.register('cleanup', handler);

    const [a, b] = await Promise.all([lastcall.shutdown('first'), lastcall.shutdown('second')]);

    expect(a).toBe(b);
    expect(handler).toHaveBeenCalledOnce();
    logProof('shutdown is idempotent', { a, b });
  });

  it('returns exit code 1 when critical handler fails', async () => {
    const lastcall = createTestLastcall();
    lastcall.register(
      'fail',
      () => {
        throw new Error('boom');
      },
      { critical: true },
    );
    expect(await lastcall.shutdown('test')).toBe(1);
  });

  it('returns exit code 0 when non-critical handler fails', async () => {
    const lastcall = createTestLastcall();
    lastcall.register(
      'fail',
      () => {
        throw new Error('boom');
      },
      { critical: false },
    );
    expect(await lastcall.shutdown('test')).toBe(0);
  });

  it('calls custom exit when autoExit is true', async () => {
    const exit = vi.fn((() => {
      throw new Error('exit called');
    }) as (code: number) => never);

    const lastcall = createLastcall({
      autoExit: true,
      signals: [],
      exit,
      logger: () => {},
    });

    lastcall.register('x', vi.fn());

    await expect(lastcall.shutdown('test')).rejects.toThrow('exit called');
    expect(exit).toHaveBeenCalledWith(0);
    logProof('autoExit invokes exit function', exit.mock.calls);
  });

  it('uses default logger when none provided', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
    });

    lastcall.register('fail', () => {
      throw new Error('logged');
    });
    await lastcall.shutdown('test');

    expect(errorSpy).toHaveBeenCalledWith(
      '[lastcall] Handler "fail" failed',
      expect.objectContaining({ error: 'logged' }),
    );

    errorSpy.mockRestore();
    logProof('defaultLogger logs handler failures', true);
  });

  it('returns exit code 1 when shutdown runner throws', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
    });

    lastcall.register('a', vi.fn(), { phase: 'cleanup', deps: ['b'] });
    lastcall.register('b', vi.fn(), { phase: 'cleanup', deps: ['a'] });

    expect(await lastcall.shutdown('test')).toBe(1);
    logProof('circular deps yield exit code 1', 1);
  });

  it('emits lifecycle events with signal in payload', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: ['SIGTERM'],
      logger: () => {},
    });

    const before = vi.fn();
    lastcall.on('beforeShutdown', before);
    lastcall.register('sig', vi.fn());

    lastcall.simulateSignal('SIGTERM');
    await vi.waitFor(() => expect(before).toHaveBeenCalled());

    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('SIGTERM'), signal: 'SIGTERM' }),
    );
    logStep('signal propagated to beforeShutdown', before.mock.calls[0]);
  });

  it('shuts down on uncaughtException when enabled', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      captureUncaughtException: true,
      logger: () => {},
    });

    const handler = vi.fn();
    lastcall.register('cleanup', handler);

    process.emit('uncaughtException', new Error('test'));
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    logProof('uncaughtException triggers shutdown', true);
  });

  it('shuts down on unhandledRejection when enabled', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      captureUnhandledRejection: true,
      logger: () => {},
    });

    const handler = vi.fn();
    lastcall.register('cleanup', handler);

    process.emit('unhandledRejection', new Error('test'));
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    logProof('unhandledRejection triggers shutdown', true);
  });

  it('removes event listeners with off', async () => {
    const lastcall = createTestLastcall();
    const listener = vi.fn();
    lastcall.on('beforeShutdown', listener);
    lastcall.off('beforeShutdown', listener);
    lastcall.register('x', vi.fn());
    await lastcall.shutdown('test');
    expect(listener).not.toHaveBeenCalled();
    logProof('off removes listener', true);
  });

  it('unregisters handlers', () => {
    const lastcall = createTestLastcall();
    lastcall.register('temp', vi.fn());
    expect(lastcall.unregister('temp')).toBe(true);
    expect(lastcall.unregister('temp')).toBe(false);
    logProof('unregister removes handler', true);
  });

  it('calls process.exit by default when autoExit is true', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);
    const lastcall = createLastcall({ autoExit: true, signals: [], logger: () => {} });
    lastcall.register('x', vi.fn());
    await lastcall.shutdown('test');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    logProof('default exitFn calls process.exit', true);
  });

  it('handles non-Error thrown during shutdown orchestration', async () => {
    const lastcall = createTestLastcall();
    vi.spyOn(HandlerRegistry.prototype, 'getExecutionBatches').mockImplementation(() => {
      throw 'orchestration-failure';
    });

    expect(await lastcall.shutdown('test')).toBe(1);
    logProof('non-Error shutdown failure logged', true);
  });

  it('accepts all optional configuration branches', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const logger = vi.fn();

    const lastcall = createLastcall({
      signals: ['SIGINT'],
      shutdownTimeoutMs: 1000,
      phases: ['cleanup'],
      onHandlerStart: onStart,
      onHandlerEnd: onEnd,
      logger,
      autoExit: false,
    });

    lastcall.register('x', vi.fn());
    await lastcall.shutdown('configured');
    expect(onStart).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
    logProof('all optional config branches exercised', true);
  });

  it('uses built-in defaults for signals phases shutdownTimeout and autoExit', async () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as typeof process.exit);
    const lastcall = createLastcall({ logger: () => {} });
    lastcall.register('defaults', vi.fn());
    await lastcall.shutdown('defaults');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    logProof('default option fallbacks applied', true);
  });

  it('passes handler context with abortSignal', async () => {
    const lastcall = createTestLastcall();
    let ctx: unknown;

    lastcall.register('ctx', (c) => {
      ctx = c;
    });
    await lastcall.shutdown('my-reason', 'SIGTERM');

    expect(ctx).toMatchObject({ reason: 'my-reason', signal: 'SIGTERM', phase: 'cleanup' });
    expect((ctx as { abortSignal: AbortSignal }).abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('emits afterShutdown via public on()', async () => {
    const lastcall = createTestLastcall();
    const listener = vi.fn();
    lastcall.on('afterShutdown', listener);

    await lastcall.shutdown('test');

    expect(listener).toHaveBeenCalledWith({ exitCode: 0 });
  });

  it('logs when overwriting duplicate handler name', async () => {
    const logger = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger,
    });

    lastcall.register('dup', vi.fn());
    lastcall.register('dup', vi.fn());

    expect(logger).toHaveBeenCalledWith('Handler "dup" is already registered — overwriting', {
      name: 'dup',
    });
  });

  it('disposes signal listeners after shutdown', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: ['SIGTERM'],
      logger: () => {},
    });

    const handler = vi.fn();
    lastcall.register('cleanup', handler);
    await lastcall.shutdown('test');

    lastcall.simulateSignal('SIGTERM');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('runs the latest handler when a name is overwritten', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const lastcall = createTestLastcall();

    lastcall.register('dup', first);
    lastcall.register('dup', second);
    await lastcall.shutdown('test');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('returns exit code 1 when handler depends on unknown name', async () => {
    const lastcall = createTestLastcall();
    lastcall.register('orphan', vi.fn(), { deps: ['missing'] });
    expect(await lastcall.shutdown('test')).toBe(1);
  });

  it('does not register uncaughtException listener when capture is disabled', () => {
    const onSpy = vi.spyOn(process, 'on');
    createLastcall({
      autoExit: false,
      signals: [],
      captureUncaughtException: false,
      logger: () => {},
    });

    const uncaughtCalls = onSpy.mock.calls.filter(([event]) => event === 'uncaughtException');
    expect(uncaughtCalls).toHaveLength(0);
    onSpy.mockRestore();
  });

  it('passes uncaughtException as shutdown reason', async () => {
    const before = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      captureUncaughtException: true,
      logger: () => {},
    });

    lastcall.on('beforeShutdown', before);
    lastcall.register('x', vi.fn());
    process.emit('uncaughtException', new Error('test'));
    await vi.waitFor(() => expect(before).toHaveBeenCalled());

    expect(before).toHaveBeenCalledWith(expect.objectContaining({ reason: 'uncaughtException' }));
  });

  it('emits handlerError via public on()', async () => {
    const lastcall = createTestLastcall();
    const onError = vi.fn();
    lastcall.on('handlerError', onError);

    lastcall.register('bad', () => {
      throw new Error('handler failed');
    });
    await lastcall.shutdown('test');

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bad',
        error: expect.any(Error),
      }),
    );
  });

  it('skips handlers outside configured phases', async () => {
    const pre = vi.fn();
    const cleanup = vi.fn();
    const post = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
      phases: ['cleanup'],
    });

    lastcall.register('pre', pre, { phase: 'pre' });
    lastcall.register('cleanup', cleanup, { phase: 'cleanup' });
    lastcall.register('post', post, { phase: 'post' });
    await lastcall.shutdown('test');

    expect(pre).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('returns exit code 1 when critical async handler rejects', async () => {
    const lastcall = createTestLastcall();
    lastcall.register(
      'fail',
      async () => {
        await Promise.resolve();
        throw new Error('async boom');
      },
      { critical: true },
    );
    expect(await lastcall.shutdown('test')).toBe(1);
  });

  it('rejects register during shutdown', async () => {
    vi.useFakeTimers();

    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
      shutdownTimeoutMs: 5_000,
    });

    lastcall.register('blocker', () => new Promise(() => {}));
    void lastcall.shutdown('test');

    expect(lastcall.isShuttingDown()).toBe(true);
    expect(() => lastcall.register('late', vi.fn())).toThrow(/shutdown is in progress/);
    expect(() => lastcall.unregister('blocker')).toThrow(/shutdown is in progress/);

    await vi.advanceTimersByTimeAsync(5_000);
    vi.useRealTimers();
  });

  it('rejects withHttpServer during shutdown', async () => {
    vi.useFakeTimers();

    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
      shutdownTimeoutMs: 5_000,
    });

    lastcall.register('blocker', () => new Promise(() => {}));
    void lastcall.shutdown('test');

    expect(() => lastcall.withHttpServer({ close: vi.fn() })).toThrow(/shutdown is in progress/);

    await vi.advanceTimersByTimeAsync(5_000);
    vi.useRealTimers();
  });

  it('throws when shutdownTimeoutMs is not positive', () => {
    expect(() => createLastcall({ shutdownTimeoutMs: 0 })).toThrow(RangeError);
    expect(() => createLastcall({ shutdownTimeoutMs: -1 })).toThrow(RangeError);
    expect(() => createLastcall({ shutdownTimeoutMs: Number.NaN })).toThrow(RangeError);
  });

  it('exposes lifecycle state via getState and isShutdownComplete', async () => {
    const lastcall = createTestLastcall();
    lastcall.register('cleanup', vi.fn());

    expect(lastcall.getState()).toBe('idle');
    expect(lastcall.isShutdownComplete()).toBe(false);

    const promise = lastcall.shutdown('test');
    expect(lastcall.getState()).toBe('shutting_down');
    expect(lastcall.isShutdownComplete()).toBe(false);

    await promise;
    expect(lastcall.getState()).toBe('done');
    expect(lastcall.isShutdownComplete()).toBe(true);
    expect(lastcall.isShuttingDown()).toBe(true);
  });

  it('sets force_exit state when critical handler fails', async () => {
    const lastcall = createTestLastcall();
    lastcall.register(
      'fail',
      () => {
        throw new Error('boom');
      },
      { critical: true },
    );

    await lastcall.shutdown('test');
    expect(lastcall.getState()).toBe('force_exit');
    expect(lastcall.isShutdownComplete()).toBe(true);
  });

  it('rejects register after shutdown has completed', async () => {
    const lastcall = createTestLastcall();
    lastcall.register('cleanup', vi.fn());
    await lastcall.shutdown('test');

    expect(() => lastcall.register('late', vi.fn())).toThrow(/after shutdown has completed/);
    expect(() => lastcall.unregister('cleanup')).toThrow(/after shutdown has completed/);
  });

  it('warns when registering handler with missing dependency', () => {
    const logger = vi.fn();
    const lastcall = createLastcall({ autoExit: false, signals: [], logger });

    lastcall.register('api', vi.fn(), { deps: ['db'] });

    expect(logger).toHaveBeenCalledWith(
      'Handler "api" depends on "db" which is not registered yet',
      { name: 'api', dep: 'db' },
    );
  });

  it('warns when handler phase is not in configured phases', () => {
    const logger = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger,
      phases: ['cleanup'],
    });

    lastcall.register('drain-only', vi.fn(), { phase: 'drain' });

    expect(logger).toHaveBeenCalledWith(
      'Handler "drain-only" is in phase "drain" which is not included in configured phases',
      { name: 'drain-only', phase: 'drain', phases: ['cleanup'] },
    );
  });

  it('deduplicates duplicate signals in options', () => {
    const onceSpy = vi.spyOn(process, 'once');
    createLastcall({ signals: ['SIGTERM', 'SIGTERM', 'SIGINT'], autoExit: false });

    const sigtermRegistrations = onceSpy.mock.calls.filter(([signal]) => signal === 'SIGTERM');
    expect(sigtermRegistrations).toHaveLength(1);

    onceSpy.mockRestore();
  });

  it('throws when phases contain duplicates', () => {
    expect(() =>
      createLastcall({ phases: ['cleanup', 'cleanup'], autoExit: false, signals: [] }),
    ).toThrow(/Duplicate shutdown phase/);
  });

  it('throws when phases contain invalid values', () => {
    expect(() =>
      createLastcall({
        phases: ['cleanup', 'invalid' as 'cleanup'],
        autoExit: false,
        signals: [],
      }),
    ).toThrow(/Invalid shutdown phase/);
  });

  it('throws when withHttpServer drainTimeoutMs is not positive', () => {
    const lastcall = createTestLastcall();
    expect(() => lastcall.withHttpServer({ close: vi.fn() }, { drainTimeoutMs: 0 })).toThrow(
      RangeError,
    );
  });
});

describe('getDefaultLastcall', () => {
  afterEach(() => {
    resetGlobalLastcall();
  });

  it('returns process-wide singleton', () => {
    const a = getDefaultLastcall({ autoExit: false, signals: [] });
    const b = getDefaultLastcall();
    expect(a).toBe(b);
    logProof('getDefaultLastcall is singleton', a === b);
  });

  it('ignores options on second call', () => {
    const logger = vi.fn();
    getDefaultLastcall({ autoExit: false, signals: [], logger: () => {} });
    getDefaultLastcall({ logger });

    expect(logger).not.toHaveBeenCalled();
  });

  it('warns via default logger when options are passed after singleton exists', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    getDefaultLastcall({ autoExit: false, signals: [] });
    getDefaultLastcall({ shutdownTimeoutMs: 999 });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('options ignored'));
    errorSpy.mockRestore();
  });
});

describe('handler timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('times out slow handlers', async () => {
    const onEnd = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
      onHandlerEnd: onEnd,
    });

    lastcall.register('slow', () => new Promise(() => {}), { timeoutMs: 100, critical: true });

    const shutdownPromise = lastcall.shutdown('test');
    await vi.advanceTimersByTimeAsync(150);
    const code = await shutdownPromise;

    expect(code).toBe(1);
    expect(onEnd).toHaveBeenCalledWith(
      'slow',
      expect.objectContaining({ error: expect.any(Error) }),
    );
    logProof('per-handler timeout enforced', code);
  });

  it('aborts handler context when per-handler timeout fires', async () => {
    let aborted = false;
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger: () => {},
    });

    lastcall.register(
      'slow',
      (ctx) =>
        new Promise<void>((resolve) => {
          ctx.abortSignal.addEventListener('abort', () => {
            aborted = true;
            resolve();
          });
        }),
      { timeoutMs: 100 },
    );

    const shutdownPromise = lastcall.shutdown('test');
    await vi.advanceTimersByTimeAsync(150);
    await shutdownPromise;

    expect(aborted).toBe(true);
  });
});

describe('withHttpServer integration', () => {
  it('closes the server on shutdown', async () => {
    const lastcall = createTestLastcall();
    const close = vi.fn((cb?: (err?: Error) => void) => cb?.());

    lastcall.withHttpServer({ close });
    await lastcall.shutdown('test');

    expect(close).toHaveBeenCalled();
  });

  it('logs when overwriting duplicate http handler name', () => {
    const logger = vi.fn();
    const lastcall = createLastcall({
      autoExit: false,
      signals: [],
      logger,
    });
    const close = vi.fn((cb?: (err?: Error) => void) => cb?.());

    lastcall.withHttpServer({ close });
    lastcall.withHttpServer({ close }, { name: 'http-server' });

    expect(logger).toHaveBeenCalledWith(
      'Handler "http-server" is already registered — overwriting',
      { name: 'http-server' },
    );
  });
});

describe('signal handling', () => {
  it('simulateSignal triggers shutdown', async () => {
    const lastcall = createLastcall({
      autoExit: false,
      signals: ['SIGTERM'],
      logger: () => {},
    });

    const handler = vi.fn();
    lastcall.register('sig', handler);

    lastcall.simulateSignal('SIGTERM');
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
  });

  it('hasHandler reports registration state', () => {
    const lastcall = createTestLastcall();

    expect(lastcall.hasHandler('db')).toBe(false);
    lastcall.register('db', vi.fn());
    expect(lastcall.hasHandler('db')).toBe(true);
    lastcall.unregister('db');
    expect(lastcall.hasHandler('db')).toBe(false);
  });

  it('listHandlers returns sorted handler summaries', () => {
    const lastcall = createTestLastcall();

    lastcall.register('cleanup-b', vi.fn(), { phase: 'cleanup', priority: 200 });
    lastcall.register('pre', vi.fn(), { phase: 'pre', priority: 1 });
    lastcall.register('cleanup-a', vi.fn(), {
      phase: 'cleanup',
      priority: 100,
      deps: ['cleanup-b'],
      critical: true,
      timeoutMs: 5000,
    });

    expect(lastcall.listHandlers()).toEqual([
      {
        name: 'pre',
        phase: 'pre',
        priority: 1,
        critical: false,
        deps: [],
      },
      {
        name: 'cleanup-a',
        phase: 'cleanup',
        priority: 100,
        critical: true,
        deps: ['cleanup-b'],
        timeoutMs: 5000,
      },
      {
        name: 'cleanup-b',
        phase: 'cleanup',
        priority: 200,
        critical: false,
        deps: [],
      },
    ]);
  });

  it('listHandlers breaks ties by name when phase and priority match', () => {
    const lastcall = createTestLastcall();

    lastcall.register('z-handler', vi.fn(), { phase: 'cleanup', priority: 100 });
    lastcall.register('a-handler', vi.fn(), { phase: 'cleanup', priority: 100 });

    expect(lastcall.listHandlers().map((handler) => handler.name)).toEqual([
      'a-handler',
      'z-handler',
    ]);
  });
});

describe('resetDefaultLastcall', () => {
  afterEach(() => {
    resetDefaultLastcall();
  });

  it('clears the process-wide singleton', () => {
    const first = getDefaultLastcall({ autoExit: false, signals: [] });
    resetDefaultLastcall();
    const second = getDefaultLastcall({ autoExit: false, signals: [] });
    expect(second).not.toBe(first);
  });
});
