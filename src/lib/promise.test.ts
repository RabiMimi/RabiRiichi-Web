import { describe, it, expect } from 'vitest';
import { sleep, waitTimeout } from './promise';
import { TimeoutError } from './errors';

describe('promise helpers', () => {
  describe('sleep', () => {
    it('should resolve after timeout', async () => {
      const start = Date.now();
      await sleep(50);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(40); // Allow some drift
    });
  });

  describe('waitTimeout', () => {
    it('should resolve if promise resolves before timeout', async () => {
      const p = sleep(10).then(() => 'success');
      const result = await waitTimeout(p, 50);
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError if promise takes too long', async () => {
      const p = sleep(100).then(() => 'success');
      await expect(waitTimeout(p, 20)).rejects.toThrow(TimeoutError);
    });

    it('should reject with original error if promise fails before timeout', async () => {
      const p = sleep(10).then(() => {
        throw new Error('failed');
      });
      await expect(waitTimeout(p, 50)).rejects.toThrow('failed');
    });
  });
});
