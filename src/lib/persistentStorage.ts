type PersistableStorage = Pick<StorageManager, 'persist' | 'persisted'>;

/**
 * Asks the browser not to evict this origin's storage under pressure.
 *
 * The precache holds the whole game, and Chrome otherwise clears it when the
 * phone runs low on space — the next launch then pays the full download again.
 * Chrome decides silently (installed apps are usually granted), so there is no
 * prompt to handle; a refusal just leaves the storage best-effort as before.
 */
export async function requestPersistentStorage(
  storage: PersistableStorage = navigator.storage,
): Promise<boolean> {
  if (await storage.persisted()) return true;
  return storage.persist();
}
