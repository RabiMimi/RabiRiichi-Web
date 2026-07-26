import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useConnectionStatus, useAutoConnectError } from '../state/store';
import { ServerSelector } from './ServerSelector';
import { CLIENT_VERSION } from '../transport/constants';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  type ServerSettings,
} from '../domain/constants';
import { SCREEN, FORM } from './styles';
import { formatError } from '../lib/errors';

import { LanguageSelector } from './LanguageSelector';
import { TabSelector } from './TabSelector';
import { KickedModal } from './KickedModal';
import { SavedAccountCard } from './SavedAccountCard';
import { AuthForm } from './AuthForm';

export function ConnectScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const connectionStatus = useConnectionStatus();
  const autoConnectError = useAutoConnectError();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [targetUrl, setTargetUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SERVER_SETTINGS);
      const settings = stored ? (JSON.parse(stored) as ServerSettings) : null;
      return settings?.nickname ?? '';
    } catch {
      return '';
    }
  });
  const [localError, setLocalError] = useState<string | null>(() => {
    const err = rabiriichi.autoConnectError;
    if (err) {
      rabiriichi.autoConnectError = null;
      return t(err);
    }
    return null;
  });
  const activeError =
    localError ?? (autoConnectError ? t(autoConnectError) : null);

  const setError = useCallback((val: string | null) => {
    setLocalError(val);
    rabiriichi.autoConnectError = null;
  }, []);
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

  const [bypassedUrls, setBypassedUrls] = useState<Set<string>>(
    () => new Set(),
  );

  const handleTargetUrlChange = useCallback((url: string) => {
    setTargetUrl(url);
    const credentials = rabiriichi.getCredentialsForServer(url);
    if (credentials?.username) {
      setUsername((current) => current || credentials.username);
    }
    setBypassedUrls((prev) => {
      if (prev.has(url)) {
        const next = new Set(prev);
        next.delete(url);
        return next;
      }
      return prev;
    });
  }, []);

  const savedCreds = useMemo(() => {
    return targetUrl ? rabiriichi.getCredentialsForServer(targetUrl) : null;
  }, [targetUrl]);

  const showSavedCard = useMemo(() => {
    return Boolean(
      savedCreds?.token &&
      !bypassedUrls.has(targetUrl) &&
      rabiriichi.autoConnectFailedUrl !== targetUrl,
    );
  }, [savedCreds, bypassedUrls, targetUrl]);

  const handleUseDifferentAccount = () => {
    if (targetUrl) {
      setBypassedUrls((prev) => {
        const next = new Set(prev);
        next.add(targetUrl);
        return next;
      });
    }
  };

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

    if (showSavedCard) {
      if (!savedCreds?.token) return;
      try {
        setConnectPhase('connecting_public');
        await rabiriichi.connect(targetUrl, savedCreds.token);

        if (rabiriichi.connectionStatus === 'disconnected') {
          throw new Error('aborted');
        }

        setConnectPhase('idle');
      } catch (err) {
        if (err instanceof Error && err.message === 'aborted') {
          return;
        }
        if (err instanceof Error && err.message.includes('Sign in failed')) {
          setError(t('connect.savedTokenExpiredError'));
        } else {
          setError(formatError(err, t));
        }
        setActiveTab('login');
        setBypassedUrls((prev) => {
          const next = new Set(prev);
          next.add(targetUrl);
          return next;
        });
        if (savedCreds.username) {
          setUsername(savedCreds.username);
        }
        rabiriichi.close();
        setConnectPhase('idle');
      }
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

    if (activeTab === 'register' && password !== confirmPassword) {
      setError(t('connect.passwordMismatch'));
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
      <div className="w-full max-w-3xl mx-auto flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12 p-6 md:p-10">
        {/* Left column: Logo + subtitle */}
        <div className="flex flex-col items-center justify-center gap-4 md:w-1/2">
          <img
            src="/assets/logo.png"
            alt="RabiRiichi"
            className="h-20 md:h-24 w-auto object-contain"
          />
          <p className="text-center text-sm text-white/50">
            {t('connect.subtitle')}
          </p>
          <div className="text-[0.75rem] text-[#555]">v{CLIENT_VERSION}</div>
        </div>

        {/* Right column: Form */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <LanguageSelector
              language={i18n.language}
              onChange={(lang) => void i18n.changeLanguage(lang)}
            />
          </div>

          {!showSavedCard && (
            <TabSelector
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              disabled={isConnecting}
              setError={setError}
            />
          )}

          <form onSubmit={onSubmit} className={FORM.form}>
            <div className={FORM.group}>
              <label htmlFor="server-select" className={FORM.label}>
                {t('connect.serverAddress')}
              </label>
              <ServerSelector
                onTargetUrlChange={handleTargetUrlChange}
                isConnecting={isConnecting}
              />
            </div>

            {showSavedCard && savedCreds ? (
              <SavedAccountCard
                savedCreds={savedCreds}
                isConnecting={isConnecting}
                effectivePhase={effectivePhase}
                error={activeError}
                onUseDifferentAccount={handleUseDifferentAccount}
              />
            ) : (
              <AuthForm
                activeTab={activeTab}
                isConnecting={isConnecting}
                effectivePhase={effectivePhase}
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                nickname={nickname}
                setNickname={setNickname}
                error={activeError}
              />
            )}
          </form>
        </div>
      </div>

      <KickedModal
        isOpen={showKickedModal}
        onClose={() => setShowKickedModal(false)}
      />
    </div>
  );
}
