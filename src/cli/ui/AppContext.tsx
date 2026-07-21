/**
 * React context carrying the app-wide singletons the screens need: the shared
 * networking client, the key/value store, the current CLI settings (tile mode,
 * language) with a setter that persists changes, and a language-change bump so
 * the tree re-renders when translations change.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RabiRiichiClient } from '../../net/client';
import type { KeyValueStore } from '../../platform/storage';
import {
  type CliSettings,
  loadCliSettings,
  saveCliSettings,
} from '../settings';
import { setLanguage } from '../i18n';

export interface AppContextValue {
  client: RabiRiichiClient;
  store: KeyValueStore;
  settings: CliSettings;
  updateSettings: (patch: Partial<CliSettings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  client: RabiRiichiClient;
  store: KeyValueStore;
  children: ReactNode;
}

export function AppProvider({ client, store, children }: AppProviderProps) {
  const [settings, setSettings] = useState<CliSettings>(() =>
    loadCliSettings(store),
  );

  const value = useMemo<AppContextValue>(
    () => ({
      client,
      store,
      settings,
      updateSettings: (patch) => {
        const next = saveCliSettings(store, patch);
        setSettings(next);
        if (patch.language) {
          void setLanguage(patch.language);
        }
      },
    }),
    [client, store, settings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
