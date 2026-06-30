import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_ACTION_TIMEOUT } from '../domain/constants';
import type { IGameConfigMsg } from '../proto';
import { TILE_SET_PRESETS, type TileSetPresetName } from '../domain/tilesets';
import { buildAllowedYakusPayload } from '../domain/yakus';
import { useAvailableYakus } from '../state/store';
import { YakuModal } from './YakuModal';
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

interface RoomConfigPanelProps {
  onCreateRoom: (config: IGameConfigMsg) => Promise<void>;
  isLoading: boolean;
}

export function RoomConfigPanel({
  onCreateRoom,
  isLoading,
}: RoomConfigPanelProps) {
  const availableYakus = useAvailableYakus();
  const { t } = useTranslation();

  // Room config state
  const [playerCount, setPlayerCount] = useState(2);
  const [totalRound, setTotalRound] = useState(1);
  const [minHanInput, setMinHanInput] = useState('1');
  const [minHanError, setMinHanError] = useState<string | null>(null);
  const [actionTimeoutInput, setActionTimeoutInput] = useState(
    DEFAULT_ACTION_TIMEOUT.toString(),
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // New config states
  const [initialPointsInput, setInitialPointsInput] = useState('25000');
  const [finishPointsInput, setFinishPointsInput] = useState('30000');
  const [initialPointsError, setInitialPointsError] = useState<string | null>(
    null,
  );
  const [finishPointsError, setFinishPointsError] = useState<string | null>(
    null,
  );
  const [upperPointsInput, setUpperPointsInput] = useState('1000000');
  const [upperPointsError, setUpperPointsError] = useState<string | null>(null);
  const [tileSetPreset, setTileSetPreset] =
    useState<TileSetPresetName>('Regular');
  const [allowedYakus, setAllowedYakus] = useState<Set<string>>(
    () => new Set(availableYakus.map((y) => y.name)),
  );
  const [showYakuModal, setShowYakuModal] = useState(false);

  // Advanced policy states (matching server defaults)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [renchanPolicy, setRenchanPolicy] = useState(11);
  const [endGamePolicy, setEndGamePolicy] = useState(31);
  const [kuikaePolicy, setKuikaePolicy] = useState(3);
  const [riichiPolicy, setRiichiPolicy] = useState(7);
  const [doraOption, setDoraOption] = useState(79);
  const [agariOption, setAgariOption] = useState(15);
  const [scoringOption, setScoringOption] = useState(15);
  const [ryuukyokuTrigger, setRyuukyokuTrigger] = useState(31);
  const [pointsDeductionPolicy, setPointsDeductionPolicy] = useState(1);

  const validateTimeout = (val: string) => {
    if (val === '') {
      setTimeoutError(null);
      return;
    }
    const seconds = parseFloat(val);
    if (isNaN(seconds) || seconds < 5 || seconds > 3600) {
      setTimeoutError(t('lobby.timeoutError'));
    } else {
      setTimeoutError(null);
    }
  };

  const validateMinHan = (val: string) => {
    if (val === '') {
      setMinHanError(null);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 13) {
      setMinHanError(t('lobby.minHanError'));
    } else {
      setMinHanError(null);
    }
  };

  const validatePoints = (
    val: string,
    setErrorFunc: (err: string | null) => void,
  ) => {
    if (val === '') {
      setErrorFunc(null);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 1000000) {
      setErrorFunc(t('lobby.pointsError'));
    } else {
      setErrorFunc(null);
    }
  };

  const validateInitialPoints = (val: string) => {
    validatePoints(val, setInitialPointsError);
  };

  const validateFinishPoints = (val: string) => {
    validatePoints(val, setFinishPointsError);
  };

  const validateUpperPoints = (val: string) => {
    validatePoints(val, setUpperPointsError);
  };

  const handleCreateClick = () => {
    if (
      minHanError ||
      timeoutError ||
      initialPointsError ||
      finishPointsError ||
      upperPointsError
    ) {
      return;
    }

    let actionTimeout = DEFAULT_ACTION_TIMEOUT;
    if (actionTimeoutInput !== '') {
      const parsed = parseFloat(actionTimeoutInput);
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 3600) {
        actionTimeout = parsed;
      }
    }

    let minHan = 1;
    if (minHanInput !== '') {
      const parsed = parseInt(minHanInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 13) {
        minHan = parsed;
      }
    }

    let initialPoints = 25000;
    if (initialPointsInput !== '') {
      const parsed = parseInt(initialPointsInput, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000000) {
        initialPoints = parsed;
      }
    }

    let finishPoints = 30000;
    if (finishPointsInput !== '') {
      const parsed = parseInt(finishPointsInput, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000000) {
        finishPoints = parsed;
      }
    }

    let upperPoints = 1000000;
    if (upperPointsInput !== '') {
      const parsed = parseInt(upperPointsInput, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000000) {
        upperPoints = parsed;
      }
    }

    void onCreateRoom({
      playerCount,
      totalRound,
      minHan,
      gameplayActionTimeout: actionTimeout,
      renchanPolicy,
      endGamePolicy,
      kuikaePolicy,
      riichiPolicy,
      doraOption,
      agariOption,
      scoringOption,
      ryuukyokuTrigger,
      pointsDeductionPolicy,
      pointThreshold: {
        initialPoints,
        finishPoints,
        validPointsRange: [0, upperPoints],
      },
      initialTiles: TILE_SET_PRESETS[tileSetPreset]().map((tile) =>
        tile.toByte(),
      ),
      allowedYakus: buildAllowedYakusPayload(allowedYakus),
    });
  };

  const isFormInvalid =
    minHanError !== null ||
    timeoutError !== null ||
    initialPointsError !== null ||
    finishPointsError !== null ||
    upperPointsError !== null;

  return (
    <div className="room-config-panel">
      <h3>{t('lobby.roomSettings')}</h3>

      <BasicSettingsGrid
        isLoading={isLoading}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        totalRound={totalRound}
        setTotalRound={setTotalRound}
        minHanInput={minHanInput}
        setMinHanInput={setMinHanInput}
        minHanError={minHanError}
        validateMinHan={validateMinHan}
        actionTimeoutInput={actionTimeoutInput}
        setActionTimeoutInput={setActionTimeoutInput}
        timeoutError={timeoutError}
        validateTimeout={validateTimeout}
        initialPointsInput={initialPointsInput}
        setInitialPointsInput={setInitialPointsInput}
        initialPointsError={initialPointsError}
        validateInitialPoints={validateInitialPoints}
        finishPointsInput={finishPointsInput}
        setFinishPointsInput={setFinishPointsInput}
        finishPointsError={finishPointsError}
        validateFinishPoints={validateFinishPoints}
        upperPointsInput={upperPointsInput}
        setUpperPointsInput={setUpperPointsInput}
        upperPointsError={upperPointsError}
        validateUpperPoints={validateUpperPoints}
        tileSetPreset={tileSetPreset}
        setTileSetPreset={setTileSetPreset}
      />

      {/* Collapsible Advanced Policy Settings */}
      <button
        type="button"
        className="ui-button secondary-button advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          marginTop: '8px',
          padding: '8px 12px',
          fontSize: '0.9rem',
        }}
      >
        {showAdvanced
          ? `▲ ${t('lobby.advancedSettings')}`
          : `▼ ${t('lobby.advancedSettings')}`}
      </button>

      {showAdvanced && (
        <AdvancedSettingsGrid
          isLoading={isLoading}
          renchanPolicy={renchanPolicy}
          setRenchanPolicy={setRenchanPolicy}
          endGamePolicy={endGamePolicy}
          setEndGamePolicy={setEndGamePolicy}
          kuikaePolicy={kuikaePolicy}
          setKuikaePolicy={setKuikaePolicy}
          riichiPolicy={riichiPolicy}
          setRiichiPolicy={setRiichiPolicy}
          doraOption={doraOption}
          setDoraOption={setDoraOption}
          agariOption={agariOption}
          setAgariOption={setAgariOption}
          scoringOption={scoringOption}
          setScoringOption={setScoringOption}
          ryuukyokuTrigger={ryuukyokuTrigger}
          setRyuukyokuTrigger={setRyuukyokuTrigger}
          pointsDeductionPolicy={pointsDeductionPolicy}
          setPointsDeductionPolicy={setPointsDeductionPolicy}
        />
      )}

      <div
        className="room-config-actions"
        style={{ display: 'flex', gap: '12px', marginTop: '16px' }}
      >
        <button
          type="button"
          onClick={() => setShowYakuModal(true)}
          className="ui-button secondary-button"
          style={{ flex: 1, whiteSpace: 'nowrap' }}
          disabled={isLoading}
        >
          {t('lobby.configureYakus')} (
          {allowedYakus.size === availableYakus.length
            ? t('lobby.allYakus')
            : `${allowedYakus.size} ${t('lobby.yakus')}`}
          )
        </button>

        <button
          onClick={handleCreateClick}
          className="ui-button primary-button"
          disabled={isLoading || isFormInvalid}
          style={{ flex: 1 }}
        >
          {t('lobby.createRoom')}
        </button>
      </div>

      <YakuModal
        isOpen={showYakuModal}
        allowedYakus={allowedYakus}
        onChange={setAllowedYakus}
        onClose={() => setShowYakuModal(false)}
        availableYakus={availableYakus}
      />
    </div>
  );
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
          color: '#ff9900',
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

interface BasicSettingsGridProps {
  isLoading: boolean;
  playerCount: number;
  setPlayerCount: (v: number) => void;
  totalRound: number;
  setTotalRound: (v: number) => void;
  minHanInput: string;
  setMinHanInput: (v: string) => void;
  minHanError: string | null;
  validateMinHan: (v: string) => void;
  actionTimeoutInput: string;
  setActionTimeoutInput: (v: string) => void;
  timeoutError: string | null;
  validateTimeout: (v: string) => void;
  initialPointsInput: string;
  setInitialPointsInput: (v: string) => void;
  initialPointsError: string | null;
  validateInitialPoints: (v: string) => void;
  finishPointsInput: string;
  setFinishPointsInput: (v: string) => void;
  finishPointsError: string | null;
  validateFinishPoints: (v: string) => void;
  upperPointsInput: string;
  setUpperPointsInput: (v: string) => void;
  upperPointsError: string | null;
  validateUpperPoints: (v: string) => void;
  tileSetPreset: TileSetPresetName;
  setTileSetPreset: (v: TileSetPresetName) => void;
}

function BasicSettingsGrid({
  isLoading,
  playerCount,
  setPlayerCount,
  totalRound,
  setTotalRound,
  minHanInput,
  setMinHanInput,
  minHanError,
  validateMinHan,
  actionTimeoutInput,
  setActionTimeoutInput,
  timeoutError,
  validateTimeout,
  initialPointsInput,
  setInitialPointsInput,
  initialPointsError,
  validateInitialPoints,
  finishPointsInput,
  setFinishPointsInput,
  finishPointsError,
  validateFinishPoints,
  upperPointsInput,
  setUpperPointsInput,
  upperPointsError,
  validateUpperPoints,
  tileSetPreset,
  setTileSetPreset,
}: BasicSettingsGridProps) {
  const { t } = useTranslation();
  return (
    <div className="basic-settings-grid">
      <div className="form-group-inline">
        <label htmlFor="player-count">{t('lobby.players')}</label>
        <select
          id="player-count"
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={2}>{t('playersOpt.2')}</option>
          <option value={3}>{t('playersOpt.3')}</option>
          <option value={4}>{t('playersOpt.4')}</option>
        </select>
      </div>

      <div className="form-group-inline">
        <label htmlFor="total-round">{t('lobby.rounds')}</label>
        <select
          id="total-round"
          value={totalRound}
          onChange={(e) => setTotalRound(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={1}>{t('roundsOpt.1')}</option>
          <option value={2}>{t('roundsOpt.2')}</option>
        </select>
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="min-han">{t('lobby.minHan')}</label>
          <input
            id="min-han"
            type="text"
            value={minHanInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setMinHanInput(val);
              validateMinHan(val);
            }}
            disabled={isLoading}
            placeholder="1"
          />
        </div>
        {minHanError && <span className="field-error">{minHanError}</span>}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="action-timeout">{t('lobby.actionTimeout')}</label>
          <input
            id="action-timeout"
            type="text"
            value={actionTimeoutInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.]/g, '');
              setActionTimeoutInput(val);
              validateTimeout(val);
            }}
            disabled={isLoading}
            placeholder={t('lobby.defaultPlaceholder', {
              value: DEFAULT_ACTION_TIMEOUT,
            })}
          />
        </div>
        {timeoutError && <span className="field-error">{timeoutError}</span>}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="initial-points">{t('lobby.initialPoints')}</label>
          <input
            id="initial-points"
            type="text"
            value={initialPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setInitialPointsInput(val);
              validateInitialPoints(val);
            }}
            disabled={isLoading}
            placeholder="25000"
          />
        </div>
        {initialPointsError && (
          <span className="field-error">{initialPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="finish-points">{t('lobby.finishPoints')}</label>
          <input
            id="finish-points"
            type="text"
            value={finishPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setFinishPointsInput(val);
              validateFinishPoints(val);
            }}
            disabled={isLoading}
            placeholder="30000"
          />
        </div>
        {finishPointsError && (
          <span className="field-error">{finishPointsError}</span>
        )}
      </div>

      <div className="form-group-inline">
        <label htmlFor="tile-set">{t('lobby.tileSet')}</label>
        <select
          id="tile-set"
          value={tileSetPreset}
          onChange={(e) =>
            setTileSetPreset(e.target.value as TileSetPresetName)
          }
          disabled={isLoading}
        >
          <option value="Regular">{t('tileSetOpt.regular')}</option>
          <option value="Sanma">{t('tileSetOpt.sanma')}</option>
          <option value="TwoSets">{t('tileSetOpt.twoSets')}</option>
          <option value="OnlySZ">{t('tileSetOpt.onlySZ')}</option>
        </select>
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="upper-points">{t('lobby.upperPoints')}</label>
          <input
            id="upper-points"
            type="text"
            value={upperPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setUpperPointsInput(val);
              validateUpperPoints(val);
            }}
            disabled={isLoading}
            placeholder="1000000"
          />
        </div>
        {upperPointsError && (
          <span className="field-error">{upperPointsError}</span>
        )}
      </div>
    </div>
  );
}

interface AdvancedSettingsGridProps {
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

function AdvancedSettingsGrid({
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
}: AdvancedSettingsGridProps) {
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
            color: '#ff9900',
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
            borderRadius: '4px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            border: '1px solid #555',
            fontSize: '0.8rem',
            cursor: 'pointer',
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
