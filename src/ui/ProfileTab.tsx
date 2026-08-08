import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { formatError } from '../lib';
import { useSelf, useUsername } from '../state/store';
import { Button } from './Button';
import { Input } from './Input';
import { PasswordModal } from './PasswordModal';
import { FORM } from './styles';

export function ProfileTab(): React.JSX.Element {
  const { t } = useTranslation();
  const me = useSelf();
  const username = useUsername();
  const currentNickname = me?.nickname ?? '';

  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  // Re-sync the field when the stored nickname changes elsewhere (e.g. a
  // successful save), using the "adjust state during render" pattern so we
  // don't need an effect.
  const [lastKnownNickname, setLastKnownNickname] = useState(currentNickname);
  if (lastKnownNickname !== currentNickname) {
    setLastKnownNickname(currentNickname);
    setNickname(currentNickname);
  }

  if (!me) {
    return (
      <div className="p-6 text-center text-sm text-white/60">
        {t('settings.profile.notSignedIn')}
      </div>
    );
  }

  const trimmed = nickname.trim();
  const isDirty = trimmed !== currentNickname;

  const handleSave = async () => {
    if (saving) return;
    if (!trimmed) {
      setError(t('settings.profile.nicknameEmpty'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await rabiriichi.updateProfile(trimmed);
      setSaved(true);
    } catch (err) {
      setError(formatError(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4 p-3 sm:p-4 lg:p-6">
      {username && (
        <div className={FORM.group}>
          <label htmlFor="profile-username" className={FORM.label}>
            {t('settings.profile.username')}
          </label>
          <Input id="profile-username" value={username} readOnly disabled />
        </div>
      )}

      <div className={FORM.group}>
        <label htmlFor="profile-nickname" className={FORM.label}>
          {t('settings.profile.nickname')}
        </label>
        <Input
          id="profile-nickname"
          value={nickname}
          maxLength={16}
          placeholder={t('settings.profile.nicknamePlaceholder')}
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      {error && <div className={FORM.error}>{error}</div>}
      {saved && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/15 p-2.5 text-center text-sm text-green-400">
          {t('settings.profile.saved')}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsPasswordOpen(true)}
        >
          {t('settings.profile.changePassword')}
        </Button>
        <Button
          type="button"
          disabled={saving || !isDirty}
          onClick={() => void handleSave()}
        >
          {saving ? t('settings.profile.saving') : t('settings.profile.save')}
        </Button>
      </div>

      {isPasswordOpen && (
        <PasswordModal onClose={() => setIsPasswordOpen(false)} />
      )}
    </div>
  );
}
