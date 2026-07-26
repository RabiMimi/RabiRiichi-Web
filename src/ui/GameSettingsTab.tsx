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
import { Input } from './Input';
import { Select } from './Select';
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
        <Select
          id="player-count"
          selectSize="inline"
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={2}>{t('playersOpt.2')}</option>
          <option value={3}>{t('playersOpt.3')}</option>
          <option value={4}>{t('playersOpt.4')}</option>
        </Select>
      </div>

      <div className={FORM.groupInline}>
        <label htmlFor="total-round" className={FORM.labelInline}>
          {t('lobby.rounds')}
        </label>
        <Select
          id="total-round"
          selectSize="inline"
          value={totalRound}
          onChange={(e) => setTotalRound(Number(e.target.value))}
          disabled={isLoading}
        >
          <option value={1}>{t('roundsOpt.1')}</option>
          <option value={2}>{t('roundsOpt.2')}</option>
        </Select>
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="min-han" className={FORM.labelInline}>
            {t('lobby.minHan')}
          </label>
          <Input
            id="min-han"
            inputSize="inline"
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
        {minHanError && <span className={FORM.fieldError}>{minHanError}</span>}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="action-timeout" className={FORM.labelInline}>
            {t('lobby.actionTimeout')}
          </label>
          <Input
            id="action-timeout"
            inputSize="inline"
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
        {timeoutError && (
          <span className={FORM.fieldError}>{timeoutError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="next-round-ack-timeout" className={FORM.labelInline}>
            {t('lobby.nextRoundAckTimeout')}
          </label>
          <Input
            id="next-round-ack-timeout"
            inputSize="inline"
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
        <Select
          id="tile-set"
          selectSize="inline"
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
        </Select>

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
