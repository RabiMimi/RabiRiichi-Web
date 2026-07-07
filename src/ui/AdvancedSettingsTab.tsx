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
    <div className="policy-group" style={{ fontSize: '0.75rem' }}>
      <h4
        style={{
          margin: '0 0 4px 0',
          fontSize: '0.8rem',
          color: '#ff7a99',
        }}
      >
        {t('advanced.scoringOption')}
      </h4>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {/* 切上满贯 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
        >
          <input
            type="checkbox"
            checked={(scoringOption & 1) !== 0}
            onChange={() => setScoringOption(scoringOption ^ 1)}
            disabled={isLoading}
            style={{
              margin: 0,
              transform: 'scale(0.85)',
              transformOrigin: 'left center',
            }}
          />
          {t('advanced.scoring.kiriageMangan')}
        </label>

        {/* 青天井 (Virtual checkbox, checked when Yakuman bit 2 is 0) */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
        >
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
            style={{
              margin: 0,
              transform: 'scale(0.85)',
              transformOrigin: 'left center',
            }}
          />
          {t('advanced.scoring.aotenjou')}
        </label>

        {/* 役满 (Bit 2) */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
        >
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
            style={{
              margin: 0,
              transform: 'scale(0.85)',
              transformOrigin: 'left center',
            }}
          />
          {t('advanced.scoring.yakuman')}
        </label>

        {/* 多倍役满 (Bit 4) */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
        >
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
            style={{
              margin: 0,
              transform: 'scale(0.85)',
              transformOrigin: 'left center',
            }}
          />
          {t('advanced.scoring.multipleYakuman')}
        </label>

        {/* 累计役满 (Bit 8) */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            lineHeight: '1.2',
          }}
        >
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
            style={{
              margin: 0,
              transform: 'scale(0.85)',
              transformOrigin: 'left center',
            }}
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
    <div className="advanced-settings-section">
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
      <div
        className="policy-group"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <h4
          style={{
            margin: '0 0 4px 0',
            fontSize: '0.8rem',
            color: '#ff7a99',
          }}
        >
          {t('advanced.pointsDeductionPolicy')}
        </h4>
        <select
          value={pointsDeductionPolicy}
          onChange={(e) => setPointsDeductionPolicy(Number(e.target.value))}
          disabled={isLoading}
          style={{
            padding: '6px 8px',
            backgroundColor: '#111',
            color: '#ccc',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '0.75rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
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
