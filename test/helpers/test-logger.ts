/**
 * Verbose test logging — enabled only when:
 *   LASTCALL_TEST_LOG=1  npm run test:log
 *   TEST_VERBOSE=1       npm run test:log (alias)
 *
 * Normal `npm test` runs silently.
 */

export function isTestLogEnabled(): boolean {
  return process.env.LASTCALL_TEST_LOG === '1' || process.env.TEST_VERBOSE === '1';
}

export function logStep(step: string, detail?: Record<string, unknown>): void {
  if (!isTestLogEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[lastcall:test ${timestamp}]`;

  if (detail && Object.keys(detail).length > 0) {
    console.log(`${prefix} ${step}`, JSON.stringify(detail, null, 2));
  } else {
    console.log(`${prefix} ${step}`);
  }
}

export function logProof(claim: string, evidence: unknown): void {
  if (!isTestLogEnabled()) {
    return;
  }

  console.log(`[lastcall:proof] ✓ ${claim}`, evidence);
}
