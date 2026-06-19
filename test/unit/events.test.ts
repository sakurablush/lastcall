import { describe, expect, it, vi } from 'vitest';
import { LastcallEvents } from '../../src/events.js';
import { logProof } from '../helpers/test-logger.js';

describe('LastcallEvents', () => {
  it('emits beforeShutdown and afterShutdown', () => {
    const events = new LastcallEvents();
    const before = vi.fn();
    const after = vi.fn();

    events.on('beforeShutdown', before);
    events.on('afterShutdown', after);

    events.emitBeforeShutdown({ reason: 'test', signal: 'SIGTERM' });
    events.emitAfterShutdown({ exitCode: 0 });

    expect(before).toHaveBeenCalledWith({ reason: 'test', signal: 'SIGTERM' });
    expect(after).toHaveBeenCalledWith({ exitCode: 0 });
    logProof('lifecycle events delivered', { before: true, after: true });
  });

  it('emits handlerError and handlerCompleted', () => {
    const events = new LastcallEvents();
    const onError = vi.fn();
    const onCompleted = vi.fn();

    events.on('handlerError', onError);
    events.on('handlerCompleted', onCompleted);

    const payload = {
      name: 'db',
      phase: 'cleanup' as const,
      durationMs: 12,
      error: new Error('fail'),
    };

    events.emitHandlerError(payload);
    events.emitHandlerCompleted({ name: 'db', phase: 'cleanup', durationMs: 12 });

    expect(onError).toHaveBeenCalledWith(payload);
    expect(onCompleted).toHaveBeenCalled();
  });

  it('removes listeners with off', () => {
    const events = new LastcallEvents();
    const listener = vi.fn();
    events.on('beforeShutdown', listener);
    events.off('beforeShutdown', listener);
    events.emitBeforeShutdown({ reason: 'x' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('off is safe when event has no listeners', () => {
    const events = new LastcallEvents();
    const listener = vi.fn();
    expect(() => events.off('beforeShutdown', listener)).not.toThrow();
  });

  it('registers multiple listeners on the same event', () => {
    const events = new LastcallEvents();
    const first = vi.fn();
    const second = vi.fn();

    events.on('beforeShutdown', first);
    events.on('beforeShutdown', second);
    events.emitBeforeShutdown({ reason: 'x' });

    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  it('swallows errors thrown by event listeners', () => {
    const events = new LastcallEvents();
    events.on('beforeShutdown', () => {
      throw new Error('listener boom');
    });

    expect(() => events.emitBeforeShutdown({ reason: 'x' })).not.toThrow();
    logProof('listener errors do not break shutdown', true);
  });
});
