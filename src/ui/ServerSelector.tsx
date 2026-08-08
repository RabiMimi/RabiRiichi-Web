import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SERVERS } from '../config/servers';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  type ServerSettings,
  type SavedServer,
} from '../domain/constants';
import { Button } from './Button';
import { Select } from './Select';
import { FORM } from './styles';

interface ServerSelectorProps {
  onTargetUrlChange: (url: string) => void;
  isConnecting: boolean;
}

const loadServerSettings = (): ServerSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SERVER_SETTINGS);
    return stored ? (JSON.parse(stored) as ServerSettings) : {};
  } catch {
    return {};
  }
};

const saveServerSettings = (settings: ServerSettings) => {
  localStorage.setItem(STORAGE_KEY_SERVER_SETTINGS, JSON.stringify(settings));
};

export function ServerSelector({
  onTargetUrlChange,
  isConnecting,
}: ServerSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  const [customServers, setCustomServers] = useState<SavedServer[]>(() => {
    return loadServerSettings().customServers ?? [];
  });

  const [serverSelection, setServerSelection] = useState<string>(() => {
    return (
      loadServerSettings().selectedId ?? DEFAULT_SERVERS[0]?.id ?? 'custom'
    );
  });

  // Unified form state — pre-filled when a custom server is selected
  const [formName, setFormName] = useState(() => {
    const custom = customServers.find((s) => s.id === serverSelection);
    return custom ? custom.name : '';
  });
  const [formUrl, setFormUrl] = useState(() => {
    const custom = customServers.find((s) => s.id === serverSelection);
    return custom ? custom.url : 'ws://localhost:5150';
  });

  const selectedDefaultServer = DEFAULT_SERVERS.find(
    (s) => s.id === serverSelection,
  );
  const selectedCustomServer = customServers.find(
    (s) => s.id === serverSelection,
  );

  const handleSelectionChange = (id: string) => {
    setServerSelection(id);
    const settings = loadServerSettings();
    settings.selectedId = id;
    saveServerSettings(settings);
    const custom = customServers.find((s) => s.id === id);
    if (custom) {
      setFormName(custom.name);
      setFormUrl(custom.url);
    } else if (id === 'custom') {
      setFormName('');
      setFormUrl('ws://localhost:5150');
    }
  };

  // Propagate the resolved target URL to parent
  useEffect(() => {
    const targetUrl = selectedDefaultServer
      ? selectedDefaultServer.url
      : formUrl;
    onTargetUrlChange(targetUrl);
  }, [selectedDefaultServer, formUrl, onTargetUrlChange]);

  const handleSaveServer = () => {
    const serverName = formName.trim();
    const url = formUrl.trim();
    if (!serverName || !url) return;

    const existing = customServers.find((s) => s.name === serverName);
    let updated: SavedServer[];
    let savedId: string;

    if (existing) {
      // Overwrite by name
      savedId = existing.id;
      updated = customServers.map((s) =>
        s.name === serverName ? { ...s, url } : s,
      );
    } else {
      // Create new
      savedId = `custom-${Date.now()}`;
      updated = [...customServers, { id: savedId, name: serverName, url }];
    }

    setCustomServers(updated);
    setServerSelection(savedId);

    const settings = loadServerSettings();
    settings.customServers = updated;
    settings.selectedId = savedId;
    saveServerSettings(settings);
  };

  const handleRemoveCustomServer = () => {
    if (!selectedCustomServer) return;

    const updated = customServers.filter((s) => s.id !== serverSelection);
    setCustomServers(updated);
    const fallbackId = DEFAULT_SERVERS[0]?.id ?? 'custom';
    setServerSelection(fallbackId);

    const settings = loadServerSettings();
    settings.customServers = updated;
    settings.selectedId = fallbackId;
    saveServerSettings(settings);
  };

  // Show the save form when adding a new custom server or editing an existing one
  const showForm =
    serverSelection === 'custom' || Boolean(selectedCustomServer);

  return (
    <>
      <Select
        id="server-select"
        value={serverSelection}
        onChange={(e) => {
          handleSelectionChange(e.target.value);
        }}
        disabled={isConnecting}
        className="w-full mb-0"
      >
        {DEFAULT_SERVERS.map((server) => (
          <option key={server.id} value={server.id}>
            {t(server.nameKey)}
          </option>
        ))}
        {customServers.map((server) => (
          <option key={server.id} value={server.id}>
            {server.name}
          </option>
        ))}
        <option value="custom">{t('connect.customServer')}</option>
      </Select>

      {/* Read-only URL for default servers */}
      {selectedDefaultServer && (
        <input
          type="text"
          value={selectedDefaultServer.url}
          disabled={true}
          className={`${FORM.input} w-full text-[#888] border-[#333] mt-1`}
        />
      )}

      {/* Unified add/edit form for custom servers */}
      {showForm && (
        <div className="flex flex-col gap-1.5 mt-1">
          <input
            id="server-url"
            type="text"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            disabled={isConnecting}
            placeholder="ws://localhost:5150"
            className={`${FORM.input} w-full`}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.serverNamePlaceholder')}
              className={`${FORM.input} flex-grow min-w-0`}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveServer}
              disabled={isConnecting || !formName.trim() || !formUrl.trim()}
              className="px-4 py-2 text-[0.9rem] whitespace-nowrap shrink-0"
            >
              {t('connect.saveServer')}
            </Button>
          </div>
          {selectedCustomServer && (
            <button
              type="button"
              onClick={handleRemoveCustomServer}
              disabled={isConnecting}
              className="w-full rounded-full border border-[#772222] bg-[#551111] px-5 py-2.5 text-[0.9rem] font-semibold text-[#ff9999] cursor-pointer transition-all duration-200 hover:not-disabled:bg-[#772222]/80 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            >
              {t('connect.removeServer')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
