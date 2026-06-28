import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentInquiry, useIsRiichiSelectMode } from '../state/store';
import { rabiriichi } from '../net/client';
import { Logger } from '../lib/logger';
import { type ActionOption, type InquiryOptionType } from '../domain/inquiry';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';

const logger = new Logger('ActionHUD');

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
      <div className="action-hud-container">
        <div className="action-hud-message">{t('hud.declareRiichi')}</div>
        <button
          className="hud-cancel-btn"
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
    <div className="action-hud-container">
      <div className="action-hud-buttons">
        {flatOptions.map((opt) => (
          <button
            key={opt.key}
            className={`hud-btn hud-btn-${opt.type}`}
            onClick={opt.onClick}
          >
            {opt.tiles ? (
              <div className="hud-tile-group">
                <span className="hud-group-type-label">{opt.label}</span>
                <div className="hud-group-tiles">
                  {opt.tiles.map((tileMsg, idx) => {
                    const tileStr = Tile.fromByte(tileMsg.tile).toString();
                    const imgSrc = getTileTexturePath(tileStr);
                    return (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={tileStr}
                        className="hud-tile-img"
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
