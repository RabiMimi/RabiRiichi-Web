import React from 'react';
import {
  useCurrentInquiry,
  useIsRiichiSelectMode,
  usePendingActionOption,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Logger } from '../lib/logger';
import { type ActionOption } from '../domain/inquiry';
import { Tile } from '../domain/tile';

const logger = new Logger('ActionHUD');

export function ActionHUD(): React.JSX.Element | null {
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const pendingActionOption = usePendingActionOption();

  const setIsRiichiSelectMode = (active: boolean) => {
    rabiriichi.setRiichiSelectMode(active);
  };

  const setPendingActionOption = (option: ActionOption | null) => {
    rabiriichi.setPendingActionOption(option);
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

  // Render sub-options (e.g. multi-combinations for Chii, Pon, Kan)
  const renderSubOptions = () => {
    if (!pendingActionOption || !('tileGroups' in pendingActionOption)) {
      return null;
    }

    const { tileGroups } = pendingActionOption;

    return (
      <div className="action-hud-sub-options">
        <div className="sub-options-title">选择组合 / Select Combo:</div>
        <div className="sub-options-list">
          {tileGroups.map((group) => {
            // Render the tiles in the group, e.g. "7s 8s"
            const label = group.tiles
              .map((t) => Tile.fromByte(t.tile).toString())
              .join(' ');

            return (
              <button
                key={group.index}
                className="hud-sub-option-btn"
                onClick={() => {
                  void submitAction(pendingActionOption, group.index);
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            className="hud-cancel-btn"
            onClick={() => setPendingActionOption(null)}
          >
            取消 / Cancel
          </button>
        </div>
      </div>
    );
  };

  // If selecting a tile to discard for Riichi
  if (isRiichiSelectMode) {
    return (
      <div className="action-hud-container">
        <div className="action-hud-message">
          请选择要打出的立直牌 / Discard a tile to declare Riichi
        </div>
        <button
          className="hud-cancel-btn"
          onClick={() => setIsRiichiSelectMode(false)}
        >
          取消立直 / Cancel Riichi
        </button>
      </div>
    );
  }

  // If no action buttons to display
  if (buttons.length === 0) {
    return null;
  }

  return (
    <div className="action-hud-container">
      {/* Combination overlay if open */}
      {renderSubOptions()}

      {/* Main HUD buttons row */}
      {!pendingActionOption && (
        <div className="action-hud-buttons">
          {buttons.map((btn) => {
            const handleButtonClick = () => {
              if (
                (btn.type === 'chii' ||
                  btn.type === 'pon' ||
                  btn.type === 'kan') &&
                'tileGroups' in btn
              ) {
                const firstGroup = btn.tileGroups[0];
                if (btn.tileGroups.length === 1 && firstGroup) {
                  // Auto-submit if there's only a single combo option
                  void submitAction(btn, firstGroup.index);
                } else {
                  // Show the choices menu
                  setPendingActionOption(btn);
                }
              } else if (btn.type === 'riichi') {
                setIsRiichiSelectMode(true);
              } else {
                // Skip, Agari (Ron/Tsumo), Ryuukyoku have no options, submit immediately
                void submitAction(btn);
              }
            };

            return (
              <button
                key={btn.actionIndex}
                className={`hud-btn hud-btn-${btn.type}`}
                onClick={handleButtonClick}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
