import { useTranslation } from 'react-i18next';
import { Toggle } from './Toggle';
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
    <div className="flex flex-col flex-1">
      <div className="flex-1 max-h-[250px] overflow-y-auto pr-2 flex flex-col gap-4">
        {['1han', '2han', '3han', '6han', 'yakuman', 'koten', 'other'].map((group) => {
          const groupYakus = availableYakus.filter((y) => y.group === group);
          if (groupYakus.length === 0) return null;

          const allSelected = groupYakus.every((y) => allowedYakus.has(y.name));
          const noneSelected = groupYakus.every(
            (y) => !allowedYakus.has(y.name),
          );
          const indeterminate = !allSelected && !noneSelected;

          return (
            <div key={group} className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-[#333] pb-1">
                <h4 className="m-0 text-[0.9rem] text-[#ff7a99] font-bold text-left">
                  {t(`yakuGroup.${group}`)}
                </h4>
                <Toggle
                  appearance="inline"
                  className="text-[0.78rem]"
                  checked={allSelected}
                  indeterminate={indeterminate}
                  label={t('lobby.toggleAll')}
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
              </div>
              <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-2">
                {groupYakus.map((yaku) => {
                  const isChecked = allowedYakus.has(yaku.name);
                  return (
                    <Toggle
                      key={yaku.name}
                      className="text-[0.8rem]"
                      checked={isChecked}
                      label={t(`yaku.${yaku.name}`)}
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
