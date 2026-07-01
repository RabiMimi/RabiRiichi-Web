import { useTranslation } from 'react-i18next';
import type { YakuInfo } from '../domain/yakus';

interface YakuSettingsTabProps {
  allowedYakus: Set<string>;
  onChange: (yakus: Set<string>) => void;
  availableYakus: YakuInfo[];
}

export function YakuSettingsTab({
  allowedYakus,
  onChange,
  availableYakus,
}: YakuSettingsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="yaku-settings-tab">
      <div
        className="yaku-tab-actions"
        style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}
      >
        <button
          type="button"
          className="ui-button secondary-button"
          onClick={() => onChange(new Set(availableYakus.map((y) => y.name)))}
          style={{ padding: '4px 10px', fontSize: '0.78rem', height: '26px' }}
        >
          {t('lobby.selectAll')}
        </button>
        <button
          type="button"
          className="ui-button secondary-button"
          onClick={() => onChange(new Set())}
          style={{ padding: '4px 10px', fontSize: '0.78rem', height: '26px' }}
        >
          {t('lobby.selectNone')}
        </button>
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
    </div>
  );
}
