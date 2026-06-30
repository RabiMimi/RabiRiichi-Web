import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { YakuInfo } from '../domain/yakus';

interface YakuModalProps {
  isOpen: boolean;
  allowedYakus: Set<string>;
  onChange: (yakus: Set<string>) => void;
  onClose: () => void;
  availableYakus: YakuInfo[];
}

export function YakuModal({
  isOpen,
  allowedYakus,
  onChange,
  onClose,
  availableYakus,
}: YakuModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="yaku-modal-overlay">
      <div className="yaku-modal-content">
        <div className="yaku-modal-header-row">
          <h3>{t('lobby.configureYakus')}</h3>
          <div className="yaku-modal-actions">
            <button
              type="button"
              className="ui-button"
              onClick={() =>
                onChange(new Set(availableYakus.map((y) => y.name)))
              }
            >
              {t('lobby.selectAll')}
            </button>
            <button
              type="button"
              className="ui-button"
              onClick={() => onChange(new Set())}
            >
              {t('lobby.selectNone')}
            </button>
          </div>
        </div>
        <div className="yaku-list-container">
          {['1han', '2han', '3han', '6han', 'yakuman', 'other'].map((group) => {
            const groupYakus = availableYakus.filter((y) => y.group === group);
            if (groupYakus.length === 0) return null;
            return (
              <div key={group} className="yaku-group">
                <h4>{t(`yakuGroup.${group}`)}</h4>
                <div className="yaku-grid">
                  {groupYakus.map((yaku) => {
                    const isChecked = allowedYakus.has(yaku.name);
                    return (
                      <label key={yaku.name} className="yaku-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(allowedYakus);
                            if (isChecked) {
                              next.delete(yaku.name);
                            } else {
                              next.add(yaku.name);
                            }
                            onChange(next);
                          }}
                        />
                        {t(`yaku.${yaku.name}`)}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            type="button"
            className="ui-button primary-button"
            onClick={onClose}
          >
            {t('result.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
