import { useTranslation } from 'react-i18next';
import { PolicyCheckboxGroup } from './PolicyCheckboxGroup';
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
        {/* 切上满贯 */}
        <label className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150">
          <input
            type="checkbox"
            checked={(scoringOption & 1) !== 0}
            onChange={() => setScoringOption(scoringOption ^ 1)}
            disabled={isLoading}
            className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
          />
          {t('advanced.scoring.kiriageMangan')}
        </label>

        {/* 青天井 (Virtual checkbox, checked when Yakuman bit 2 is 0) */}
        <label className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150">
          <input
            type="checkbox"
            checked={(scoringOption & 2) === 0}
            onChange={(e) => {
              if (e.target.checked) {
                // Enable Aotenjou: disables Yakuman and related
                setScoringOption(scoringOption & ~2 & ~4 & ~8);
              } else {
                // Disable Aotenjou: forces Yakuman enabled
                setScoringOption(scoringOption | 2);
              }
            }}
            disabled={isLoading}
            className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
          />
          {t('advanced.scoring.aotenjou')}
        </label>

        {/* 役满 (Bit 2) */}
        <label className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150">
          <input
            type="checkbox"
            checked={(scoringOption & 2) !== 0}
            onChange={(e) => {
              if (e.target.checked) {
                setScoringOption(scoringOption | 2);
              } else {
                // Disable Yakuman: clears Multiple & Kazoe, auto-enables Aotenjou
                setScoringOption(scoringOption & ~2 & ~4 & ~8);
              }
            }}
            disabled={isLoading}
            className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
          />
          {t('advanced.scoring.yakuman')}
        </label>

        {/* 多倍役满 (Bit 4) */}
        <label className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150">
          <input
            type="checkbox"
            checked={(scoringOption & 4) !== 0}
            onChange={(e) => {
              if (e.target.checked) {
                // Enable Multiple: also forces Yakuman (2) enabled
                setScoringOption(scoringOption | 4 | 2);
              } else {
                setScoringOption(scoringOption & ~4);
              }
            }}
            disabled={isLoading || (scoringOption & 2) === 0}
            className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
          />
          {t('advanced.scoring.multipleYakuman')}
        </label>

        {/* 累计役满 (Bit 8) */}
        <label className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150">
          <input
            type="checkbox"
            checked={(scoringOption & 8) !== 0}
            onChange={(e) => {
              if (e.target.checked) {
                // Enable Kazoe: also forces Yakuman (2) enabled
                setScoringOption(scoringOption | 8 | 2);
              } else {
                setScoringOption(scoringOption & ~8);
              }
            }}
            disabled={isLoading || (scoringOption & 2) === 0}
            className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
          />
          {t('advanced.scoring.kazoeYakuman')}
        </label>
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
        <select
          value={pointsDeductionPolicy}
          onChange={(e) => setPointsDeductionPolicy(Number(e.target.value))}
          disabled={isLoading}
          className="w-full rounded border border-[#333] bg-[#111] px-2 py-1.5 text-[0.75rem] text-[#ccc] focus:outline-none focus:border-[#ff7a99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer h-7"
        >
          <option value={0}>{t('advanced.deduction.alwaysAllow')}</option>
          <option value={1}>{t('advanced.deduction.sufficientPoints')}</option>
          <option value={2}>{t('advanced.deduction.validPoints')}</option>
          <option value={3}>{t('advanced.deduction.alwaysBlock')}</option>
        </select>
      </div>
    </div>
  );
}
