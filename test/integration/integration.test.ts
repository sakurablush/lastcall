import { describe, expect, it } from 'vitest';
import { runFixture } from '../helpers/run-fixture.js';
import { logProof, logStep } from '../helpers/test-logger.js';

/** child_process IPC fixtures — see test/helpers/run-fixture.ts */

describe('integration: child process shutdown', () => {
  it('gracefully shuts down in child process (IPC)', async () => {
    const result = await runFixture('signal-shutdown.ts', {
      onReady: ({ pid }) => logStep('fixture signal-shutdown.ts ready', { pid }),
    });

    expect(result.stdout).toContain('handler-ran');
    expect(result.exitCode).toBe(0);
    logProof('child process graceful shutdown', result.stdout);
  }, 20_000);

  it('drains HTTP server in child process', async () => {
    const result = await runFixture('http-drain.ts', {
      onReady: ({ pid }) => logStep('fixture http-drain.ts ready', { pid }),
    });

    expect(result.stdout).toContain('request-done');
    expect(result.stdout).toContain('server-closed');
    expect(result.exitCode).toBe(0);
    logProof('HTTP drain in child process', result.stdout);
  }, 20_000);

  it('shuts down child process on OS SIGTERM', async () => {
    const result = await runFixture('signal-os-shutdown.ts', {
      signal: 'SIGTERM',
      onReady: ({ pid }) => logStep('fixture signal-os-shutdown.ts ready', { pid }),
    });

    expect(result.stdout).toContain('"event":"handler-ran"');
    expect(result.stdout).toContain('"signal":"SIGTERM"');
    expect(result.stdout).toContain('"event":"afterShutdown"');
    expect(result.exitCode).toBe(0);
    logProof('OS SIGTERM graceful shutdown', result.stdout);
  }, 20_000);

  it('shuts down child process on OS SIGINT', async () => {
    const result = await runFixture('signal-os-shutdown.ts', {
      signal: 'SIGINT',
    });

    expect(result.stdout).toContain('"signal":"SIGINT"');
    expect(result.exitCode).toBe(0);
  }, 20_000);
});
