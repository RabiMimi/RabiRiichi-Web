import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import { YAKUS } from '../domain/yakus';
import { getWindKey, type RoomModel } from '../domain/model';
import { UserStatus } from '../proto';
import { CopyGameIdButton } from './CopyGameIdButton';
import {
  RENCHAN_POLICIES,
  END_GAME_POLICIES,
  KUIKAE_POLICIES,
  RIICHI_POLICIES,
  DORA_OPTIONS,
  AGARI_OPTIONS,
  RYUUKYOKU_TRIGGERS,
  SCORING_OPTIONS,
  type PolicyOption,
} from '../domain/policies';

interface GameInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
}

function getActivePolicyLabels(
  value: number | null | undefined,
  options: PolicyOption[],
  t: (key: string) => string,
): string[] {
  if (value === null || value === undefined) return [t('advanced.none')];
  const active: string[] = [];
  for (const opt of options) {
    if (opt.value !== 0 && (value & opt.value) === opt.value) {
      active.push(t(opt.labelKey));
    }
  }

  // Custom check for Aotenjou: if it is SCORING_OPTIONS and bit 2 (yakuman) is not set, then Aotenjou is active!
  if (options === SCORING_OPTIONS && (value & 2) === 0) {
    active.push(t('advanced.scoring.aotenjou'));
  }

  if (active.length === 0) return [t('advanced.none')];
  return active;
}

function getDeductionPolicyTranslationKey(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) return 'advanced.none';
  switch (value) {
    case 0:
      return 'advanced.deduction.alwaysAllow';
    case 1:
      return 'advanced.deduction.sufficientPoints';
    case 2:
      return 'advanced.deduction.validPoints';
    case 3:
      return 'advanced.deduction.alwaysBlock';
    default:
      return 'advanced.none';
  }
}

function getUserStatusTranslationKey(
  userStatus: UserStatus | null | undefined,
): string {
  if (userStatus === null || userStatus === undefined)
    return 'room.status.waiting';
  switch (userStatus) {
    case UserStatus.USER_STATUS_READY:
      return 'room.status.ready';
    case UserStatus.USER_STATUS_PLAYING:
      return 'room.status.playing';
    case UserStatus.USER_STATUS_IN_ROOM:
    case UserStatus.USER_STATUS_NONE:
    default:
      return 'room.status.waiting';
  }
}

export function GameInfoModal({
  isOpen,
  onClose,
  room,
}: GameInfoModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'config' | 'yaku'>(
    'info',
  );

  if (!isOpen) return null;

  const { config, info, players } = room;
  const seedStr =
    config?.seed !== null && config?.seed !== undefined
      ? String(config.seed)
      : '0';

  const activePlayer = players.find((p) => p.seat === info?.currentPlayer);
  const activePlayerJun = activePlayer?.gameState?.jun ?? 0;

  // Tab: Yaku & Yama
  const allowedYakus = config?.allowedYakus;
  const allowedSet =
    allowedYakus && allowedYakus.length > 0 ? new Set(allowedYakus) : null;
  const activeYakus = YAKUS.filter(
    (y) => !allowedSet || allowedSet.has(y.name),
  );

  const tileBytes = config?.initialTiles ?? [];
  const counts: Record<number, number> = {};
  for (const byte of tileBytes) {
    counts[byte] = (counts[byte] ?? 0) + 1;
  }

  const sortedUniqueBytes = Object.keys(counts)
    .map(Number)
    .sort((a, b) => {
      const tileA = Tile.fromByte(a);
      const tileB = Tile.fromByte(b);
      return tileA.compareTo(tileB);
    });

  return (
    <div className="game-info-modal-overlay" onClick={onClose}>
      <div
        className="game-info-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-info-modal-header">
          <h3>{t('hud.gameInfo')}</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="game-info-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            {t('hud.tabLiveInfo')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            {t('hud.tabConfig')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'yaku' ? 'active' : ''}`}
            onClick={() => setActiveTab('yaku')}
          >
            {t('hud.tabYakuYama')}
          </button>
        </div>

        <div className="game-info-modal-body">
          {/* Tab: Live Info */}
          {activeTab === 'info' && (
            <div className="debug-tab-content">
              <div className="debug-grid">
                <div className="debug-row">
                  <span className="debug-label">{t('hud.roomId')}:</span>
                  <span className="debug-val">{room.id}</span>
                </div>
                {room.gameId && (
                  <div className="debug-row game-id-row">
                    <span className="debug-label">{t('hud.gameId')}:</span>
                    <span
                      className="debug-val game-id-val"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {room.gameId}
                      <CopyGameIdButton gameId={room.gameId} />
                    </span>
                  </div>
                )}
                {info && (
                  <>
                    <div className="debug-row">
                      <span className="debug-label">
                        {t('hud.roundLabel')}:
                      </span>
                      <span className="debug-val">
                        {t(`hud.${getWindKey(info.round)}`)}
                        {t('hud.windSpace')}
                        {info.dealer + 1}
                        {t('hud.roundSuffix')}
                      </span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">{t('hud.dealer')}:</span>
                      <span className="debug-val">Seat {info.dealer}</span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">
                        {t('hud.activePlayer')}:
                      </span>
                      <span className="debug-val">
                        {t('room.seat', { seat: info.currentPlayer })}
                      </span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">{t('hud.turnJun')}:</span>
                      <span className="debug-val">{activePlayerJun}</span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">{t('hud.wallLabel')}:</span>
                      <span className="debug-val">
                        {t('hud.remainingTiles', {
                          count: info.remainingTiles,
                        })}
                      </span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">
                        {t('hud.honbaLabel')}:
                      </span>
                      <span className="debug-val">
                        {info.honba}
                        {t('hud.honbaSuffix')}
                      </span>
                    </div>
                    <div className="debug-row">
                      <span className="debug-label">
                        {t('hud.riichiLabel')}:
                      </span>
                      <span className="debug-val">
                        {info.riichiStick}
                        {t('hud.riichiSuffix')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="debug-section">
                <h4 className="game-info-subtitle">
                  {t('hud.playersCount', { count: players.length })}
                </h4>
                <div className="debug-players-list">
                  {players.map((p) => (
                    <div key={p.id} className="debug-player-card">
                      <div className="player-meta">
                        <span className="p-seat">
                          {t('room.seat', { seat: p.seat ?? '?' })}:
                        </span>
                        <span className="p-name">{p.nickname}</span>
                        <span className="p-id">(ID: {p.id})</span>
                      </div>
                      <div className="player-state">
                        <span className="p-points">
                          {t('hud.pointsLabel')}:{' '}
                          {p.gameState?.points !== undefined
                            ? t('result.points', { count: p.gameState.points })
                            : 'N/A'}
                        </span>
                        <span className="p-status">
                          {t('hud.statusLabel')}:{' '}
                          {t(getUserStatusTranslationKey(p.status))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Config */}
          {activeTab === 'config' && config && (
            <div className="debug-tab-content">
              <div className="debug-grid">
                <div className="debug-row">
                  <span className="debug-label">{t('lobby.players')}:</span>
                  <span className="debug-val">{config.playerCount}</span>
                </div>
                <div className="debug-row">
                  <span className="debug-label">{t('lobby.rounds')}:</span>
                  <span className="debug-val">{config.totalRound}</span>
                </div>
                <div className="debug-row">
                  <span className="debug-label">{t('lobby.minHan')}:</span>
                  <span className="debug-val">{config.minHan}</span>
                </div>
                <div className="debug-row">
                  <span className="debug-label">{t('lobby.seed')}:</span>
                  <span className="debug-val">
                    {seedStr === '0' ? t('lobby.auto') : seedStr}
                  </span>
                </div>
                <div className="debug-row">
                  <span className="debug-label">
                    {t('lobby.nextRoundAckTimeout')}:
                  </span>
                  <span className="debug-val">
                    {config.nextRoundAckTimeout}s
                  </span>
                </div>
                <div className="debug-row">
                  <span className="debug-label">
                    {t('lobby.actionTimeout')}:
                  </span>
                  <span className="debug-val">
                    {config.gameplayActionTimeout}s
                  </span>
                </div>
              </div>

              <div className="debug-section">
                <h4 className="game-info-subtitle">
                  {t('hud.rulesAndPolicies')}
                </h4>
                <div className="debug-policies-grid">
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.renchanPolicy')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.renchanPolicy,
                        RENCHAN_POLICIES,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.endGamePolicy')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.endGamePolicy,
                        END_GAME_POLICIES,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.kuikaePolicy')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.kuikaePolicy,
                        KUIKAE_POLICIES,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.riichiPolicy')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.riichiPolicy,
                        RIICHI_POLICIES,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">{t('advanced.doraOption')}:</span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.doraOption,
                        DORA_OPTIONS,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.agariOption')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.agariOption,
                        AGARI_OPTIONS,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.scoringOption')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.scoringOption,
                        SCORING_OPTIONS,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.ryuukyokuTrigger')}:
                    </span>
                    <div className="p-badges">
                      {getActivePolicyLabels(
                        config.ryuukyokuTrigger,
                        RYUUKYOKU_TRIGGERS,
                        t,
                      ).map((f) => (
                        <span key={f} className="debug-badge">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="policy-row">
                    <span className="p-label">
                      {t('advanced.pointsDeductionPolicy')}:
                    </span>
                    <span className="debug-val text-badge">
                      {t(
                        getDeductionPolicyTranslationKey(
                          config.pointsDeductionPolicy,
                        ),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Yaku & Yama */}
          {activeTab === 'yaku' && (
            <div className="debug-tab-content">
              <div className="game-info-section">
                <h4 className="game-info-subtitle">
                  {t('hud.allowedYakus')} ({activeYakus.length})
                </h4>
                <div className="game-info-yakus-container">
                  {['1han', '2han', '3han', '6han', 'yakuman', 'other'].map(
                    (group) => {
                      const groupYakus = activeYakus.filter(
                        (y) => y.group === group,
                      );
                      if (groupYakus.length === 0) return null;
                      return (
                        <div key={group} className="game-info-yaku-group">
                          <span className="yaku-group-title">
                            {t(`yakuGroup.${group}`)}:
                          </span>
                          <div className="yaku-badge-list">
                            {groupYakus.map((yaku) => (
                              <span key={yaku.name} className="yaku-badge">
                                {t(`yaku.${yaku.name}`)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {tileBytes.length > 0 && (
                <div
                  className="game-info-section"
                  style={{ marginTop: '16px' }}
                >
                  <h4 className="game-info-subtitle">
                    {t('hud.startingYama')} ({tileBytes.length})
                  </h4>
                  <div className="yama-tiles-grid">
                    {sortedUniqueBytes.map((byte) => {
                      const tile = Tile.fromByte(byte);
                      const tileStr = tile.toString();
                      const count = counts[byte] ?? 0;
                      return (
                        <div key={byte} className="yama-tile-item">
                          <img
                            src={getTileTexturePath(tileStr)}
                            alt={tileStr}
                            className="yama-tile-img"
                          />
                          <span className="yama-tile-count">x{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="game-info-modal-footer">
          <button
            type="button"
            className="ui-button primary-button"
            onClick={onClose}
          >
            {t('result.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
