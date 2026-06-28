import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useConnectionStatus } from '../state/store';
import './ui.css';

export function ConnectScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const connectionStatus = useConnectionStatus();
  const OFFICIAL_SERVER = 'wss://riichi-server.rabimimi.com';
  const LOCAL_SERVER = 'ws://localhost:5150';

  const [serverSelection, setServerSelection] = useState<'official' | 'local' | 'custom'>('official');
  const [customUrl, setCustomUrl] = useState(LOCAL_SERVER);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetUrl =
      serverSelection === 'official'
        ? OFFICIAL_SERVER
        : serverSelection === 'local'
          ? LOCAL_SERVER
          : customUrl;

    if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
      setError(t('connect.urlError'));
      return;
    }

    if (!nickname.trim()) {
      setError(t('connect.nicknameError'));
      return;
    }

    try {
      // 1. Connect to public socket first
      await rabiriichi.connect(targetUrl);
      // 2. Register user (which gets token and reconnects with token)
      await rabiriichi.registerUser(nickname.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Close client on error to clean up
      rabiriichi.close();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    void handleSubmit(e);
  };

  const isConnecting = connectionStatus === 'connecting';

  return (
    <div className="ui-screen connect-screen">
      <div className="ui-card connect-card">
        {/* Title row with language switcher */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <h1 className="ui-title" style={{ margin: 0 }}>
            RabiRiichi
          </h1>
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            className="language-selector"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <option value="zhs">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <p className="ui-subtitle">{t('connect.subtitle')}</p>

        <form onSubmit={onSubmit} className="ui-form">
          <div className="form-group">
            <label htmlFor="server-select">{t('connect.serverAddress')}</label>
            <select
              id="server-select"
              value={serverSelection}
              onChange={(e) => {
                const val = e.target.value as 'official' | 'local' | 'custom';
                setServerSelection(val);
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
                marginBottom: serverSelection === 'custom' ? '8px' : '0',
              }}
            >
              <option value="official">{t('connect.officialServer')}</option>
              <option value="local">{t('connect.localServer')}</option>
              <option value="custom">{t('connect.customServer')}</option>
            </select>

            {serverSelection === 'custom' && (
              <input
                id="server-url"
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={isConnecting}
                placeholder="ws://localhost:5150"
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="nickname">{t('connect.nickname')}</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.nicknamePlaceholder')}
              maxLength={20}
            />
          </div>

          {error && <div className="ui-error">{error}</div>}

          <button
            type="submit"
            className="ui-button primary-button"
            disabled={isConnecting}
          >
            {isConnecting ? t('connect.connecting') : t('connect.connect')}
          </button>
        </form>
      </div>
    </div>
  );
}
