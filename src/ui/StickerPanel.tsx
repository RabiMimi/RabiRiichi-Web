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
    <div
      className={`pointer-events-auto absolute top-1/2 right-0 z-[999] flex items-center transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isOpen
          ? 'translate-x-0 -translate-y-1/2'
          : 'translate-x-[173px] -translate-y-1/2'
      }`}
    >
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
          className="cursor-pointer rounded-l-lg border-[1.5px] border-r-0 border-[#ff7a99]/70 bg-[#121c32]/95 px-1.5 py-3 text-white shadow-[-4px_0_10px_rgba(0,0,0,0.4)] transition-colors duration-200 outline-none hover:bg-[#ff7a99]/20 hover:text-[#ff7a99]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '▶' : '◀'}
        </button>
      </Tooltip>
      <div className="w-[170px] rounded-bl-lg border-[1.5px] border-[#ff7a99]/70 bg-[#121c32]/95 p-3 shadow-[-4px_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-lg">
        <div className="mb-2.5 border-b border-white/10 pb-1.5 text-center text-[0.9rem] font-bold text-[#ff7a99]">
          {t('sticker.title', 'Stickers')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {character.stickers.map((stickerName) => {
            const path = `${character.stickersDir}/${stickerName}`;
            return (
              <button
                key={stickerName}
                type="button"
                className="flex cursor-pointer items-center justify-center rounded-md border border-solid border-transparent bg-transparent p-1 transition-[transform,border-color,background-color] duration-200 hover:scale-[1.15] hover:border-[#ff7a99]/50 hover:bg-white/5"
                onClick={() => handleSelectSticker(stickerName)}
              >
                <img
                  src={path}
                  alt={stickerName}
                  className="h-14 w-14 object-contain"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
