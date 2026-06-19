import { describe, expect, it } from 'vitest';
import { waitForAbort } from '../../src/shutdown-runner.js';
import { logProof } from '../helpers/test-logger.js';

describe('waitForAbort', () => {
  it('resolves immediately when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(waitForAbort(controller.signal)).resolves.toBeUndefined();
    logProof('waitForAbort fast-path when aborted', true);
  });

  it('resolves when signal aborts later', async () => {
    const controller = new AbortController();
    const promise = waitForAbort(controller.signal);
    controller.abort();
    await expect(promise).resolves.toBeUndefined();
    logProof('waitForAbort listens for abort event', true);
  });
});
