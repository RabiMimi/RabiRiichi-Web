import { useTranslation } from 'react-i18next';
import { DEFAULT_ACTION_TIMEOUT } from '../domain/constants';
import type { TileSetPresetName } from '../domain/tilesets';

interface GameSettingsTabProps {
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
  tileSetPreset: TileSetPresetName;
  setTileSetPreset: (v: TileSetPresetName) => void;
}

export function GameSettingsTab({
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
  tileSetPreset,
  setTileSetPreset,
}: GameSettingsTabProps) {
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
  );
}
