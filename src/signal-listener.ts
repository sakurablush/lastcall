import type { ShutdownSignal } from './types.js';

export interface SignalListenerOptions {
  signals: readonly ShutdownSignal[];
  onSignal: (signal: ShutdownSignal) => void;
}

const SUPPORTED_SIGNALS: ShutdownSignal[] = ['SIGTERM', 'SIGINT', 'SIGHUP'];

export class SignalListener {
  private registered = false;
  private readonly boundHandlers = new Map<ShutdownSignal, () => void>();

  constructor(private readonly options: SignalListenerOptions) {}

  register(): void {
    if (this.registered) {
      return;
    }

    for (const signal of this.options.signals) {
      if (!SUPPORTED_SIGNALS.includes(signal)) {
        continue;
      }

      const handler = () => {
        this.options.onSignal(signal);
      };

      this.boundHandlers.set(signal, handler);

      try {
        process.once(signal, handler);
      } catch {
        // Some signals may not be available on all platforms (e.g. SIGHUP on Windows)
      }
    }

    this.registered = true;
  }

  simulate(signal: ShutdownSignal): void {
    const handler = this.boundHandlers.get(signal);
    if (handler) {
      handler();
      return;
    }

    this.options.onSignal(signal);
  }

  dispose(): void {
    for (const [signal, handler] of this.boundHandlers) {
      process.removeListener(signal, handler);
    }
    this.boundHandlers.clear();
    this.registered = false;
  }
}
