import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerCredentials } from '../net/credentialStore';
import { Button } from './Button';
import { FORM } from './styles';

interface SavedAccountCardProps {
  savedCreds: ServerCredentials;
  isConnecting: boolean;
  effectivePhase: 'idle' | 'connecting_public' | 'authenticating';
  error: string | null;
  onUseDifferentAccount: () => void;
}

export function SavedAccountCard({
  savedCreds,
  isConnecting,
  effectivePhase,
  error,
  onUseDifferentAccount,
}: SavedAccountCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 shadow-inner">
        <div className="w-12 h-12 rounded-full bg-[#ff7a99]/15 border border-[#ff7a99]/30 flex items-center justify-center text-xl font-bold text-[#ff7a99] select-none shrink-0">
          {(savedCreds.nickname || savedCreds.username || '?')
            .substring(0, 1)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 font-medium">
            {t('connect.savedAccountCardTitle')}
          </div>
          <div className="text-base font-bold text-[#eee] truncate">
            {savedCreds.nickname || savedCreds.username}
          </div>
          <div className="text-xs text-white/40 truncate">
            {t('connect.savedAccountUsername', {
              username: savedCreds.username,
            })}
          </div>
        </div>
      </div>

      {error && <div className={FORM.error}>{error}</div>}

      <Button
        type="submit"
        variant={isConnecting ? 'danger' : 'primary'}
        className="w-full"
      >
        {effectivePhase === 'connecting_public'
          ? t('connect.connectingPublic')
          : effectivePhase === 'authenticating'
            ? t('connect.authenticating')
            : t('connect.loginAsButton', {
                nickname: savedCreds.nickname || savedCreds.username,
              })}
      </Button>

      <button
        type="button"
        onClick={onUseDifferentAccount}
        className="bg-transparent border-none text-[#ff7a99] hover:underline cursor-pointer text-xs font-semibold self-center outline-none"
        disabled={isConnecting}
      >
        {t('connect.useDifferentAccountButton')}
      </button>
    </div>
  );
}
