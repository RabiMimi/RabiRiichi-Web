import React, { useState } from 'react';
import { rabiriichi } from '../net/client';
import { sendChatMessage } from '../net/messages';
import { useTranslation } from 'react-i18next';

const STICKERS = [
  'angry.png',
  'awawawa.png',
  'happy.png',
  'smile.png',
  'speechless.png',
  'surprised.png',
];

const STICKER_FOLDER = 'mimi';
const STICKER_BASE_PATH = '/assets/stickers';

export function StickerPanel(): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const handleSelectSticker = (stickerName: string) => {
    if (rabiriichi.ws) {
      const stickerPath = `${STICKER_FOLDER}/${stickerName}`;
      sendChatMessage(rabiriichi.ws, null, stickerPath);
      if (rabiriichi.self) {
        rabiriichi.showStickerLocally(rabiriichi.self.id, stickerPath);
      }
    }
  };

  return (
    <div className={`sticker-panel-container ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        type="button"
        className="sticker-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? t('sticker.collapse', 'Hide Stickers') : t('sticker.expand', 'Show Stickers')}
      >
        {isOpen ? '▶' : '◀'}
      </button>
      <div className="sticker-panel-content">
        <div className="sticker-panel-header">
          {t('sticker.title', 'Stickers')}
        </div>
        <div className="sticker-grid">
          {STICKERS.map((stickerName) => {
            const path = `${STICKER_BASE_PATH}/${STICKER_FOLDER}/${stickerName}`;
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
