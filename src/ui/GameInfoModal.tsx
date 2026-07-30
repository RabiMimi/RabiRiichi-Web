import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import { YAKUS } from '../domain/yakus';
import { getWindKey, type RoomModel } from '../domain/model';
import { UserStatus } from '../proto';
import { CopyGameIdButton } from './CopyGameIdButton';
import { Button } from './Button';
import { UiTile } from './UiTile';
import { TabButton } from './TabButton';
import { MODAL } from './styles';
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

  return createPortal(
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} ${MODAL.cardDefaultLook}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-1">
          <div className="flex items-center gap-5">
            <h3 className="m-0 text-lg font-bold text-[#ff7a99] whitespace-nowrap">
              {t('hud.gameInfo')}
            </h3>
            <div className="flex gap-1">
              <TabButton
                active={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
              >
                {t('hud.tabLiveInfo')}
              </TabButton>
              <TabButton
                active={activeTab === 'config'}
                onClick={() => setActiveTab('config')}
              >
                {t('hud.tabConfig')}
              </TabButton>
              <TabButton
                active={activeTab === 'yaku'}
                onClick={() => setActiveTab('yaku')}
              >
                {t('hud.tabYakuYama')}
              </TabButton>
            </div>
          </div>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div
          className={MODAL.body}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Tab: Live Info */}
          {activeTab === 'info' && (
            <div className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-1 min-[481px]:grid-cols-2 gap-x-4 gap-y-2 bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">{t('hud.roomId')}:</span>
                  <span className="text-white font-bold font-mono">
                    {room.id}
                  </span>
                </div>
                {room.gameId && (
                  <div className="flex justify-between items-center text-sm py-0.5 game-id-row">
                    <span className="text-[#aaa]">{t('hud.gameId')}:</span>
                    <span className="text-white font-bold font-mono game-id-val flex items-center gap-2">
                      {room.gameId}
                      <CopyGameIdButton gameId={room.gameId} />
                    </span>
                  </div>
                )}
                {info && (
                  <>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">
                        {t('hud.roundLabel')}:
                      </span>
                      <span className="text-white font-bold font-mono">
                        {t(`hud.${getWindKey(info.round)}`)}
                        {t('hud.windSpace')}
                        {info.dealer + 1}
                        {t('hud.roundSuffix')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">{t('hud.dealer')}:</span>
                      <span className="text-white font-bold font-mono">
                        Seat {info.dealer}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">
                        {t('hud.activePlayer')}:
                      </span>
                      <span className="text-white font-bold font-mono">
                        {t('room.seat', { seat: info.currentPlayer })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">{t('hud.turnJun')}:</span>
                      <span className="text-white font-bold font-mono">
                        {activePlayerJun}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">{t('hud.wallLabel')}:</span>
                      <span className="text-white font-bold font-mono">
                        {t('hud.remainingTiles', {
                          count: info.remainingTiles,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">
                        {t('hud.honbaLabel')}:
                      </span>
                      <span className="text-white font-bold font-mono">
                        {info.honba}
                        {t('hud.honbaSuffix')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-[#aaa]">
                        {t('hud.riichiLabel')}:
                      </span>
                      <span className="text-white font-bold font-mono">
                        {info.riichiStick}
                        {t('hud.riichiSuffix')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <h4 className="m-0 text-base text-[#ff7a99] border-b border-[#333] pb-1.5">
                  {t('hud.playersCount', { count: players.length })}
                </h4>
                <div className="flex flex-col gap-2">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#ff7a99] font-bold">
                          {t('room.seat', { seat: p.seat ?? '?' })}:
                        </span>
                        <span className="text-white font-bold">
                          {p.nickname}
                        </span>
                        <span className="text-xs text-[#666]">
                          (ID: {p.id})
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-[#aaa]">
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
            <div className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-1 min-[481px]:grid-cols-2 gap-x-4 gap-y-2 bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">{t('lobby.players')}:</span>
                  <span className="text-white font-bold font-mono">
                    {config.playerCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">{t('lobby.rounds')}:</span>
                  <span className="text-white font-bold font-mono">
                    {config.totalRound}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">{t('lobby.minHan')}:</span>
                  <span className="text-white font-bold font-mono">
                    {config.minHan}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">{t('lobby.seed')}:</span>
                  <span className="text-white font-bold font-mono">
                    {seedStr === '0' ? t('lobby.auto') : seedStr}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">
                    {t('lobby.nextRoundAckTimeout')}:
                  </span>
                  <span className="text-white font-bold font-mono">
                    {config.nextRoundAckTimeout}s
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-[#aaa]">
                    {t('lobby.actionTimeout')}:
                  </span>
                  <span className="text-white font-bold font-mono">
                    {config.gameplayActionTimeout}s
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h4 className="m-0 text-base text-[#ff7a99] border-b border-[#333] pb-1.5">
                  {t('hud.rulesAndPolicies')}
                </h4>
                <div className="flex flex-col gap-2.5 bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.renchanPolicy')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.renchanPolicy,
                        RENCHAN_POLICIES,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.endGamePolicy')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.endGamePolicy,
                        END_GAME_POLICIES,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.kuikaePolicy')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.kuikaePolicy,
                        KUIKAE_POLICIES,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.riichiPolicy')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.riichiPolicy,
                        RIICHI_POLICIES,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.doraOption')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.doraOption,
                        DORA_OPTIONS,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.agariOption')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.agariOption,
                        AGARI_OPTIONS,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.scoringOption')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.scoringOption,
                        SCORING_OPTIONS,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.ryuukyokuTrigger')}:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {getActivePolicyLabels(
                        config.ryuukyokuTrigger,
                        RYUUKYOKU_TRIGGERS,
                        t,
                      ).map((f) => (
                        <span
                          key={f}
                          className="bg-[#2a2a2a] border border-[#444] rounded px-1.5 py-0.5 text-[#ddd] text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm py-1">
                    <span className="text-[#aaa] font-bold shrink-0 mt-0.5">
                      {t('advanced.pointsDeductionPolicy')}:
                    </span>
                    <span className="text-[#ff7a99] font-bold font-mono">
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
            <div className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-2.5 text-left">
                <h4 className="m-0 text-base text-[#ff7a99] border-b border-[#333] pb-1.5">
                  {t('hud.allowedYakus')} ({activeYakus.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {['1han', '2han', '3han', '6han', 'yakuman', 'other'].map(
                    (group) => {
                      const groupYakus = activeYakus.filter(
                        (y) => y.group === group,
                      );
                      if (groupYakus.length === 0) return null;
                      return (
                        <div
                          key={group}
                          className="flex flex-wrap items-baseline gap-1.5 text-sm"
                        >
                          <span className="text-[#888] font-bold min-w-[70px] shrink-0">
                            {t(`yakuGroup.${group}`)}:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {groupYakus.map((yaku) => (
                              <span
                                key={yaku.name}
                                className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[#ccc] text-sm"
                              >
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
                <div className="flex flex-col gap-2.5 text-left mt-4">
                  <h4 className="m-0 text-base text-[#ff7a99] border-b border-[#333] pb-1.5">
                    {t('hud.startingYama')} ({tileBytes.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                    {sortedUniqueBytes.map((byte) => {
                      const tile = Tile.fromByte(byte);
                      const tileStr = tile.toString();
                      const count = counts[byte] ?? 0;
                      return (
                        <div
                          key={byte}
                          className="flex flex-col items-center gap-1 w-9 shrink-0"
                        >
                          <UiTile tile={tileStr} size="info" />
                          <span className="text-xs text-[#80deea] font-bold font-mono">
                            x{count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={MODAL.footer}>
          <Button type="button" onClick={onClose}>
            {t('result.confirm')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
