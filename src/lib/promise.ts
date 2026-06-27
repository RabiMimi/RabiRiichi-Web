import { TimeoutError } from './errors';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value: T) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}
