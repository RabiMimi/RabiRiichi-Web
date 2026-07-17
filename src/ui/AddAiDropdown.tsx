import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AiType, type ILlmAiConfig } from '../proto';
import { Button } from './Button';
import { LlmConfigDialog } from './LlmConfigDialog';

interface AddAiDropdownProps {
  disabled: boolean;
  onSelect: (aiType: AiType, llmConfig?: ILlmAiConfig) => Promise<void> | void;
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

const AI_OPTIONS: AiType[] = [
  AiType.AI_TYPE_DUMMY,
  AiType.AI_TYPE_RULE_BASED,
  AiType.AI_TYPE_LLM,
];

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

  const [isLlmDialogOpen, setIsLlmDialogOpen] = useState(false);

  const handleSelect = (aiType: AiType) => {
    setIsOpen(false);
    if (aiType === AiType.AI_TYPE_LLM) {
      setIsLlmDialogOpen(true);
    } else {
      void onSelect(aiType);
    }
  };

  return (
    <div className="ml-auto relative">
      <Button
        ref={buttonRef}
        size="compact"
        className="flex items-center gap-1"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        {t('room.addAi')} <span className="text-[0.6rem] opacity-70">▼</span>
      </Button>
      {isOpen &&
        position &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] cursor-default"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed top-auto mt-0 max-w-[220px] bg-[#222] border border-[#444] rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-[101] min-w-[140px] flex flex-col overflow-hidden py-1"
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
                  className="bg-transparent border-none px-3 py-2 text-[0.85rem] text-[#ccc] cursor-pointer whitespace-nowrap text-left w-full [font-family:inherit] transition-colors duration-200 hover:bg-[#ff7a99]/10 hover:text-[#ff7a99] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSelect(aiType)}
                >
                  {t(`ai.type.${AiType[aiType]}`)}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
      {isLlmDialogOpen && (
        <LlmConfigDialog
          onClose={() => setIsLlmDialogOpen(false)}
          onSubmit={async (config) => {
            await onSelect(AiType.AI_TYPE_LLM, config);
          }}
        />
      )}
    </div>
  );
}
