import type {
  HandlerContext,
  HttpServerLike,
  HttpServerOptions,
  RegisteredHandler,
  ResolvedLastcallOptions,
  ShutdownPhase,
  ShutdownSignal,
} from './types.js';
import type { HandlerRegistry } from './handler-registry.js';
import type { LastcallEvents } from './events.js';

export interface ShutdownRunnerDeps {
  registry: HandlerRegistry;
  events: LastcallEvents;
  options: ResolvedLastcallOptions;
  exitFn: (code: number) => never;
  onHandlerStart?: ResolvedLastcallOptions['onHandlerStart'];
  onHandlerEnd?: ResolvedLastcallOptions['onHandlerEnd'];
}

export async function runShutdown(
  deps: ShutdownRunnerDeps,
  reason: string,
  signal?: ShutdownSignal,
): Promise<number> {
  const { registry, options } = deps;
  const log = options.logger;
  const globalAbort = new AbortController();
  const globalTimeout = setTimeout(() => {
    log(`Shutdown timed out after ${options.shutdownTimeoutMs}ms — forcing exit`, {
      reason,
      signal,
    });
    globalAbort.abort();
  }, options.shutdownTimeoutMs);

  let exitCode = 0;
  const errors: Array<{ name: string; error: Error; phase: ShutdownPhase }> = [];

  try {
    phaseLoop: for (const phase of options.phases) {
      if (globalAbort.signal.aborted) {
        exitCode = 1;
        break phaseLoop;
      }

      const batches = registry.getExecutionBatches(phase);

      for (const batch of batches) {
        if (globalAbort.signal.aborted) {
          exitCode = 1;
          break phaseLoop;
        }

        const batchPromise = Promise.all(
          batch.map((handler) =>
            executeHandler(handler, { reason, signal, phase }, deps, globalAbort.signal),
          ),
        );

        // Await handler results — global timeout aborts each handler via abortSignal;
        // do not race with an empty array (that discarded in-flight results).
        const results = await batchPromise;

        for (const result of results) {
          if (result.error) {
            errors.push({
              name: result.name,
              error: result.error,
              phase: result.phase,
            });

            if (result.critical) {
              exitCode = 1;
            }
          }
        }
      }
    }
  } finally {
    clearTimeout(globalTimeout);
  }

  if (globalAbort.signal.aborted && errors.length === 0) {
    exitCode = 1;
  }

  if (errors.length > 0) {
    log(`Shutdown completed with ${errors.length} handler error(s)`, {
      errorCount: errors.length,
      handlers: errors.map(({ name: handlerName, phase, error }) => ({
        name: handlerName,
        phase,
        message: error.message,
      })),
    });
  }

  return exitCode;
}

export function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

interface HandlerResult {
  name: string;
  phase: ShutdownPhase;
  error?: Error;
  critical: boolean;
}

/** @internal Exported for unit tests only — not part of the public package API. */
export async function executeHandler(
  handler: RegisteredHandler,
  baseCtx: { reason: string; signal?: ShutdownSignal | undefined; phase: ShutdownPhase },
  deps: ShutdownRunnerDeps,
  globalAbort: AbortSignal,
): Promise<HandlerResult> {
  const handlerAbort = new AbortController();
  let onGlobalAbort: (() => void) | undefined;

  const ctx: HandlerContext = {
    reason: baseCtx.reason,
    signal: baseCtx.signal,
    phase: baseCtx.phase,
    abortSignal: handlerAbort.signal,
  };

  const start = performance.now();
  deps.onHandlerStart?.(handler.name, ctx);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let handlerPromise: Promise<void> | undefined;

  try {
    handlerPromise = Promise.resolve(handler.fn(ctx));
    const abortMessage = `Handler "${handler.name}" aborted due to shutdown timeout`;

    const abortPromise = new Promise<never>((_, reject) => {
      const abortError = () => reject(new Error(abortMessage));

      onGlobalAbort = () => {
        handlerAbort.abort();
        abortError();
      };

      globalAbort.addEventListener('abort', onGlobalAbort);

      if (globalAbort.aborted) {
        onGlobalAbort();
      }
    });

    const timeoutMs = handler.timeoutMs;
    if (timeoutMs !== undefined && timeoutMs > 0) {
      await Promise.race([
        handlerPromise,
        abortPromise,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            handlerAbort.abort();
            reject(new Error(`Handler "${handler.name}" timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } else {
      await Promise.race([handlerPromise, abortPromise]);
    }

    const durationMs = performance.now() - start;
    const payload = { name: handler.name, phase: baseCtx.phase, durationMs };

    deps.onHandlerEnd?.(handler.name, { durationMs, phase: baseCtx.phase });
    deps.events.emitHandlerCompleted(payload);

    return { name: handler.name, phase: baseCtx.phase, critical: handler.critical };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const durationMs = performance.now() - start;
    const payload = {
      name: handler.name,
      phase: baseCtx.phase,
      durationMs,
      error: err,
    };

    deps.onHandlerEnd?.(handler.name, { durationMs, error: err, phase: baseCtx.phase });
    deps.options.logger(`Handler "${handler.name}" failed`, {
      phase: baseCtx.phase,
      error: err.message,
      stack: err.stack,
    });
    deps.events.emitHandlerError(payload);
    deps.events.emitHandlerCompleted(payload);

    return {
      name: handler.name,
      phase: baseCtx.phase,
      error: err,
      critical: handler.critical,
    };
  } finally {
    clearTimeout(timeoutId);
    if (onGlobalAbort) {
      globalAbort.removeEventListener('abort', onGlobalAbort);
    }
    void handlerPromise?.catch(() => {});
  }
}

export function registerHttpServerHandler(
  registry: HandlerRegistry,
  server: HttpServerLike,
  options: HttpServerOptions = {},
  logger?: (message: string, meta?: Record<string, unknown>) => void,
): void {
  const name = options.name ?? 'http-server';
  const drainTimeoutMs = options.drainTimeoutMs ?? 10_000;

  if (!Number.isFinite(drainTimeoutMs) || drainTimeoutMs <= 0) {
    throw new RangeError('drainTimeoutMs must be a finite number greater than 0');
  }

  registry.register(
    name,
    async (ctx) => {
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (action: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          action();
        };

        const onAbort = () => {
          clearTimeout(timeout);
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          finish(() => {
            reject(new Error(`Handler "${name}" aborted due to shutdown timeout`));
          });
        };

        ctx.abortSignal.addEventListener('abort', onAbort, { once: true });

        const timeout = setTimeout(() => {
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          logger?.(
            `HTTP server "${name}" drain timed out after ${drainTimeoutMs}ms — force-closing connections`,
            { name, drainTimeoutMs },
          );
          ctx.abortSignal.removeEventListener('abort', onAbort);
          finish(resolve);
        }, drainTimeoutMs);

        server.close((err) => {
          clearTimeout(timeout);
          ctx.abortSignal.removeEventListener('abort', onAbort);
          if (err) {
            finish(() => reject(err));
          } else {
            finish(resolve);
          }
        });
      });
    },
    {
      priority: options.priority ?? 10,
      phase: options.phase ?? 'drain',
      critical: true,
      timeoutMs: drainTimeoutMs + 1_000,
    },
  );
}
