import { useTranslation } from 'react-i18next';
import { PolicyCheckboxGroup } from './PolicyCheckboxGroup';
import { Toggle } from './Toggle';
import { Select } from './Select';
import { scoringToggles } from './scoringToggles';
import {
  RENCHAN_POLICIES,
  END_GAME_POLICIES,
  KUIKAE_POLICIES,
  RIICHI_POLICIES,
  DORA_OPTIONS,
  AGARI_OPTIONS,
  RYUUKYOKU_TRIGGERS,
} from '../domain/policies';

interface AdvancedSettingsTabProps {
  isLoading: boolean;
  renchanPolicy: number;
  setRenchanPolicy: (v: number) => void;
  endGamePolicy: number;
  setEndGamePolicy: (v: number) => void;
  kuikaePolicy: number;
  setKuikaePolicy: (v: number) => void;
  riichiPolicy: number;
  setRiichiPolicy: (v: number) => void;
  doraOption: number;
  setDoraOption: (v: number) => void;
  agariOption: number;
  setAgariOption: (v: number) => void;
  scoringOption: number;
  setScoringOption: (v: number) => void;
  ryuukyokuTrigger: number;
  setRyuukyokuTrigger: (v: number) => void;
  pointsDeductionPolicy: number;
  setPointsDeductionPolicy: (v: number) => void;
}

interface ScoringOptionGroupProps {
  scoringOption: number;
  setScoringOption: (val: number) => void;
  isLoading: boolean;
}

function ScoringOptionGroup({
  scoringOption,
  setScoringOption,
  isLoading,
}: ScoringOptionGroupProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 text-[0.75rem]">
      <h4 className="m-0 mb-1 text-[0.8rem] text-[#ff7a99] font-bold">
        {t('advanced.scoringOption')}
      </h4>
      <div className="flex flex-col gap-1">
        {scoringToggles(scoringOption, isLoading).map((opt) => (
          <Toggle
            key={opt.key}
            appearance="inline"
            className="text-[0.72rem]"
            checked={opt.checked}
            disabled={opt.disabled}
            label={t(opt.labelKey)}
            onChange={() => setScoringOption(opt.next)}
          />
        ))}
      </div>
    </div>
  );
}

export function AdvancedSettingsTab({
  isLoading,
  renchanPolicy,
  setRenchanPolicy,
  endGamePolicy,
  setEndGamePolicy,
  kuikaePolicy,
  setKuikaePolicy,
  riichiPolicy,
  setRiichiPolicy,
  doraOption,
  setDoraOption,
  agariOption,
  setAgariOption,
  scoringOption,
  setScoringOption,
  ryuukyokuTrigger,
  setRyuukyokuTrigger,
  pointsDeductionPolicy,
  setPointsDeductionPolicy,
}: AdvancedSettingsTabProps) {
  const { t } = useTranslation();
  return (
    <div className="max-h-[250px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-left pr-1">
      <PolicyCheckboxGroup
        title={t('advanced.renchanPolicy')}
        options={RENCHAN_POLICIES}
        value={renchanPolicy}
        onChange={setRenchanPolicy}
        disabled={isLoading}
        t={t}
      />

      <PolicyCheckboxGroup
        title={t('advanced.endGamePolicy')}
        options={END_GAME_POLICIES}
        value={endGamePolicy}
        onChange={setEndGamePolicy}
        disabled={isLoading}
        t={t}
      />

      <PolicyCheckboxGroup
        title={t('advanced.kuikaePolicy')}
        options={KUIKAE_POLICIES}
        value={kuikaePolicy}
        onChange={setKuikaePolicy}
        disabled={isLoading}
        t={t}
      />

      <PolicyCheckboxGroup
        title={t('advanced.riichiPolicy')}
        options={RIICHI_POLICIES}
        value={riichiPolicy}
        onChange={setRiichiPolicy}
        disabled={isLoading}
        t={t}
      />

      <PolicyCheckboxGroup
        title={t('advanced.doraOption')}
        options={DORA_OPTIONS}
        value={doraOption}
        onChange={setDoraOption}
        disabled={isLoading}
        t={t}
      />

      <PolicyCheckboxGroup
        title={t('advanced.agariOption')}
        options={AGARI_OPTIONS}
        value={agariOption}
        onChange={setAgariOption}
        disabled={isLoading}
        t={t}
      />

      <ScoringOptionGroup
        scoringOption={scoringOption}
        setScoringOption={setScoringOption}
        isLoading={isLoading}
      />

      <PolicyCheckboxGroup
        title={t('advanced.ryuukyokuTrigger')}
        options={RYUUKYOKU_TRIGGERS}
        value={ryuukyokuTrigger}
        onChange={setRyuukyokuTrigger}
        disabled={isLoading}
        t={t}
      />

      {/* Points Deduction Policy */}
      <div className="flex flex-col gap-1 text-[0.75rem]">
        <h4 className="m-0 mb-1 text-[0.8rem] text-[#ff7a99] font-bold">
          {t('advanced.pointsDeductionPolicy')}
        </h4>
        <Select
          selectSize="compact"
          className="w-full cursor-pointer"
          value={pointsDeductionPolicy}
          onChange={(e) => setPointsDeductionPolicy(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={0}>{t('advanced.deduction.alwaysAllow')}</option>
          <option value={1}>{t('advanced.deduction.sufficientPoints')}</option>
          <option value={2}>{t('advanced.deduction.validPoints')}</option>
          <option value={3}>{t('advanced.deduction.alwaysBlock')}</option>
        </Select>
      </div>
    </div>
  );
}
