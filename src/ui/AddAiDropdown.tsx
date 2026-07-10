import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AiType } from '../proto';

interface AddAiDropdownProps {
  disabled: boolean;
  onSelect: (aiType: AiType) => void;
}

interface MenuPosition {
  /** Distance from the viewport right edge to the menu's right edge. */
  right: number;
  /** Set for a downward menu (distance from viewport top to menu top). */
  top?: number;
  /** Set for an upward menu (distance from viewport bottom to menu bottom). */
  bottom?: number;
}

const MENU_GAP = 4;
const MENU_MAX_WIDTH = 220;
const VIEWPORT_MARGIN = 8;

const AI_OPTIONS: AiType[] = [AiType.AI_TYPE_DUMMY, AiType.AI_TYPE_RULE_BASED];

/**
 * "Add AI" button whose option menu is rendered in a portal with fixed
 * positioning. Anchoring to the viewport (rather than absolutely inside the seat
 * card) keeps the menu from being clipped by the seat grid's `overflow-y: auto`
 * scroll box on short/mobile viewports, and lets it flip upward when the anchor
 * sits in the last row near the bottom of the screen.
 */
export function AddAiDropdown({
  disabled,
  onSelect,
}: AddAiDropdownProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Flip upward only when there is little room below but more room above,
    // i.e. the anchor is in the last row near the bottom edge.
    const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
    // Align the menu's right edge to the button (mirrors the original CSS
    // `right: 0`), clamped so the menu never runs off the left viewport edge.
    const maxRight = window.innerWidth - MENU_MAX_WIDTH - VIEWPORT_MARGIN;
    const right = Math.max(
      VIEWPORT_MARGIN,
      Math.min(window.innerWidth - rect.right, maxRight),
    );
    setPosition(
      openUp
        ? { right, bottom: window.innerHeight - rect.top + MENU_GAP }
        : { right, top: rect.bottom + MENU_GAP },
    );
  }, []);

  // Recompute before paint when opening, and keep it aligned while the page
  // scrolls or resizes underneath an open menu.
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (aiType: AiType) => {
    setIsOpen(false);
    onSelect(aiType);
  };

  return (
    <div className="add-ai-container">
      <button
        ref={buttonRef}
        className="ui-button mini-button add-ai-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        {t('room.addAi')} <span className="arrow">▼</span>
      </button>
      {isOpen &&
        position &&
        createPortal(
          <>
            <div
              className="dropdown-backdrop"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="dropdown-menu portal"
              style={{
                right: position.right,
                ...(position.top !== undefined ? { top: position.top } : {}),
                ...(position.bottom !== undefined
                  ? { bottom: position.bottom }
                  : {}),
              }}
            >
              {AI_OPTIONS.map((aiType) => (
                <button
                  key={aiType}
                  className="dropdown-item"
                  onClick={() => handleSelect(aiType)}
                >
                  {t(`ai.type.${AiType[aiType]}`)}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
