import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SERVERS } from '../config/servers';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  type ServerSettings,
  type SavedServer,
} from '../domain/constants';

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
      loadServerSettings().selectedId ??
      DEFAULT_SERVERS[0]?.id ??
      'custom'
    );
  });

  // Unified form state — pre-filled when a custom server is selected
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('ws://localhost:5150');

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
      : selectedCustomServer
        ? selectedCustomServer.url
        : formUrl;
    onTargetUrlChange(targetUrl);
  }, [selectedDefaultServer, selectedCustomServer, formUrl, onTargetUrlChange]);

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
      <select
        id="server-select"
        value={serverSelection}
        onChange={(e) => {
          handleSelectionChange(e.target.value);
        }}
        disabled={isConnecting}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          border: '1px solid #555',
          boxSizing: 'border-box',
          marginBottom: '0',
        }}
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
      </select>

      {/* Read-only URL for default servers */}
      {selectedDefaultServer && (
        <input
          type="text"
          value={selectedDefaultServer.url}
          disabled={true}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: '#1a1a1a',
            color: '#888',
            border: '1px solid #333',
            boxSizing: 'border-box',
            marginTop: '4px',
          }}
        />
      )}

      {/* Unified add/edit form for custom servers */}
      {showForm && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '4px',
          }}
        >
          <input
            id="server-url"
            type="text"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            disabled={isConnecting}
            placeholder="ws://localhost:5150"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.serverNamePlaceholder')}
              style={{
                flexGrow: 1,
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: '1px solid #555',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleSaveServer}
              disabled={isConnecting || !formName.trim() || !formUrl.trim()}
              className="ui-button secondary-button"
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            >
              {t('connect.saveServer')}
            </button>
          </div>
          {selectedCustomServer && (
            <button
              type="button"
              onClick={handleRemoveCustomServer}
              disabled={isConnecting}
              className="ui-button secondary-button"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '0.9rem',
                backgroundColor: '#551111',
                borderColor: '#772222',
                color: '#ff9999',
              }}
            >
              {t('connect.removeServer')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
