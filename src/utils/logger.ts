export function defaultLastcallLogger(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.error(`[lastcall] ${message}`, meta);
  } else {
    console.error(`[lastcall] ${message}`);
  }
}
