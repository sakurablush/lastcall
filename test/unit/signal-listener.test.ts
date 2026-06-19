import { describe, expect, it, vi } from 'vitest';
import { SignalListener } from '../../src/signal-listener.js';
import type { ShutdownSignal } from '../../src/types.js';
import { logProof, logStep } from '../helpers/test-logger.js';

describe('SignalListener', () => {
  it('registers signal handlers once', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGTERM', 'SIGINT'],
      onSignal,
    });

    const onceSpy = vi.spyOn(process, 'once');
    listener.register();
    listener.register();

    expect(onceSpy).toHaveBeenCalledTimes(2);
    logProof('duplicate register is idempotent', onceSpy.mock.calls.length);

    listener.dispose();
    onceSpy.mockRestore();
  });

  it('skips unsupported signals', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGTERM', 'NOT_A_SIGNAL' as ShutdownSignal],
      onSignal,
    });

    const onceSpy = vi.spyOn(process, 'once');
    listener.register();

    expect(onceSpy).toHaveBeenCalledTimes(1);
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    listener.dispose();
    onceSpy.mockRestore();
  });

  it('handles process.once throwing for unavailable signals', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGHUP'],
      onSignal,
    });

    const onceSpy = vi.spyOn(process, 'once').mockImplementation(() => {
      throw new Error('signal not supported');
    });

    expect(() => listener.register()).not.toThrow();
    logProof('unavailable platform signals are skipped', true);

    onceSpy.mockRestore();
  });

  it('simulate invokes bound handler', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGTERM'],
      onSignal,
    });

    listener.register();
    listener.simulate('SIGTERM');

    expect(onSignal).toHaveBeenCalledWith('SIGTERM');
    logStep('simulate triggered handler', { signal: 'SIGTERM' });

    listener.dispose();
  });

  it('simulate calls onSignal directly when handler not bound', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGINT'],
      onSignal,
    });

    listener.simulate('SIGINT');
    expect(onSignal).toHaveBeenCalledWith('SIGINT');
    logProof('simulate works before register', true);
  });

  it('dispose removes all listeners', () => {
    const onSignal = vi.fn();
    const listener = new SignalListener({
      signals: ['SIGTERM'],
      onSignal,
    });

    listener.register();
    const removeSpy = vi.spyOn(process, 'removeListener');
    listener.dispose();

    expect(removeSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(listener).toBeDefined();

    removeSpy.mockRestore();
  });
});
