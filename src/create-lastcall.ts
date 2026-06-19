import { LastcallEvents } from './events.js';
import { HandlerRegistry } from './handler-registry.js';
import { registerHttpServerHandler, runShutdown } from './shutdown-runner.js';
import { SignalListener } from './signal-listener.js';
import type {
  BeforeShutdownPayload,
  HandlerFn,
  HandlerOptions,
  HandlerSummary,
  HttpServerLike,
  HttpServerOptions,
  Lastcall,
  LastcallEvent,
  LastcallOptions,
  LastcallState,
  ResolvedLastcallOptions,
  ShutdownPhase,
  ShutdownSignal,
} from './types.js';
import { DEFAULT_PHASES, DEFAULT_SIGNALS } from './types.js';
import { LASTCALL_SINGLETON_KEY, resetGlobalLastcall } from './utils/singleton.js';
import { defaultLastcallLogger } from './utils/logger.js';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

/**
 * Create a lastcall instance for graceful process shutdown.
 *
 * Registers OS signal listeners (unless `signals: []`) and runs registered handlers
 * in phase order when a signal arrives or `shutdown()` is called.
 */
export function createLastcall(userOptions: LastcallOptions = {}): Lastcall {
  const options = resolveOptions(userOptions);
  const registry = new HandlerRegistry();
  const events = new LastcallEvents();

  let state: LastcallState = 'idle';
  let shutdownPromise: Promise<number> | null = null;

  const exitFn: (code: number) => never =
    options.exit ??
    ((code: number): never => {
      return process.exit(code);
    });

  const signalListener = new SignalListener({
    signals: options.signals,
    onSignal: (signal) => {
      void initiateShutdown(`Received ${signal}`, signal);
    },
  });

  let uncaughtHandler: ((error: Error) => void) | undefined;
  let unhandledHandler: ((reason: unknown) => void) | undefined;

  if (options.captureUncaughtException) {
    uncaughtHandler = (error) => {
      options.logger('Uncaught exception — initiating shutdown', {
        error: error.message,
        stack: error.stack,
      });
      void initiateShutdown('uncaughtException');
    };
    process.on('uncaughtException', uncaughtHandler);
  }

  if (options.captureUnhandledRejection) {
    unhandledHandler = (reason) => {
      options.logger('Unhandled rejection — initiating shutdown', {
        reason: String(reason),
      });
      void initiateShutdown('unhandledRejection');
    };
    process.on('unhandledRejection', unhandledHandler);
  }

  signalListener.register();

  function disposeProcessListeners(): void {
    signalListener.dispose();
    if (uncaughtHandler) {
      process.removeListener('uncaughtException', uncaughtHandler);
      uncaughtHandler = undefined;
    }
    if (unhandledHandler) {
      process.removeListener('unhandledRejection', unhandledHandler);
      unhandledHandler = undefined;
    }
  }

  async function initiateShutdown(reason: string, signal?: ShutdownSignal): Promise<number> {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    state = 'shutting_down';
    shutdownPromise = performShutdown(reason, signal);
    return shutdownPromise;
  }

  async function performShutdown(reason: string, signal?: ShutdownSignal): Promise<number> {
    const beforePayload: BeforeShutdownPayload = { reason };
    if (signal !== undefined) {
      beforePayload.signal = signal;
    }
    events.emitBeforeShutdown(beforePayload);

    let exitCode: number;

    try {
      exitCode = await runShutdown(
        {
          registry,
          events,
          options,
          exitFn,
          onHandlerStart: options.onHandlerStart,
          onHandlerEnd: options.onHandlerEnd,
        },
        reason,
        signal,
      );
    } catch (error) {
      options.logger('Shutdown failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      exitCode = 1;
    } finally {
      disposeProcessListeners();
    }

    state = exitCode === 0 ? 'done' : 'force_exit';
    events.emitAfterShutdown({ exitCode });

    if (options.autoExit) {
      exitFn(exitCode);
    }

    return exitCode;
  }

  const lastcall: Lastcall = {
    register(name: string, fn: HandlerFn, handlerOptions?: HandlerOptions): void {
      assertCanModifyHandlers(state, 'register handlers');
      if (registry.has(name)) {
        options.logger(`Handler "${name}" is already registered — overwriting`, { name });
      }
      registry.register(name, fn, handlerOptions);
      warnMissingDependencies(registry, name, handlerOptions?.deps, options.logger);
      warnInactivePhase(name, handlerOptions?.phase ?? 'cleanup', options);
    },

    unregister(name: string): boolean {
      assertCanModifyHandlers(state, 'unregister handlers');
      return registry.unregister(name);
    },

    hasHandler(name: string): boolean {
      return registry.has(name);
    },

    listHandlers(): readonly HandlerSummary[] {
      const phaseOrder = new Map(options.phases.map((phase, index) => [phase, index]));
      return registry.listSummaries().sort((a, b) => {
        const phaseDiff = (phaseOrder.get(a.phase) ?? 0) - (phaseOrder.get(b.phase) ?? 0);
        if (phaseDiff !== 0) {
          return phaseDiff;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.name.localeCompare(b.name);
      });
    },

    shutdown(reason = 'manual', signal?: ShutdownSignal): Promise<number> {
      return initiateShutdown(reason, signal);
    },

    isShuttingDown(): boolean {
      return state !== 'idle';
    },

    isShutdownComplete(): boolean {
      return state === 'done' || state === 'force_exit';
    },

    getState(): LastcallState {
      return state;
    },

    simulateSignal(signal: ShutdownSignal): void {
      signalListener.simulate(signal);
    },

    withHttpServer(server: HttpServerLike, httpOptions?: HttpServerOptions): void {
      assertCanModifyHandlers(state, 'register handlers');

      const httpName = httpOptions?.name ?? 'http-server';
      if (registry.has(httpName)) {
        options.logger(`Handler "${httpName}" is already registered — overwriting`, {
          name: httpName,
        });
      }

      registerHttpServerHandler(registry, server, httpOptions, options.logger);
      warnInactivePhase(httpName, httpOptions?.phase ?? 'drain', options);
    },

    on(event: LastcallEvent, listener: (...args: never[]) => void): void {
      events.on(event, listener);
    },

    off(event: LastcallEvent, listener: (...args: never[]) => void): void {
      events.off(event, listener);
    },
  };

  return lastcall;
}

function resolveOptions(userOptions: LastcallOptions): ResolvedLastcallOptions {
  const shutdownTimeoutMs = userOptions.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  if (!Number.isFinite(shutdownTimeoutMs) || shutdownTimeoutMs <= 0) {
    throw new RangeError('shutdownTimeoutMs must be a finite number greater than 0');
  }

  const phases = normalizePhases(userOptions.phases ?? DEFAULT_PHASES);
  const signals = normalizeSignals(userOptions.signals ?? DEFAULT_SIGNALS);

  return {
    signals,
    shutdownTimeoutMs,
    phases,
    onHandlerStart: userOptions.onHandlerStart,
    onHandlerEnd: userOptions.onHandlerEnd,
    captureUncaughtException: userOptions.captureUncaughtException ?? false,
    captureUnhandledRejection: userOptions.captureUnhandledRejection ?? false,
    logger: userOptions.logger ?? defaultLastcallLogger,
    exit: userOptions.exit,
    autoExit: userOptions.autoExit ?? true,
  };
}

function normalizePhases(phases: readonly ShutdownPhase[]): readonly ShutdownPhase[] {
  const validPhases = new Set<ShutdownPhase>(DEFAULT_PHASES);
  const seen = new Set<ShutdownPhase>();
  const normalized: ShutdownPhase[] = [];

  for (const phase of phases) {
    if (!validPhases.has(phase)) {
      throw new RangeError(`Invalid shutdown phase "${phase}"`);
    }
    if (seen.has(phase)) {
      throw new RangeError(`Duplicate shutdown phase "${phase}" in phases`);
    }
    seen.add(phase);
    normalized.push(phase);
  }

  return normalized;
}

function normalizeSignals(signals: readonly ShutdownSignal[]): readonly ShutdownSignal[] {
  const seen = new Set<ShutdownSignal>();
  const normalized: ShutdownSignal[] = [];

  for (const signal of signals) {
    if (!seen.has(signal)) {
      seen.add(signal);
      normalized.push(signal);
    }
  }

  return normalized;
}

function assertCanModifyHandlers(state: LastcallState, action: string): void {
  if (state === 'idle') {
    return;
  }

  if (state === 'shutting_down') {
    throw new Error(`Cannot ${action} while shutdown is in progress`);
  }

  throw new Error(`Cannot ${action} after shutdown has completed`);
}

function warnMissingDependencies(
  registry: HandlerRegistry,
  name: string,
  deps: string[] | undefined,
  logger: ResolvedLastcallOptions['logger'],
): void {
  for (const dep of deps ?? []) {
    if (!registry.has(dep)) {
      logger(`Handler "${name}" depends on "${dep}" which is not registered yet`, { name, dep });
    }
  }
}

function warnInactivePhase(
  name: string,
  phase: ShutdownPhase,
  options: ResolvedLastcallOptions,
): void {
  if (!options.phases.includes(phase)) {
    options.logger(
      `Handler "${name}" is in phase "${phase}" which is not included in configured phases`,
      { name, phase, phases: [...options.phases] },
    );
  }
}

/**
 * Return the process-wide lastcall singleton.
 * Options apply only on the first call; subsequent calls ignore new options.
 */
export function getDefaultLastcall(options?: LastcallOptions): Lastcall {
  const globalStore = globalThis as typeof globalThis & {
    [LASTCALL_SINGLETON_KEY]?: Lastcall;
  };

  if (!globalStore[LASTCALL_SINGLETON_KEY]) {
    globalStore[LASTCALL_SINGLETON_KEY] = createLastcall(options);
    return globalStore[LASTCALL_SINGLETON_KEY];
  }

  if (options && Object.keys(options).length > 0) {
    defaultLastcallLogger(
      'getDefaultLastcall() called with options but singleton already exists — options ignored',
    );
  }

  return globalStore[LASTCALL_SINGLETON_KEY];
}

/**
 * Reset the process-wide singleton from `getDefaultLastcall()`.
 * For test isolation only — do not call in production.
 */
export function resetDefaultLastcall(): void {
  resetGlobalLastcall();
}

export type {
  Lastcall,
  LastcallOptions,
  HandlerOptions,
  HandlerFn,
  HandlerSummary,
} from './types.js';
export type { HandlerContext } from './types.js';
export { DEFAULT_PHASES, DEFAULT_SIGNALS } from './types.js';
