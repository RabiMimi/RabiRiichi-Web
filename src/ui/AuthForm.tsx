import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { FORM } from './styles';

interface AuthFormProps {
  activeTab: 'login' | 'register';
  isConnecting: boolean;
  effectivePhase: 'idle' | 'connecting_public' | 'authenticating';
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  nickname: string;
  setNickname: (val: string) => void;
  error: string | null;
}

export function AuthForm({
  activeTab,
  isConnecting,
  effectivePhase,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  nickname,
  setNickname,
  error,
}: AuthFormProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <>
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

      {activeTab === 'register' && (
        <div className={FORM.group}>
          <label htmlFor="confirm-password" className={FORM.label}>
            {t('connect.confirmPassword')}
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            className={FORM.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isConnecting}
            placeholder={t('connect.confirmPasswordPlaceholder')}
            autoComplete="new-password"
          />
        </div>
      )}

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
    </>
  );
}
