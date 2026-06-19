import { describe, expect, it, vi } from 'vitest';
import { defaultLastcallLogger } from '../../src/utils/logger.js';
import { logProof } from '../helpers/test-logger.js';

describe('defaultLastcallLogger', () => {
  it('logs with metadata', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    defaultLastcallLogger('with-meta', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[lastcall] with-meta', { key: 'value' });
    spy.mockRestore();
    logProof('logger writes meta branch', true);
  });

  it('logs without metadata', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    defaultLastcallLogger('plain message');
    expect(spy).toHaveBeenCalledWith('[lastcall] plain message');
    spy.mockRestore();
    logProof('logger writes plain branch', true);
  });
});
