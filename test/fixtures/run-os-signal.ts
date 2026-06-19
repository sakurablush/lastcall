/**
 * Spawns signal-os-shutdown.ts and triggers SIGTERM/SIGINT after "ready".
 * Safe: only affects the child process, not your shell or OS.
 *
 * Usage: npm run test:signal-os
 *        npm run test:signal-os -- SIGINT
 */
import { runFixture } from '../helpers/run-fixture.js';

type FixtureEvent = {
  event: string;
  [key: string]: unknown;
};

function parseLines(output: string): FixtureEvent[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as FixtureEvent;
      } catch {
        return { event: 'raw', line };
      }
    });
}

async function main(): Promise<void> {
  const signal = (process.argv[2] ?? 'SIGTERM') as NodeJS.Signals;
  const allowed: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  if (!allowed.includes(signal)) {
    console.error(`Unsupported signal "${signal}". Use SIGTERM or SIGINT.`);
    process.exit(1);
  }

  const delivery =
    process.platform === 'win32'
      ? `${signal} via simulateSignal (Windows IPC — same handler path)`
      : `${signal} via child.kill (real OS signal)`;

  console.log(`\n▶ Spawning child (fixture: signal-os-shutdown.ts)`);
  console.log(`▶ Will trigger shutdown: ${delivery}\n`);

  const result = await runFixture('signal-os-shutdown.ts', {
    signal,
    mirrorOutput: true,
    onReady: ({ pid }) => {
      console.log(`\n▶ Child ready (pid ${pid}) — triggering ${signal}\n`);
    },
  });

  const events = parseLines(result.stdout);
  const summary = {
    exitCode: result.exitCode,
    sawReady: events.some((e) => e.event === 'ready'),
    sawBeforeShutdown: events.some((e) => e.event === 'beforeShutdown'),
    sawHandler: events.some((e) => e.event === 'handler-ran'),
    sawAfterShutdown: events.some((e) => e.event === 'afterShutdown'),
    handlerSignal: events.find((e) => e.event === 'handler-ran')?.signal ?? null,
    shutdownReason: events.find((e) => e.event === 'beforeShutdown')?.reason ?? null,
    delivery: process.platform === 'win32' ? 'simulateSignal' : 'os-kill',
  };

  console.log('\n── Summary ──');
  console.log(JSON.stringify(summary, null, 2));

  const ok =
    summary.exitCode === 0 &&
    summary.sawReady &&
    summary.sawBeforeShutdown &&
    summary.sawHandler &&
    summary.sawAfterShutdown;

  if (!ok) {
    console.error('\n✗ OS signal shutdown test FAILED');
    process.exit(1);
  }

  console.log(`\n✓ Shutdown via ${signal} worked correctly (${summary.delivery})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
