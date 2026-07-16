import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentInquiry, useIsRiichiSelectMode } from '../state/store';
import { rabiriichi } from '../net/client';
import { Logger } from '../lib/logger';
import { type ActionOption, type InquiryOptionType } from '../domain/inquiry';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';

const logger = new Logger('ActionHUD');

const HUD_BTN_COLORS: Record<string, string> = {
  chii: 'text-[#66ccff]',
  pon: 'text-[#ffaa44]',
  kan: 'text-[#ff66cc]',
  riichi: 'text-[#ff7a99]',
  agari:
    'text-[#ff3333] text-2xl sm:text-3xl animate-[hud-agari-pulse_1.5s_infinite]',
  skip: 'text-[#cccccc]',
  ryuukyoku: 'text-[#aaaaaa]',
};

interface FlattenedOption {
  key: string;
  label: string;
  type: InquiryOptionType;
  tiles?: { traceId: number; tile: number }[];
  onClick: () => void;
}

export function ActionHUD(): React.JSX.Element | null {
  const { t } = useTranslation();
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();

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

  // If selecting a tile to discard for Riichi
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

  // If no action buttons to display (excluding next-round buttons)
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

  // Flatten options: map Pon/Chi/Kan options with multiple tile groups into distinct clickable options
  const flatOptions: FlattenedOption[] = [];

  displayButtons.forEach((btn) => {
    if (
      (btn.type === 'chii' || btn.type === 'pon' || btn.type === 'kan') &&
      'tileGroups' in btn
    ) {
      btn.tileGroups.forEach((group) => {
        flatOptions.push({
          key: `${btn.type}-${btn.actionIndex}-${group.index}`,
          label: getActionLabel(btn.type, btn.label),
          type: btn.type,
          tiles: group.tiles,
          onClick: () => void submitAction(btn, group.index),
        });
      });
    } else {
      flatOptions.push({
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

  return (
    <div className="absolute bottom-[22vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[50] pointer-events-auto">
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5 max-w-[90vw] bg-[#121c32]/88 px-2.5 py-1 sm:px-5 sm:py-2 rounded-[16px] sm:rounded-[20px] border border-[#ff7a99]/35 shadow-[0_4px_20px_rgba(0,0,0,0.7)] backdrop-blur-md items-center">
        {flatOptions.map((opt) => (
          <button
            key={opt.key}
            className={`bg-transparent border-none text-base sm:text-xl lg:text-2xl font-bold px-2 py-1 sm:px-4 sm:py-1.5 lg:px-5 lg:py-2 cursor-pointer rounded-xl transition-all duration-150 ease-out hover:scale-110 hover:brightness-125 active:scale-95 outline-none ${
              HUD_BTN_COLORS[opt.type] ?? 'text-white'
            }`}
            onClick={opt.onClick}
            style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}
          >
            {opt.tiles ? (
              <div className="flex flex-col items-center gap-[2px]">
                <span
                  className="text-[10px] sm:text-xs lg:text-sm"
                  style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
                >
                  {opt.label}
                </span>
                <div className="flex gap-[2px] bg-[#141414]/60 px-1 py-0.5 rounded border border-[#444]">
                  {opt.tiles.map((tileMsg, idx) => {
                    const tileStr = Tile.fromByte(tileMsg.tile).toString();
                    const imgSrc = getTileTexturePath(tileStr);
                    return (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={tileStr}
                        className="w-4.5 h-[24px] sm:w-6 sm:h-[32px] lg:w-7 lg:h-[37px] rounded-[2px] border border-[#333] shadow-[0_2px_4px_rgba(0,0,0,0.3)] object-cover bg-[#f7f4eb]"
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              opt.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
