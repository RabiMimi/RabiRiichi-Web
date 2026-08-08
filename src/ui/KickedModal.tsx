import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { MODAL } from './styles';

interface KickedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KickedModal({
  isOpen,
  onClose,
}: KickedModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}
