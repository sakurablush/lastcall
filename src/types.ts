export type ShutdownPhase = 'pre' | 'drain' | 'cleanup' | 'post';

export type ShutdownSignal = 'SIGTERM' | 'SIGINT' | 'SIGHUP';

export const DEFAULT_PHASES: readonly ShutdownPhase[] = [
  'pre',
  'drain',
  'cleanup',
  'post',
] as const;

export const DEFAULT_SIGNALS: readonly ShutdownSignal[] = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const;

export interface HandlerContext {
  reason: string;
  signal?: ShutdownSignal | undefined;
  phase: ShutdownPhase;
  /** Aborted when the global shutdown timeout or per-handler timeout fires. */
  abortSignal: AbortSignal;
}

export interface HandlerOptions {
  /** Lower values run earlier within the same phase. Default: 100 */
  priority?: number | undefined;
  /** Per-handler timeout in milliseconds */
  timeoutMs?: number | undefined;
  /** If true, handler failure affects exit code */
  critical?: boolean | undefined;
  /** Handler names that must complete before this handler runs */
  deps?: string[] | undefined;
  /** Shutdown phase this handler belongs to. Default: 'cleanup' */
  phase?: ShutdownPhase | undefined;
}

export type HandlerFn = (ctx: HandlerContext) => void | Promise<void>;

export interface HandlerEndResult {
  durationMs: number;
  error?: Error | undefined;
  phase: ShutdownPhase;
}

export interface LastcallOptions {
  /** Signals that trigger automatic shutdown. Unavailable signals are skipped. */
  signals?: readonly ShutdownSignal[] | undefined;
  /** Global shutdown timeout in milliseconds. Default: 30000 */
  shutdownTimeoutMs?: number | undefined;
  /** Phases to run, in order. Default: pre → drain → cleanup → post */
  phases?: readonly ShutdownPhase[] | undefined;
  onHandlerStart?: ((name: string, ctx: HandlerContext) => void) | undefined;
  onHandlerEnd?: ((name: string, result: HandlerEndResult) => void) | undefined;
  captureUncaughtException?: boolean | undefined;
  captureUnhandledRejection?: boolean | undefined;
  logger?: ((message: string, meta?: Record<string, unknown>) => void) | undefined;
  /** Override process.exit for testing */
  exit?: ((code: number) => never) | undefined;
  /** When false, do not call process.exit after shutdown (useful for tests) */
  autoExit?: boolean | undefined;
}

export type LastcallEvent =
  | 'beforeShutdown'
  | 'afterShutdown'
  | 'handlerError'
  | 'handlerCompleted';

export interface BeforeShutdownPayload {
  reason: string;
  signal?: ShutdownSignal | undefined;
}

export interface HandlerEventPayload {
  name: string;
  phase: ShutdownPhase;
  durationMs: number;
  error?: Error | undefined;
}

export interface HttpServerLike {
  close(callback?: (err?: Error) => void): void;
  closeAllConnections?(): void;
  closeIdleConnections?(): void;
}

export interface HttpServerOptions {
  name?: string | undefined;
  drainTimeoutMs?: number | undefined;
  priority?: number | undefined;
  phase?: ShutdownPhase | undefined;
}

export interface HandlerSummary {
  name: string;
  phase: ShutdownPhase;
  priority: number;
  critical: boolean;
  deps: readonly string[];
  timeoutMs?: number | undefined;
}

export interface Lastcall {
  /** Register a shutdown handler. Overwrites same name with a warning. Throws during shutdown. */
  register(name: string, fn: HandlerFn, options?: HandlerOptions): void;
  /** Remove a handler by name. Throws during shutdown or when dependents exist. */
  unregister(name: string): boolean;
  /** Whether a handler with this name is registered. */
  hasHandler(name: string): boolean;
  /**
   * Snapshot of registered handlers (name, phase, priority, deps).
   * Useful for health dashboards, logging, and test assertions.
   */
  listHandlers(): readonly HandlerSummary[];
  /** Trigger shutdown manually. Idempotent. Returns exit code (0 or 1). */
  shutdown(reason?: string, signal?: ShutdownSignal): Promise<number>;
  /**
   * True once shutdown has been triggered — including after shutdown completes.
   * Use for health checks; pair with `isShutdownComplete()` when you need to know if work finished.
   */
  isShuttingDown(): boolean;
  /** True after shutdown has finished (success or failure). */
  isShutdownComplete(): boolean;
  /** Current lifecycle state of this instance. */
  getState(): LastcallState;
  /** Simulate a signal for testing (same path as a real OS signal). */
  simulateSignal(signal: ShutdownSignal): void;
  /** Register HTTP server drain. Call before server.listen(). */
  withHttpServer(server: HttpServerLike, options?: HttpServerOptions): void;
  on(event: 'beforeShutdown', listener: (payload: BeforeShutdownPayload) => void): void;
  on(event: 'afterShutdown', listener: (payload: { exitCode: number }) => void): void;
  on(event: 'handlerError', listener: (payload: HandlerEventPayload) => void): void;
  on(event: 'handlerCompleted', listener: (payload: HandlerEventPayload) => void): void;
  off(event: LastcallEvent, listener: (...args: never[]) => void): void;
}

export interface RegisteredHandler {
  name: string;
  fn: HandlerFn;
  priority: number;
  timeoutMs?: number | undefined;
  critical: boolean;
  deps: string[];
  phase: ShutdownPhase;
}

export type LastcallState = 'idle' | 'shutting_down' | 'done' | 'force_exit';

export interface ResolvedLastcallOptions {
  signals: readonly ShutdownSignal[];
  shutdownTimeoutMs: number;
  phases: readonly ShutdownPhase[];
  onHandlerStart?: LastcallOptions['onHandlerStart'];
  onHandlerEnd?: LastcallOptions['onHandlerEnd'];
  captureUncaughtException: boolean;
  captureUnhandledRejection: boolean;
  logger: (message: string, meta?: Record<string, unknown>) => void;
  exit?: LastcallOptions['exit'];
  autoExit: boolean;
}
