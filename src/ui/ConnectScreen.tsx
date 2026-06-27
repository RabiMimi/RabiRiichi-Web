import React, { useState } from 'react';
import { rabiriichi } from '../net/client';
import { useConnectionStatus } from '../state/store';
import './ui.css';

export function ConnectScreen(): React.JSX.Element {
  const connectionStatus = useConnectionStatus();
  const [url, setUrl] = useState('ws://localhost:5150');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      setError('URL must start with ws:// or wss://');
      return;
    }

    if (!nickname.trim()) {
      setError('Nickname cannot be empty');
      return;
    }

    try {
      // 1. Connect to public socket first
      await rabiriichi.connect(url);
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
        <h1 className="ui-title">RabiRiichi</h1>
        <p className="ui-subtitle">Mahjong client</p>

        <form onSubmit={onSubmit} className="ui-form">
          <div className="form-group">
            <label htmlFor="server-url">Server Address</label>
            <input
              id="server-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isConnecting}
              placeholder="ws://localhost:5150"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isConnecting}
              placeholder="Enter your nickname"
              maxLength={20}
            />
          </div>

          {error && <div className="ui-error">{error}</div>}

          <button
            type="submit"
            className="ui-button primary-button"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
