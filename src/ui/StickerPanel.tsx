import React, { useState, useMemo } from 'react';
import { rabiriichi } from '../net/client';
import { sendChatMessage } from '../net/messages';
import { useTranslation } from 'react-i18next';
import { CHARACTERS } from '../domain/character';
import { useCharacterId } from '../state/store';

import { Tooltip } from './Tooltip';

export function StickerPanel(): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const characterId = useCharacterId();

  const character = useMemo(() => {
    const found = CHARACTERS.find((c) => c.id === characterId);
    if (found) return found;
    const fallback = CHARACTERS[0];
    if (!fallback) {
      throw new Error('No characters configured');
    }
    return fallback;
  }, [characterId]);

  const handleSelectSticker = (stickerName: string) => {
    if (rabiriichi.ws) {
      // The server expects characterId/stickerName (e.g. "mimi/angry.png")
      const stickerPath = `${character.id}/${stickerName}`;
      sendChatMessage(rabiriichi.ws, null, stickerPath);
    }
  };

  return (
    <div className={`sticker-panel-container ${isOpen ? 'open' : 'collapsed'}`}>
      <Tooltip
        content={
          isOpen
            ? t('sticker.collapse', 'Hide Stickers')
            : t('sticker.expand', 'Show Stickers')
        }
        position="left"
      >
        <button
          type="button"
          className="sticker-panel-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '▶' : '◀'}
        </button>
      </Tooltip>
      <div className="sticker-panel-content">
        <div className="sticker-panel-header">
          {t('sticker.title', 'Stickers')}
        </div>
        <div className="sticker-grid">
          {character.stickers.map((stickerName) => {
            const path = `${character.stickersDir}/${stickerName}`;
            return (
              <button
                key={stickerName}
                type="button"
                className="sticker-item-btn"
                onClick={() => handleSelectSticker(stickerName)}
              >
                <img src={path} alt={stickerName} className="sticker-img" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
