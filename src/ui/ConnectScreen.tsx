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
import { SCREEN, FORM, MODAL } from './styles';
import { formatError } from '../lib/errors';

interface LanguageSelectorProps {
  language: string;
  onChange: (lang: string) => void;
}

function LanguageSelector({
  language,
  onChange,
}: LanguageSelectorProps): React.JSX.Element {
  return (
    <select
      value={language}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded bg-[#1a1a1a] text-white border border-[#555] cursor-pointer text-sm outline-none focus:border-[#ff7a99]"
    >
      <option value="zhs">简体中文</option>
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  );
}

interface TabSelectorProps {
  activeTab: 'login' | 'register';
  setActiveTab: (tab: 'login' | 'register') => void;
  disabled: boolean;
  setError: (err: string | null) => void;
}

function TabSelector({
  activeTab,
  setActiveTab,
  disabled,
  setError,
}: TabSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex border-b border-[#333] mb-4">
      <button
        type="button"
        className={`flex-1 py-2 text-center font-semibold text-sm transition-colors border-b-2 outline-none cursor-pointer ${
          activeTab === 'login'
            ? 'text-[#ff7a99] border-[#ff7a99]'
            : 'text-[#888] border-transparent hover:text-white'
        }`}
        onClick={() => {
          setActiveTab('login');
          setError(null);
        }}
        disabled={disabled}
      >
        {t('connect.loginTab')}
      </button>
      <button
        type="button"
        className={`flex-1 py-2 text-center font-semibold text-sm transition-colors border-b-2 outline-none cursor-pointer ${
          activeTab === 'register'
            ? 'text-[#ff7a99] border-[#ff7a99]'
            : 'text-[#888] border-transparent hover:text-white'
        }`}
        onClick={() => {
          setActiveTab('register');
          setError(null);
        }}
        disabled={disabled}
      >
        {t('connect.registerTab')}
      </button>
    </div>
  );
}

interface KickedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function KickedModal({
  isOpen,
  onClose,
}: KickedModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className={MODAL.overlay}>
      <div className={`${MODAL.card} ${MODAL.cardDefaultLook} max-w-[400px]`}>
        <div className={MODAL.header}>
          <h2 className={MODAL.title}>{t('connect.loginTab')}</h2>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={`${MODAL.body} text-center py-4 text-[#eee]`}>
          {t('connect.kickedByOtherClient')}
        </div>
        <div className={MODAL.footer}>
          <Button onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  );
}

export function ConnectScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const connectionStatus = useConnectionStatus();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [targetUrl, setTargetUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
  const [showKickedModal, setShowKickedModal] = useState(() => {
    if (rabiriichi.disconnectReason === 'kicked') {
      rabiriichi.disconnectReason = null;
      return true;
    }
    return false;
  });

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

    if (!username.trim()) {
      setError(t('connect.usernameError'));
      return;
    }

    if (!password) {
      setError(t('connect.passwordError'));
      return;
    }

    if (activeTab === 'register' && password.length < 6) {
      setError(t('connect.passwordTooShort'));
      return;
    }

    if (activeTab === 'register' && !nickname.trim()) {
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
      // 2. Authenticate
      if (activeTab === 'login') {
        await rabiriichi.loginUser(username.trim(), password);
      } else {
        await rabiriichi.registerUser(
          username.trim(),
          nickname.trim(),
          password,
        );
      }

      setConnectPhase('idle');
      try {
        const stored = localStorage.getItem(STORAGE_KEY_SERVER_SETTINGS);
        const settings: ServerSettings = stored
          ? (JSON.parse(stored) as ServerSettings)
          : {};
        if (activeTab === 'register') {
          settings.nickname = nickname.trim();
        }
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
      setError(formatError(err, t));
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
          <LanguageSelector
            language={i18n.language}
            onChange={(lang) => void i18n.changeLanguage(lang)}
          />
        </div>
        <p className={SCREEN.subtitle}>{t('connect.subtitle')}</p>

        {/* Tab Selector */}
        <TabSelector
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          disabled={isConnecting}
          setError={setError}
        />

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
            <label htmlFor="username" className={FORM.label}>
              {t('connect.username')}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={FORM.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.usernamePlaceholder')}
              maxLength={30}
              autoComplete="username"
            />
          </div>

          {activeTab === 'register' && (
            <div className={FORM.group}>
              <label htmlFor="nickname" className={FORM.label}>
                {t('connect.nickname')}
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                className={FORM.input}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isConnecting}
                placeholder={t('connect.nicknamePlaceholder')}
                maxLength={20}
                autoComplete="nickname"
              />
            </div>
          )}

          <div className={FORM.group}>
            <label htmlFor="password" className={FORM.label}>
              {t('connect.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={FORM.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isConnecting}
              placeholder={t('connect.passwordPlaceholder')}
              autoComplete={
                activeTab === 'login' ? 'current-password' : 'new-password'
              }
            />
          </div>

          {error && <div className={FORM.error}>{error}</div>}

          <Button type="submit" variant={isConnecting ? 'danger' : 'primary'}>
            {effectivePhase === 'connecting_public'
              ? t('connect.connectingPublic')
              : effectivePhase === 'authenticating'
                ? t('connect.authenticating')
                : activeTab === 'login'
                  ? t('connect.loginTab')
                  : t('connect.registerTab')}
          </Button>
        </form>
      </div>

      <KickedModal
        isOpen={showKickedModal}
        onClose={() => setShowKickedModal(false)}
      />
    </div>
  );
}
