import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_ACTION_TIMEOUT,
  DEFAULT_PLAYER_COUNT,
  DEFAULT_TOTAL_ROUND,
  DEFAULT_MIN_HAN,
  DEFAULT_INITIAL_POINTS,
  DEFAULT_FINISH_POINTS,
  DEFAULT_UPPER_POINTS,
  DEFAULT_RIICHI_POINTS,
  DEFAULT_HONBA_POINTS,
  DEFAULT_RYUUKYOKU_POINTS_0,
  DEFAULT_RYUUKYOKU_POINTS_1,
  DEFAULT_TILE_SET_PRESET,
  DEFAULT_RENCHAN_POLICY,
  DEFAULT_END_GAME_POLICY,
  DEFAULT_KUIKAE_POLICY,
  DEFAULT_RIICHI_POLICY,
  DEFAULT_DORA_OPTION,
  DEFAULT_AGARI_OPTION,
  DEFAULT_SCORING_OPTION,
  DEFAULT_RYUUKYOKU_TRIGGER,
  DEFAULT_POINTS_DEDUCTION_POLICY,
  MIN_ACTION_TIMEOUT,
  MAX_ACTION_TIMEOUT,
  MIN_MIN_HAN,
  MAX_MIN_HAN,
  MIN_POINTS,
  MAX_POINTS,
  STORAGE_KEY_ROOM_CONFIG,
} from '../domain/constants';
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

interface SavedRoomConfig {
  playerCount?: number;
  totalRound?: number;
  minHanInput?: string;
  actionTimeoutInput?: string;
  initialPointsInput?: string;
  finishPointsInput?: string;
  upperPointsInput?: string;
  riichiPointsInput?: string;
  honbaPointsInput?: string;
  ryuukyokuPoints0Input?: string;
  ryuukyokuPoints1Input?: string;
  tileSetPreset?: TileSetPresetName;
  renchanPolicy?: number;
  endGamePolicy?: number;
  kuikaePolicy?: number;
  riichiPolicy?: number;
  doraOption?: number;
  agariOption?: number;
  scoringOption?: number;
  ryuukyokuTrigger?: number;
  pointsDeductionPolicy?: number;
  allowedYakus?: string[];
}

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
  const savedConfig = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROOM_CONFIG);
      return stored ? (JSON.parse(stored) as SavedRoomConfig) : null;
    } catch {
      return null;
    }
  })();

  const [activeTab, setActiveTab] = useState<'game' | 'points'>('game');

  // Room config state
  const [playerCount, setPlayerCount] = useState<number>(
    () => savedConfig?.playerCount ?? DEFAULT_PLAYER_COUNT
  );
  const [totalRound, setTotalRound] = useState<number>(
    () => savedConfig?.totalRound ?? DEFAULT_TOTAL_ROUND
  );
  const [minHanInput, setMinHanInput] = useState<string>(
    () => savedConfig?.minHanInput ?? DEFAULT_MIN_HAN.toString()
  );
  const [minHanError, setMinHanError] = useState<string | null>(null);
  const [actionTimeoutInput, setActionTimeoutInput] = useState<string>(
    () => savedConfig?.actionTimeoutInput ?? DEFAULT_ACTION_TIMEOUT.toString()
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // New config states
  const [initialPointsInput, setInitialPointsInput] = useState<string>(
    () => savedConfig?.initialPointsInput ?? DEFAULT_INITIAL_POINTS.toString()
  );
  const [finishPointsInput, setFinishPointsInput] = useState<string>(
    () => savedConfig?.finishPointsInput ?? DEFAULT_FINISH_POINTS.toString()
  );
  const [initialPointsError, setInitialPointsError] = useState<string | null>(
    null
  );
  const [finishPointsError, setFinishPointsError] = useState<string | null>(
    null
  );
  const [upperPointsInput, setUpperPointsInput] = useState<string>(
    () => savedConfig?.upperPointsInput ?? DEFAULT_UPPER_POINTS.toString()
  );
  const [upperPointsError, setUpperPointsError] = useState<string | null>(null);
  const [riichiPointsInput, setRiichiPointsInput] = useState<string>(
    () => savedConfig?.riichiPointsInput ?? DEFAULT_RIICHI_POINTS.toString()
  );
  const [honbaPointsInput, setHonbaPointsInput] = useState<string>(
    () => savedConfig?.honbaPointsInput ?? DEFAULT_HONBA_POINTS.toString()
  );
  const [riichiPointsError, setRiichiPointsError] = useState<string | null>(
    null
  );
  const [honbaPointsError, setHonbaPointsError] = useState<string | null>(null);
  const [ryuukyokuPoints0Input, setRyuukyokuPoints0Input] = useState<string>(
    () => savedConfig?.ryuukyokuPoints0Input ?? DEFAULT_RYUUKYOKU_POINTS_0.toString()
  );
  const [ryuukyokuPoints1Input, setRyuukyokuPoints1Input] = useState<string>(
    () => savedConfig?.ryuukyokuPoints1Input ?? DEFAULT_RYUUKYOKU_POINTS_1.toString()
  );
  const [ryuukyokuPoints0Error, setRyuukyokuPoints0Error] = useState<string | null>(
    null
  );
  const [ryuukyokuPoints1Error, setRyuukyokuPoints1Error] = useState<string | null>(
    null
  );
  const [tileSetPreset, setTileSetPreset] = useState<TileSetPresetName>(
    () => savedConfig?.tileSetPreset ?? DEFAULT_TILE_SET_PRESET
  );
  const [allowedYakus, setAllowedYakus] = useState<Set<string>>(() => {
    if (savedConfig?.allowedYakus) {
      return new Set(savedConfig.allowedYakus);
    }
    return new Set(availableYakus.map((y) => y.name));
  });
  const [showYakuModal, setShowYakuModal] = useState(false);

  // Advanced policy states (matching server defaults)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [renchanPolicy, setRenchanPolicy] = useState<number>(
    () => savedConfig?.renchanPolicy ?? DEFAULT_RENCHAN_POLICY
  );
  const [endGamePolicy, setEndGamePolicy] = useState<number>(
    () => savedConfig?.endGamePolicy ?? DEFAULT_END_GAME_POLICY
  );
  const [kuikaePolicy, setKuikaePolicy] = useState<number>(
    () => savedConfig?.kuikaePolicy ?? DEFAULT_KUIKAE_POLICY
  );
  const [riichiPolicy, setRiichiPolicy] = useState<number>(
    () => savedConfig?.riichiPolicy ?? DEFAULT_RIICHI_POLICY
  );
  const [doraOption, setDoraOption] = useState<number>(
    () => savedConfig?.doraOption ?? DEFAULT_DORA_OPTION
  );
  const [agariOption, setAgariOption] = useState<number>(
    () => savedConfig?.agariOption ?? DEFAULT_AGARI_OPTION
  );
  const [scoringOption, setScoringOption] = useState<number>(
    () => savedConfig?.scoringOption ?? DEFAULT_SCORING_OPTION
  );
  const [ryuukyokuTrigger, setRyuukyokuTrigger] = useState<number>(
    () => savedConfig?.ryuukyokuTrigger ?? DEFAULT_RYUUKYOKU_TRIGGER
  );
  const [pointsDeductionPolicy, setPointsDeductionPolicy] = useState<number>(
    () => savedConfig?.pointsDeductionPolicy ?? DEFAULT_POINTS_DEDUCTION_POLICY
  );



  // Persist config to localStorage
  useEffect(() => {
    const config = {
      playerCount,
      totalRound,
      minHanInput,
      actionTimeoutInput,
      initialPointsInput,
      finishPointsInput,
      upperPointsInput,
      riichiPointsInput,
      honbaPointsInput,
      ryuukyokuPoints0Input,
      ryuukyokuPoints1Input,
      tileSetPreset,
      renchanPolicy,
      endGamePolicy,
      kuikaePolicy,
      riichiPolicy,
      doraOption,
      agariOption,
      scoringOption,
      ryuukyokuTrigger,
      pointsDeductionPolicy,
      allowedYakus: Array.from(allowedYakus),
    };
    localStorage.setItem(STORAGE_KEY_ROOM_CONFIG, JSON.stringify(config));
  }, [
    playerCount,
    totalRound,
    minHanInput,
    actionTimeoutInput,
    initialPointsInput,
    finishPointsInput,
    upperPointsInput,
    riichiPointsInput,
    honbaPointsInput,
    ryuukyokuPoints0Input,
    ryuukyokuPoints1Input,
    tileSetPreset,
    renchanPolicy,
    endGamePolicy,
    kuikaePolicy,
    riichiPolicy,
    doraOption,
    agariOption,
    scoringOption,
    ryuukyokuTrigger,
    pointsDeductionPolicy,
    allowedYakus,
  ]);

  const validateTimeout = (val: string) => {
    if (val === '') {
      setTimeoutError(null);
      return;
    }
    const seconds = parseFloat(val);
    if (
      isNaN(seconds) ||
      seconds < MIN_ACTION_TIMEOUT ||
      seconds > MAX_ACTION_TIMEOUT
    ) {
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
    if (isNaN(parsed) || parsed < MIN_MIN_HAN || parsed > MAX_MIN_HAN) {
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
    if (isNaN(parsed) || parsed < MIN_POINTS || parsed > MAX_POINTS) {
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

  const validateRiichiPoints = (val: string) => {
    validatePoints(val, setRiichiPointsError);
  };

  const validateHonbaPoints = (val: string) => {
    validatePoints(val, setHonbaPointsError);
  };

  const validateRyuukyokuPoints0 = (val: string) => {
    validatePoints(val, setRyuukyokuPoints0Error);
  };

  const validateRyuukyokuPoints1 = (val: string) => {
    validatePoints(val, setRyuukyokuPoints1Error);
  };

  const handleCreateClick = () => {
    if (
      minHanError ||
      timeoutError ||
      initialPointsError ||
      finishPointsError ||
      upperPointsError ||
      riichiPointsError ||
      honbaPointsError ||
      ryuukyokuPoints0Error ||
      ryuukyokuPoints1Error
    ) {
      return;
    }

    let actionTimeout = DEFAULT_ACTION_TIMEOUT;
    if (actionTimeoutInput !== '') {
      const parsed = parseFloat(actionTimeoutInput);
      if (
        !isNaN(parsed) &&
        parsed >= MIN_ACTION_TIMEOUT &&
        parsed <= MAX_ACTION_TIMEOUT
      ) {
        actionTimeout = parsed;
      }
    }

    let minHan = DEFAULT_MIN_HAN;
    if (minHanInput !== '') {
      const parsed = parseInt(minHanInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_MIN_HAN && parsed <= MAX_MIN_HAN) {
        minHan = parsed;
      }
    }

    let initialPoints = DEFAULT_INITIAL_POINTS;
    if (initialPointsInput !== '') {
      const parsed = parseInt(initialPointsInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        initialPoints = parsed;
      }
    }

    let finishPoints = DEFAULT_FINISH_POINTS;
    if (finishPointsInput !== '') {
      const parsed = parseInt(finishPointsInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        finishPoints = parsed;
      }
    }

    let upperPoints = DEFAULT_UPPER_POINTS;
    if (upperPointsInput !== '') {
      const parsed = parseInt(upperPointsInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        upperPoints = parsed;
      }
    }

    let riichiPoints = DEFAULT_RIICHI_POINTS;
    if (riichiPointsInput !== '') {
      const parsed = parseInt(riichiPointsInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        riichiPoints = parsed;
      }
    }

    let honbaPoints = DEFAULT_HONBA_POINTS;
    if (honbaPointsInput !== '') {
      const parsed = parseInt(honbaPointsInput, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        honbaPoints = parsed;
      }
    }

    let ryuukyokuPoints0 = DEFAULT_RYUUKYOKU_POINTS_0;
    if (ryuukyokuPoints0Input !== '') {
      const parsed = parseInt(ryuukyokuPoints0Input, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        ryuukyokuPoints0 = parsed;
      }
    }

    let ryuukyokuPoints1 = DEFAULT_RYUUKYOKU_POINTS_1;
    if (ryuukyokuPoints1Input !== '') {
      const parsed = parseInt(ryuukyokuPoints1Input, 10);
      if (!isNaN(parsed) && parsed >= MIN_POINTS && parsed <= MAX_POINTS) {
        ryuukyokuPoints1 = parsed;
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
        riichiPoints,
        honbaPoints,
        ryuukyokuPoints: [ryuukyokuPoints0, ryuukyokuPoints1],
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
    upperPointsError !== null ||
    riichiPointsError !== null ||
    honbaPointsError !== null ||
    ryuukyokuPoints0Error !== null ||
    ryuukyokuPoints1Error !== null;

  return (
    <div className="room-config-panel">
      <div className="room-config-header">
        <h3>{t('lobby.roomSettings')}</h3>
        <div className="room-config-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => setActiveTab('game')}
          >
            {t('lobby.gameSettings')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'points' ? 'active' : ''}`}
            onClick={() => setActiveTab('points')}
          >
            {t('lobby.pointsSettings')}
          </button>
        </div>
      </div>

      <BasicSettingsGrid
        activeTab={activeTab}
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
        riichiPointsInput={riichiPointsInput}
        setRiichiPointsInput={setRiichiPointsInput}
        riichiPointsError={riichiPointsError}
        validateRiichiPoints={validateRiichiPoints}
        honbaPointsInput={honbaPointsInput}
        setHonbaPointsInput={setHonbaPointsInput}
        honbaPointsError={honbaPointsError}
        validateHonbaPoints={validateHonbaPoints}
        ryuukyokuPoints0Input={ryuukyokuPoints0Input}
        setRyuukyokuPoints0Input={setRyuukyokuPoints0Input}
        ryuukyokuPoints0Error={ryuukyokuPoints0Error}
        validateRyuukyokuPoints0={validateRyuukyokuPoints0}
        ryuukyokuPoints1Input={ryuukyokuPoints1Input}
        setRyuukyokuPoints1Input={setRyuukyokuPoints1Input}
        ryuukyokuPoints1Error={ryuukyokuPoints1Error}
        validateRyuukyokuPoints1={validateRyuukyokuPoints1}
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
  activeTab: 'game' | 'points';
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
  riichiPointsInput: string;
  setRiichiPointsInput: (v: string) => void;
  riichiPointsError: string | null;
  validateRiichiPoints: (v: string) => void;
  honbaPointsInput: string;
  setHonbaPointsInput: (v: string) => void;
  honbaPointsError: string | null;
  validateHonbaPoints: (v: string) => void;
  ryuukyokuPoints0Input: string;
  setRyuukyokuPoints0Input: (v: string) => void;
  ryuukyokuPoints0Error: string | null;
  validateRyuukyokuPoints0: (v: string) => void;
  ryuukyokuPoints1Input: string;
  setRyuukyokuPoints1Input: (v: string) => void;
  ryuukyokuPoints1Error: string | null;
  validateRyuukyokuPoints1: (v: string) => void;
  tileSetPreset: TileSetPresetName;
  setTileSetPreset: (v: TileSetPresetName) => void;
}

function BasicSettingsGrid({
  activeTab,
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
  riichiPointsInput,
  setRiichiPointsInput,
  riichiPointsError,
  validateRiichiPoints,
  honbaPointsInput,
  setHonbaPointsInput,
  honbaPointsError,
  validateHonbaPoints,
  ryuukyokuPoints0Input,
  setRyuukyokuPoints0Input,
  ryuukyokuPoints0Error,
  validateRyuukyokuPoints0,
  ryuukyokuPoints1Input,
  setRyuukyokuPoints1Input,
  ryuukyokuPoints1Error,
  validateRyuukyokuPoints1,
  tileSetPreset,
  setTileSetPreset,
}: BasicSettingsGridProps) {
  const { t } = useTranslation();
  return (
    <div className="basic-settings-container">
      {activeTab === 'game' && (
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
        </div>
      )}

      {activeTab === 'points' && (
        <div className="basic-settings-grid">
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

          <div className="form-group-inline-wrapper">
            <div className="form-group-inline">
              <label htmlFor="riichi-points">{t('lobby.riichiPoints')}</label>
              <input
                id="riichi-points"
                type="text"
                value={riichiPointsInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setRiichiPointsInput(val);
                  validateRiichiPoints(val);
                }}
                disabled={isLoading}
                placeholder="1000"
              />
            </div>
            {riichiPointsError && (
              <span className="field-error">{riichiPointsError}</span>
            )}
          </div>

          <div className="form-group-inline-wrapper">
            <div className="form-group-inline">
              <label htmlFor="honba-points">{t('lobby.honbaPoints')}</label>
              <input
                id="honba-points"
                type="text"
                value={honbaPointsInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setHonbaPointsInput(val);
                  validateHonbaPoints(val);
                }}
                disabled={isLoading}
                placeholder="300"
              />
            </div>
            {honbaPointsError && (
              <span className="field-error">{honbaPointsError}</span>
            )}
          </div>

          <div className="form-group-inline-wrapper double-input-wrapper">
            <div className="form-group-inline">
              <label>{t('lobby.ryuukyokuPoints')}</label>
              <div className="double-input-container">
                <input
                  id="ryuukyoku-points-0"
                  type="text"
                  value={ryuukyokuPoints0Input}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setRyuukyokuPoints0Input(val);
                    validateRyuukyokuPoints0(val);
                  }}
                  disabled={isLoading}
                  placeholder="1000"
                />
                <span className="input-separator">/</span>
                <input
                  id="ryuukyoku-points-1"
                  type="text"
                  value={ryuukyokuPoints1Input}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setRyuukyokuPoints1Input(val);
                    validateRyuukyokuPoints1(val);
                  }}
                  disabled={isLoading}
                  placeholder="1500"
                />
              </div>
            </div>
            {(ryuukyokuPoints0Error ?? ryuukyokuPoints1Error) && (
              <span className="field-error">
                {ryuukyokuPoints0Error ?? ryuukyokuPoints1Error}
              </span>
            )}
          </div>
        </div>
      )}
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
