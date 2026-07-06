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
  FOUR_PLAYER_RYUUKYOKU_TRIGGERS_MASK,
} from '../domain/constants';
import type { IGameConfigMsg } from '../proto';
import { TILE_SET_PRESETS, type TileSetPresetName } from '../domain/tilesets';
import { buildAllowedYakusPayload } from '../domain/yakus';
import { useAvailableYakus } from '../state/store';
import { GameSettingsTab } from './GameSettingsTab';
import { PointsSettingsTab } from './PointsSettingsTab';
import { YakuSettingsTab } from './YakuSettingsTab';
import { AdvancedSettingsTab } from './AdvancedSettingsTab';

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

  const [activeTab, setActiveTab] = useState<
    'game' | 'points' | 'yaku' | 'advanced'
  >('game');

  // Room config state
  const [playerCount, setPlayerCount] = useState<number>(
    () => savedConfig?.playerCount ?? DEFAULT_PLAYER_COUNT,
  );
  const [totalRound, setTotalRound] = useState<number>(
    () => savedConfig?.totalRound ?? DEFAULT_TOTAL_ROUND,
  );
  const [minHanInput, setMinHanInput] = useState<string>(
    () => savedConfig?.minHanInput ?? DEFAULT_MIN_HAN.toString(),
  );
  const [minHanError, setMinHanError] = useState<string | null>(null);
  const [actionTimeoutInput, setActionTimeoutInput] = useState<string>(
    () => savedConfig?.actionTimeoutInput ?? DEFAULT_ACTION_TIMEOUT.toString(),
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // New config states
  const [initialPointsInput, setInitialPointsInput] = useState<string>(
    () => savedConfig?.initialPointsInput ?? DEFAULT_INITIAL_POINTS.toString(),
  );
  const [finishPointsInput, setFinishPointsInput] = useState<string>(
    () => savedConfig?.finishPointsInput ?? DEFAULT_FINISH_POINTS.toString(),
  );
  const [initialPointsError, setInitialPointsError] = useState<string | null>(
    null,
  );
  const [finishPointsError, setFinishPointsError] = useState<string | null>(
    null,
  );
  const [upperPointsInput, setUpperPointsInput] = useState<string>(
    () => savedConfig?.upperPointsInput ?? DEFAULT_UPPER_POINTS.toString(),
  );
  const [upperPointsError, setUpperPointsError] = useState<string | null>(null);
  const [riichiPointsInput, setRiichiPointsInput] = useState<string>(
    () => savedConfig?.riichiPointsInput ?? DEFAULT_RIICHI_POINTS.toString(),
  );
  const [honbaPointsInput, setHonbaPointsInput] = useState<string>(
    () => savedConfig?.honbaPointsInput ?? DEFAULT_HONBA_POINTS.toString(),
  );
  const [riichiPointsError, setRiichiPointsError] = useState<string | null>(
    null,
  );
  const [honbaPointsError, setHonbaPointsError] = useState<string | null>(null);
  const [ryuukyokuPoints0Input, setRyuukyokuPoints0Input] = useState<string>(
    () =>
      savedConfig?.ryuukyokuPoints0Input ??
      DEFAULT_RYUUKYOKU_POINTS_0.toString(),
  );
  const [ryuukyokuPoints1Input, setRyuukyokuPoints1Input] = useState<string>(
    () =>
      savedConfig?.ryuukyokuPoints1Input ??
      DEFAULT_RYUUKYOKU_POINTS_1.toString(),
  );
  const [ryuukyokuPoints0Error, setRyuukyokuPoints0Error] = useState<
    string | null
  >(null);
  const [ryuukyokuPoints1Error, setRyuukyokuPoints1Error] = useState<
    string | null
  >(null);
  const [tileSetPreset, setTileSetPreset] = useState<TileSetPresetName>(
    () => savedConfig?.tileSetPreset ?? DEFAULT_TILE_SET_PRESET,
  );
  const [allowedYakus, setAllowedYakus] = useState<Set<string>>(() => {
    if (savedConfig?.allowedYakus) {
      return new Set(savedConfig.allowedYakus);
    }
    return new Set(availableYakus.map((y) => y.name));
  });
  // Advanced policy states (matching server defaults)
  const [renchanPolicy, setRenchanPolicy] = useState<number>(
    () => savedConfig?.renchanPolicy ?? DEFAULT_RENCHAN_POLICY,
  );
  const [endGamePolicy, setEndGamePolicy] = useState<number>(
    () => savedConfig?.endGamePolicy ?? DEFAULT_END_GAME_POLICY,
  );
  const [kuikaePolicy, setKuikaePolicy] = useState<number>(
    () => savedConfig?.kuikaePolicy ?? DEFAULT_KUIKAE_POLICY,
  );
  const [riichiPolicy, setRiichiPolicy] = useState<number>(
    () => savedConfig?.riichiPolicy ?? DEFAULT_RIICHI_POLICY,
  );
  const [doraOption, setDoraOption] = useState<number>(
    () => savedConfig?.doraOption ?? DEFAULT_DORA_OPTION,
  );
  const [agariOption, setAgariOption] = useState<number>(
    () => savedConfig?.agariOption ?? DEFAULT_AGARI_OPTION,
  );
  const [scoringOption, setScoringOption] = useState<number>(
    () => savedConfig?.scoringOption ?? DEFAULT_SCORING_OPTION,
  );
  const [ryuukyokuTrigger, setRyuukyokuTrigger] = useState<number>(() => {
    if (savedConfig?.ryuukyokuTrigger !== undefined) {
      return savedConfig.ryuukyokuTrigger;
    }
    const initialPlayerCount = savedConfig?.playerCount ?? DEFAULT_PLAYER_COUNT;
    return initialPlayerCount < 4
      ? DEFAULT_RYUUKYOKU_TRIGGER & ~FOUR_PLAYER_RYUUKYOKU_TRIGGERS_MASK
      : DEFAULT_RYUUKYOKU_TRIGGER;
  });
  const [pointsDeductionPolicy, setPointsDeductionPolicy] = useState<number>(
    () => savedConfig?.pointsDeductionPolicy ?? DEFAULT_POINTS_DEDUCTION_POLICY,
  );

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    if (count < 4) {
      setRyuukyokuTrigger(
        (prev) => prev & ~FOUR_PLAYER_RYUUKYOKU_TRIGGERS_MASK,
      );
    }
  };

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
      setTimeoutError(t('error.lobby.timeout'));
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
      setMinHanError(t('error.lobby.minHan'));
    } else {
      setMinHanError(null);
    }
  };

  const validatePoints = (
    val: string,
    setErrorFunc: (err: string | null) => void,
    errorKey: string,
  ) => {
    if (val === '') {
      setErrorFunc(null);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < MIN_POINTS || parsed > MAX_POINTS) {
      setErrorFunc(t(errorKey));
    } else {
      setErrorFunc(null);
    }
  };

  const validateInitialPoints = (val: string) => {
    validatePoints(val, setInitialPointsError, 'error.lobby.initialPoints');
  };

  const validateFinishPoints = (val: string) => {
    validatePoints(val, setFinishPointsError, 'error.lobby.finishPoints');
  };

  const validateUpperPoints = (val: string) => {
    validatePoints(val, setUpperPointsError, 'error.lobby.pointsRange');
  };

  const validateRiichiPoints = (val: string) => {
    validatePoints(val, setRiichiPointsError, 'error.lobby.riichiPoints');
  };

  const validateHonbaPoints = (val: string) => {
    validatePoints(val, setHonbaPointsError, 'error.lobby.honbaPoints');
  };

  const validateRyuukyokuPoints0 = (val: string) => {
    validatePoints(
      val,
      setRyuukyokuPoints0Error,
      'error.lobby.ryuukyokuPoints',
    );
  };

  const validateRyuukyokuPoints1 = (val: string) => {
    validatePoints(
      val,
      setRyuukyokuPoints1Error,
      'error.lobby.ryuukyokuPoints',
    );
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
          <button
            type="button"
            className={`tab-btn ${activeTab === 'yaku' ? 'active' : ''}`}
            onClick={() => setActiveTab('yaku')}
          >
            {t('lobby.configureYakus')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            {t('lobby.advancedSettings')}
          </button>
        </div>
      </div>

      <div className="room-config-tab-content">
        {activeTab === 'game' && (
          <GameSettingsTab
            isLoading={isLoading}
            playerCount={playerCount}
            setPlayerCount={handlePlayerCountChange}
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
            tileSetPreset={tileSetPreset}
            setTileSetPreset={setTileSetPreset}
          />
        )}

        {activeTab === 'points' && (
          <PointsSettingsTab
            isLoading={isLoading}
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
          />
        )}

        {activeTab === 'yaku' && (
          <YakuSettingsTab
            allowedYakus={allowedYakus}
            onChange={setAllowedYakus}
            availableYakus={availableYakus}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedSettingsTab
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
      </div>

      <div
        className="room-config-actions"
        style={{ display: 'flex', gap: '12px', marginTop: '16px' }}
      >
        <button
          onClick={handleCreateClick}
          className="ui-button primary-button"
          disabled={isLoading || isFormInvalid}
          style={{ flex: 1 }}
        >
          {t('lobby.createRoom')}
        </button>
      </div>
    </div>
  );
}
