import { describe, it, expect } from 'vitest';
import { Deferred } from './deferred';

describe('Deferred', () => {
  it('should resolve the promise when resolve is called', async () => {
    const deferred = new Deferred<number>();
    deferred.resolve(42);
    const result = await deferred.promise;
    expect(result).toBe(42);
  });

  it('should reject the promise when reject is called', async () => {
    const deferred = new Deferred<number>();
    const error = new Error('Failed');
    deferred.reject(error);
    await expect(deferred.promise).rejects.toThrow('Failed');
  });
});
