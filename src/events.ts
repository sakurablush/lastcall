import type { BeforeShutdownPayload, HandlerEventPayload, LastcallEvent } from './types.js';

type EventListener = (...args: never[]) => void;

export class LastcallEvents {
  private readonly listeners = new Map<LastcallEvent, Set<EventListener>>();

  on(event: LastcallEvent, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: LastcallEvent, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emitBeforeShutdown(payload: BeforeShutdownPayload): void {
    this.emit('beforeShutdown', payload as never);
  }

  emitAfterShutdown(payload: { exitCode: number }): void {
    this.emit('afterShutdown', payload as never);
  }

  emitHandlerError(payload: HandlerEventPayload): void {
    this.emit('handlerError', payload as never);
  }

  emitHandlerCompleted(payload: HandlerEventPayload): void {
    this.emit('handlerCompleted', payload as never);
  }

  private emit(event: LastcallEvent, payload: never): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(payload);
      } catch {
        // Event listener errors must not break shutdown
      }
    }
  }
}
