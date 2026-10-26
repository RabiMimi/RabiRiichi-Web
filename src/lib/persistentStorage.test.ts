import { describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './persistentStorage';

function fakeStorage(persisted: boolean, granted: boolean) {
  return {
    persisted: vi.fn(() => Promise.resolve(persisted)),
    persist: vi.fn(() => Promise.resolve(granted)),
  };
}

describe('requestPersistentStorage', () => {
  it('does not ask again once storage is already persistent', async () => {
    const storage = fakeStorage(true, false);
    await expect(requestPersistentStorage(storage)).resolves.toBe(true);
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it('asks when storage is still best-effort, and reports the answer', async () => {
    const storage = fakeStorage(false, true);
    await expect(requestPersistentStorage(storage)).resolves.toBe(true);
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it('reports a refusal', async () => {
    await expect(
      requestPersistentStorage(fakeStorage(false, false)),
    ).resolves.toBe(false);
  });
});
