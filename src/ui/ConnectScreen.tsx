import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useConnectionStatus } from '../state/store';
import { ServerSelector } from './ServerSelector';
import { CLIENT_VERSION } from '../transport/constants';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  type ServerSettings,
} from '../domain/constants';
import { Button } from './Button';
import { SCREEN, FORM } from './styles';

export function ConnectScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const connectionStatus = useConnectionStatus();

  const [targetUrl, setTargetUrl] = useState('');
  const [nickname, setNickname] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SERVER_SETTINGS);
      const settings = stored ? (JSON.parse(stored) as ServerSettings) : null;
      return settings?.nickname ?? '';
    } catch {
      return '';
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [connectPhase, setConnectPhase] = useState<
    'idle' | 'connecting_public' | 'authenticating'
  >('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (connectPhase !== 'idle' || connectionStatus === 'connecting') {
      rabiriichi.close();
      setConnectPhase('idle');
      setError(t('connect.cancelled'));
      return;
    }

    setError(null);

    if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
      setError(t('connect.urlError'));
      return;
    }

    if (!nickname.trim()) {
      setError(t('connect.nicknameError'));
      return;
    }

    try {
      setConnectPhase('connecting_public');
      // 1. Connect to public socket first
      await rabiriichi.connect(targetUrl);

      // Check if cancelled
      if (rabiriichi.connectionStatus === 'disconnected') {
        throw new Error('aborted');
      }

      setConnectPhase('authenticating');
      // 2. Register user (which gets token and reconnects with token)
      await rabiriichi.registerUser(nickname.trim());

      setConnectPhase('idle');
      try {
        const stored = localStorage.getItem(STORAGE_KEY_SERVER_SETTINGS);
        const settings: ServerSettings = stored
          ? (JSON.parse(stored) as ServerSettings)
          : {};
        settings.nickname = nickname.trim();
        localStorage.setItem(
          STORAGE_KEY_SERVER_SETTINGS,
          JSON.stringify(settings),
        );
      } catch {
        // ignore
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'aborted') {
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      // Close client on error to clean up
      rabiriichi.close();
      setConnectPhase('idle');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    void handleSubmit(e);
  };

  let effectivePhase: 'idle' | 'connecting_public' | 'authenticating' =
    connectPhase;
  if (connectionStatus === 'connecting' && connectPhase === 'idle') {
    effectivePhase = rabiriichi.accessToken
      ? 'authenticating'
      : 'connecting_public';
  }

  const isConnecting = effectivePhase !== 'idle';

  return (
    <div className={SCREEN.base}>
      <div className={`${SCREEN.card} relative`}>
        <div className="absolute top-2 left-3 text-[0.8rem] text-[#666]">
          v{CLIENT_VERSION}
        </div>
        {/* Title row with language switcher */}
        <div className="flex justify-between items-center mb-2">
          <h1 className={SCREEN.title} style={{ margin: 0 }}>
            RabiRiichi
          </h1>
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            className="px-2 py-1 rounded bg-[#1a1a1a] text-white border border-[#555] cursor-pointer text-sm outline-none focus:border-[#ff7a99]"
          >
            <option value="zhs">简体中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        <p className={SCREEN.subtitle}>{t('connect.subtitle')}</p>

        <form onSubmit={onSubmit} className={FORM.form}>
          <div className={FORM.group}>
            <label htmlFor="server-select" className={FORM.label}>
              {t('connect.serverAddress')}
            </label>
            <ServerSelector
              onTargetUrlChange={setTargetUrl}
              isConnecting={isConnecting}
            />
          </div>

          <div className={FORM.group}>
            <label htmlFor="nickname" className={FORM.label}>
              {t('connect.nickname')}
            </label>
            <input
              id="nickname"
              type="text"
              className={FORM.input}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.nicknamePlaceholder')}
              maxLength={20}
            />
          </div>

          {error && <div className={FORM.error}>{error}</div>}

          <Button type="submit" variant={isConnecting ? 'danger' : 'primary'}>
            {effectivePhase === 'connecting_public'
              ? t('connect.connectingPublic')
              : effectivePhase === 'authenticating'
                ? t('connect.authenticating')
                : t('connect.connect')}
          </Button>
        </form>
      </div>
    </div>
  );
}
