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
      <div className="yaku-list-container">
        {['1han', '2han', '3han', '6han', 'yakuman', 'other'].map((group) => {
          const groupYakus = availableYakus.filter((y) => y.group === group);
          if (groupYakus.length === 0) return null;

          const allSelected = groupYakus.every((y) => allowedYakus.has(y.name));
          const noneSelected = groupYakus.every(
            (y) => !allowedYakus.has(y.name),
          );
          const indeterminate = !allSelected && !noneSelected;

          return (
            <div key={group} className="yaku-group">
              <div className="yaku-group-header">
                <h4>{t(`yakuGroup.${group}`)}</h4>
                <label className="yaku-group-toggle">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = indeterminate;
                      }
                    }}
                    onChange={() => {
                      const next = new Set(allowedYakus);
                      if (allSelected) {
                        groupYakus.forEach((y) => next.delete(y.name));
                      } else {
                        groupYakus.forEach((y) => next.add(y.name));
                      }
                      onChange(next);
                    }}
                  />
                  {t('lobby.toggleAll')}
                </label>
              </div>
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
