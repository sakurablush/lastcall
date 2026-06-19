import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '..', 'fixtures');
const projectRoot = path.join(__dirname, '..', '..');

export interface RunFixtureOptions {
  /** OS signal to trigger after ready (IPC simulateSignal on Windows). */
  signal?: NodeJS.Signals;
  /** Max wait before SIGKILL on the child. Default: 15_000 ms. */
  timeoutMs?: number;
  /** Echo child stdout/stderr to the parent terminal. */
  mirrorOutput?: boolean;
  onReady?: (info: { pid: number | undefined }) => void;
}

export interface RunFixtureResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export function triggerOsSignal(child: ChildProcess, signal: NodeJS.Signals): void {
  if (process.platform === 'win32') {
    // Windows child.kill(SIGTERM/SIGINT) terminates abruptly — no JS handlers run.
    child.send?.(`signal:${signal}`);
    return;
  }

  child.kill(signal);
}

function killChildIfAlive(child: ChildProcess): void {
  if (child.exitCode === null && !child.killed) {
    child.kill('SIGKILL');
  }
}

/**
 * Spawn a fixture under test/fixtures/ and trigger shutdown when ready.
 * IPC fixtures: send 'shutdown' after process.send('ready').
 * OS signal fixtures: JSON {"event":"ready"} on stdout, then signal/simulateSignal.
 */
export function runFixture(
  name: string,
  options: RunFixtureOptions = {},
): Promise<RunFixtureResult> {
  const { signal = null, timeoutMs = 15_000, mirrorOutput = false, onReady } = options;

  return new Promise((resolve, reject) => {
    const fixturePath = path.join(fixturesDir, name);
    const child = spawn(process.execPath, ['--import', 'tsx', fixturePath], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let readyTriggered = false;
    let settled = false;

    const settle = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      handler();
    };

    const timer = setTimeout(() => {
      killChildIfAlive(child);
      settle(() => {
        reject(
          new Error(
            `Fixture ${name} timed out after ${timeoutMs}ms\nstdout: ${stdout}\nstderr: ${stderr}`,
          ),
        );
      });
    }, timeoutMs);

    const handleReady = () => {
      if (readyTriggered) {
        return;
      }
      readyTriggered = true;
      onReady?.({ pid: child.pid });

      if (signal) {
        triggerOsSignal(child, signal);
      } else {
        child.send?.('shutdown');
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      if (mirrorOutput) {
        process.stdout.write(text);
      }

      if (stdout.includes('"event":"ready"')) {
        handleReady();
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (mirrorOutput) {
        process.stderr.write(text);
      }
    });

    child.on('message', (msg: unknown) => {
      if (msg === 'ready') {
        handleReady();
      }
    });

    child.on('close', (exitCode) => {
      settle(() => resolve({ exitCode, stdout, stderr }));
    });

    child.on('error', (err) => {
      killChildIfAlive(child);
      settle(() => reject(err));
    });
  });
}
