import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useRoom,
  useSelf,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Logger } from '../lib/logger';
import { type ActionOption, type InquiryOptionType } from '../domain/inquiry';
import { Tile } from '../domain/tile';
import { UiTile } from './UiTile';
import { HUD } from './styles';

const logger = new Logger('ActionHUD');

const ACTION_IMAGES: Partial<Record<InquiryOptionType, string>> = {
  chii: '/assets/ui/吃.png',
  pon: '/assets/ui/碰.png',
  kan: '/assets/ui/杠.png',
  riichi: '/assets/ui/立直.png',
  agari: '/assets/ui/和.png',
  skip: '/assets/ui/跳过.png',
  nukidora: '/assets/ui/拔北.png',
};

interface FlattenedOption {
  key: string;
  label: string;
  type: InquiryOptionType;
  tiles?: { traceId: number; tile: number; isCalled?: boolean }[];
  onClick: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function ActionHUD(): React.JSX.Element | null {
  const { t } = useTranslation();
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const room = useRoom();
  const currentUser = useSelf();
  const [selectedCall, setSelectedCall] = useState<ActionOption | null>(null);

  // Reset the in-progress call selection whenever a new inquiry arrives. This is
  // the render-time "reset state on prop change" pattern (avoids a setState in an
  // effect, which would trigger an extra render pass).
  const prevInquiryRef = useRef(currentInquiry?.messageId);
  if (prevInquiryRef.current !== currentInquiry?.messageId) {
    prevInquiryRef.current = currentInquiry?.messageId;
    setSelectedCall(null);
  }

  const selfPlayer =
    room && currentUser
      ? room.players.find((p) => p.id === currentUser.id)
      : null;
  const pendingTileId =
    selfPlayer?.gameState?.hand.pendingTile?.traceId ?? null;

  const setIsRiichiSelectMode = (active: boolean) => {
    rabiriichi.setRiichiSelectMode(active);
  };

  const submitAction = async (action: ActionOption, choice?: number) => {
    try {
      await rabiriichi.submitInquiryResponse(action, choice);
    } catch (err) {
      logger.error('Failed to submit inquiry response:', err);
    }
  };

  if (!currentInquiry?.mapped) {
    return null;
  }

  const { buttons } = currentInquiry.mapped;

  if (isRiichiSelectMode) {
    return (
      <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[50] pointer-events-auto">
        <div
          className="text-[#80deea] text-lg sm:text-xl font-bold mb-2 text-center bg-black/65 px-4 py-1.5 rounded-[15px]"
          style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)' }}
        >
          {t('hud.declareRiichi')}
        </div>
        <button
          className="bg-[#441111] border-[1.5px] border-[#772222] rounded-md text-[#ff9999] px-4 py-2 sm:px-6 sm:py-2.5 text-base sm:text-lg font-bold cursor-pointer transition-all duration-150 hover:bg-[#662222] hover:text-white outline-none"
          onClick={() => setIsRiichiSelectMode(false)}
        >
          {t('hud.cancelRiichi')}
        </button>
      </div>
    );
  }

  const displayButtons = buttons.filter((b) => b.type !== 'next-round');
  if (displayButtons.length === 0) {
    return null;
  }

  const getActionLabel = (type: InquiryOptionType, origLabel: string) => {
    switch (type) {
      case 'skip':
        return t('hud.action.skip');
      case 'ryuukyoku':
        return t('hud.action.ryuukyoku');
      case 'chii':
        return t('hud.action.chii');
      case 'pon':
        return t('hud.action.pon');
      case 'kan':
        return t('hud.action.kan');
      case 'nukidora':
        return t('hud.action.nukidora');
      case 'riichi':
        return t('hud.action.riichi');
      case 'agari':
        return origLabel === '自摸'
          ? t('hud.action.tsumo')
          : t('hud.action.ron');
      case 'play-tile':
      case 'next-round':
        return origLabel;
      default:
        return origLabel;
    }
  };

  // Step 2: tile-group selection
  if (selectedCall && 'tileGroups' in selectedCall) {
    return (
      <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-[50] pointer-events-auto">
        <div
          className={`flex flex-wrap justify-center ${HUD.actionRowGap} max-w-[95vw] items-center`}
        >
          {selectedCall.tileGroups.map((group) => (
            <button
              key={`${selectedCall.type}-${group.index}`}
              className="bg-transparent border-none outline-none cursor-pointer transition-all duration-150 ease-out hover:scale-110 hover:brightness-125 active:scale-95"
              onClick={() => void submitAction(selectedCall, group.index)}
            >
              <div className="flex flex-col items-center gap-[1px]">
                <span
                  className="text-[9px] sm:text-[11px] lg:text-xs"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
                >
                  {getActionLabel(selectedCall.type, selectedCall.label)}
                </span>
                <div className="flex gap-[1px] bg-[#141414]/60 px-0.5 py-[1px] rounded border border-[#444]">
                  {group.tiles.map((tileMsg, idx) => {
                    const tileStr = Tile.fromByte(tileMsg.tile).toString();
                    const isHighlighted =
                      (tileMsg.isCalled ?? false) ||
                      (pendingTileId !== null &&
                        tileMsg.traceId === pendingTileId);
                    return (
                      <UiTile
                        key={idx}
                        tile={tileStr}
                        size="action"
                        isHighlighted={isHighlighted}
                      />
                    );
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          className="bg-[#441111] border-[1.5px] border-[#772222] rounded-md text-[#ff9999] px-4 py-2 text-sm font-bold cursor-pointer hover:bg-[#662222] hover:text-white outline-none"
          onClick={() => setSelectedCall(null)}
        >
          {t('hud.cancelCall')}
        </button>
      </div>
    );
  }

  // Single-group meld call prompt (no image — direct submit)
  const mainOptions: FlattenedOption[] = [];
  const skipOptions: FlattenedOption[] = [];

  displayButtons.forEach((btn) => {
    if (btn.type === 'skip') {
      skipOptions.push({
        key: `skip-${btn.actionIndex}`,
        label: getActionLabel(btn.type, btn.label),
        type: btn.type,
        onClick: () => void submitAction(btn),
      });
      return;
    }

    if (
      (btn.type === 'chii' || btn.type === 'pon' || btn.type === 'kan') &&
      'tileGroups' in btn &&
      btn.tileGroups.length > 1
    ) {
      const allTraceIds = new Set(
        btn.tileGroups.flatMap((g) => g.tiles.map((tm) => tm.traceId)),
      );
      mainOptions.push({
        key: `${btn.type}-${btn.actionIndex}`,
        label: getActionLabel(btn.type, btn.label),
        type: btn.type,
        onClick: () => {
          rabiriichi.setCallHighlight(null);
          setSelectedCall(btn);
        },
        onPointerEnter: () => rabiriichi.setCallHighlight(allTraceIds),
        onPointerLeave: () => rabiriichi.setCallHighlight(null),
      });
    } else if (
      (btn.type === 'chii' || btn.type === 'pon' || btn.type === 'kan') &&
      'tileGroups' in btn &&
      btn.tileGroups.length === 1
    ) {
      const firstGroup = btn.tileGroups[0];
      if (!firstGroup) return;
      const singleIds = new Set(firstGroup.tiles.map((tm) => tm.traceId));
      mainOptions.push({
        key: `${btn.type}-${btn.actionIndex}-0`,
        label: getActionLabel(btn.type, btn.label),
        type: btn.type,
        onClick: () => {
          rabiriichi.setCallHighlight(null);
          void submitAction(btn, firstGroup.index);
        },
        onPointerEnter: () => rabiriichi.setCallHighlight(singleIds),
        onPointerLeave: () => rabiriichi.setCallHighlight(null),
      });
    } else {
      mainOptions.push({
        key: `${btn.type}-${btn.actionIndex}`,
        label: getActionLabel(btn.type, btn.label),
        type: btn.type,
        onClick: () => {
          if (btn.type === 'riichi') {
            setIsRiichiSelectMode(true);
          } else {
            void submitAction(btn);
          }
        },
      });
    }
  });

  const flatOptions = [...mainOptions, ...skipOptions];

  return (
    <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-[50] pointer-events-auto">
      <div
        className={`flex flex-wrap justify-center ${HUD.actionRowGap} max-w-[95vw] items-center`}
      >
        {flatOptions.map((opt, i) => (
          <button
            key={opt.key}
            className={`bg-transparent border-none outline-none cursor-pointer transition-all duration-150 ease-out hover:scale-110 hover:brightness-125 active:scale-95 ${
              opt.type === 'skip' && i === flatOptions.length - 1
                ? 'ml-auto'
                : ''
            }`}
            onClick={opt.onClick}
            onPointerEnter={opt.onPointerEnter}
            onPointerLeave={opt.onPointerLeave}
          >
            {ACTION_IMAGES[opt.type] ? (
              <img
                src={ACTION_IMAGES[opt.type]}
                alt={opt.label}
                className={`${HUD.actionImage} ${
                  // Keep drawing the eye to the win button, as the pre-redesign
                  // text button did.
                  opt.type === 'agari'
                    ? 'animate-[hud-agari-pulse_1.5s_infinite]'
                    : ''
                }`}
                draggable={false}
              />
            ) : (
              opt.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
