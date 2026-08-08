import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { formatError } from '../lib';
import { Button } from './Button';
import { FORM, MODAL } from './styles';

interface PasswordModalProps {
  onClose: () => void;
}

const MIN_PASSWORD_LENGTH = 6;

export function PasswordModal({
  onClose,
}: PasswordModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!current || !next || !confirmPw) {
      setError(t('settings.password.empty'));
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(t('settings.password.tooShort'));
      return;
    }
    if (next !== confirmPw) {
      setError(t('settings.password.mismatch'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await rabiriichi.changePassword(current, next);
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirmPw('');
    } catch (err) {
      setError(formatError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} ${MODAL.cardDefaultLook}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL.header}>
          <h2 className={MODAL.title}>{t('settings.password.title')}</h2>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={FORM.form} onSubmit={(e) => void handleSubmit(e)}>
          <div className={FORM.group}>
            <label htmlFor="current-password" className={FORM.label}>
              {t('settings.password.current')}
            </label>
            <input
              id="current-password"
              type="password"
              className={FORM.input}
              value={current}
              autoComplete="current-password"
              placeholder={t('settings.password.currentPlaceholder')}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div className={FORM.group}>
            <label htmlFor="new-password" className={FORM.label}>
              {t('settings.password.new')}
            </label>
            <input
              id="new-password"
              type="password"
              className={FORM.input}
              value={next}
              autoComplete="new-password"
              placeholder={t('settings.password.newPlaceholder')}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>

          <div className={FORM.group}>
            <label htmlFor="confirm-password" className={FORM.label}>
              {t('settings.password.confirm')}
            </label>
            <input
              id="confirm-password"
              type="password"
              className={FORM.input}
              value={confirmPw}
              autoComplete="new-password"
              placeholder={t('settings.password.confirmPlaceholder')}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </div>

          {error && <div className={FORM.error}>{error}</div>}
          {success && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/15 p-2.5 text-center text-sm text-green-400">
              {t('settings.password.success')}
            </div>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('settings.password.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t('settings.password.submitting')
                : t('settings.password.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
