import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_ACTION_TIMEOUT,
  DEFAULT_NEXT_ROUND_ACK_TIMEOUT,
} from '../domain/constants';
import {
  type TileSetPresetName,
  loadCustomTileSets,
  type CustomTileSet,
  getTileSet,
} from '../domain/tilesets';
import { CustomTileSetModal } from './CustomTileSetModal';
import { FORM } from './styles';

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
  nextRoundAckTimeoutInput: string;
  setNextRoundAckTimeoutInput: (v: string) => void;
  nextRoundAckTimeoutError: string | null;
  validateNextRoundAckTimeout: (v: string) => void;
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
  nextRoundAckTimeoutInput,
  setNextRoundAckTimeoutInput,
  nextRoundAckTimeoutError,
  validateNextRoundAckTimeout,
  tileSetPreset,
  setTileSetPreset,
}: GameSettingsTabProps) {
  const { t } = useTranslation();
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customSets, setCustomSets] = useState<CustomTileSet[]>(() =>
    loadCustomTileSets(),
  );

  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[768px]:grid-cols-3 gap-x-4 gap-y-2.5 w-full box-border">
      <div className={FORM.groupInline}>
        <label htmlFor="player-count" className={FORM.labelInline}>
          {t('lobby.players')}
        </label>
        <select
          id="player-count"
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
          disabled={isLoading}
          className={FORM.inputInline}
        >
          <option value={2}>{t('playersOpt.2')}</option>
          <option value={3}>{t('playersOpt.3')}</option>
          <option value={4}>{t('playersOpt.4')}</option>
        </select>
      </div>

      <div className={FORM.groupInline}>
        <label htmlFor="total-round" className={FORM.labelInline}>
          {t('lobby.rounds')}
        </label>
        <select
          id="total-round"
          value={totalRound}
          onChange={(e) => setTotalRound(Number(e.target.value))}
          disabled={isLoading}
          className={FORM.inputInline}
        >
          <option value={1}>{t('roundsOpt.1')}</option>
          <option value={2}>{t('roundsOpt.2')}</option>
        </select>
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="min-han" className={FORM.labelInline}>
            {t('lobby.minHan')}
          </label>
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
            className={FORM.inputInline}
          />
        </div>
        {minHanError && <span className={FORM.fieldError}>{minHanError}</span>}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="action-timeout" className={FORM.labelInline}>
            {t('lobby.actionTimeout')}
          </label>
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
            className={FORM.inputInline}
          />
        </div>
        {timeoutError && (
          <span className={FORM.fieldError}>{timeoutError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="next-round-ack-timeout" className={FORM.labelInline}>
            {t('lobby.nextRoundAckTimeout')}
          </label>
          <input
            id="next-round-ack-timeout"
            type="text"
            value={nextRoundAckTimeoutInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.]/g, '');
              setNextRoundAckTimeoutInput(val);
              validateNextRoundAckTimeout(val);
            }}
            disabled={isLoading}
            placeholder={t('lobby.defaultPlaceholder', {
              value: DEFAULT_NEXT_ROUND_ACK_TIMEOUT,
            })}
            className={FORM.inputInline}
          />
        </div>
        {nextRoundAckTimeoutError && (
          <span className={FORM.fieldError}>{nextRoundAckTimeoutError}</span>
        )}
      </div>

      <div className={FORM.groupInline}>
        <label htmlFor="tile-set" className={FORM.labelInline}>
          {t('lobby.tileSet')}
        </label>
        <select
          id="tile-set"
          value={tileSetPreset}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__CUSTOMIZE__') {
              setShowCustomizeModal(true);
            } else {
              setTileSetPreset(val);
            }
          }}
          disabled={isLoading}
          className={FORM.inputInline}
        >
          <option value="Regular">
            {t('tileSetOpt.labelWithCount', {
              name: t('tileSetOpt.regular'),
              count: getTileSet('Regular').length,
            })}
          </option>
          <option value="Sanma">
            {t('tileSetOpt.labelWithCount', {
              name: t('tileSetOpt.sanma'),
              count: getTileSet('Sanma').length,
            })}
          </option>
          <option value="TwoSets">
            {t('tileSetOpt.labelWithCount', {
              name: t('tileSetOpt.twoSets'),
              count: getTileSet('TwoSets').length,
            })}
          </option>
          <option value="OnlySZ">
            {t('tileSetOpt.labelWithCount', {
              name: t('tileSetOpt.onlySZ'),
              count: getTileSet('OnlySZ').length,
            })}
          </option>
          <option value="TenchiSouzou">
            {t('tileSetOpt.labelWithCount', {
              name: t('tileSetOpt.tenchiSouzou'),
              count: getTileSet('TenchiSouzou').length,
            })}
          </option>
          {customSets.length > 0 && (
            <optgroup label={t('customTileSet.title')}>
              {customSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {t('tileSetOpt.labelWithCount', {
                    name: s.name,
                    count: s.tiles.length,
                  })}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__CUSTOMIZE__">{t('tileSetOpt.customize')}</option>
        </select>

        {showCustomizeModal && (
          <CustomTileSetModal
            onClose={() => setShowCustomizeModal(false)}
            onSaved={(newId) => {
              setCustomSets(loadCustomTileSets());
              setTileSetPreset(newId);
            }}
          />
        )}
      </div>
    </div>
  );
}
