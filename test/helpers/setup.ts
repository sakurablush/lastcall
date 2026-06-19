import { afterEach, beforeEach, vi } from 'vitest';
import { isTestLogEnabled, logStep } from './test-logger.js';

beforeEach((ctx) => {
  if (isTestLogEnabled()) {
    logStep(`START ${ctx.task.name}`, { file: ctx.task.suite?.name });
  }
});

afterEach((ctx) => {
  vi.useRealTimers();

  if (isTestLogEnabled()) {
    logStep(`END ${ctx.task.name}`, {
      status: ctx.task.result?.state ?? 'unknown',
      durationMs: ctx.task.result?.duration,
    });
  }
});
