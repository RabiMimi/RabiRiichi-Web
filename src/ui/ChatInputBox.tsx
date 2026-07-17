import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { sendChatMessage } from '../net/messages';

function ChatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm0 13.17L18.83 14H4V4h16v11.17z" />
    </svg>
  );
}

export function ChatInputBox(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  // Collapsed by default so chat stays out of the way; opens on the icon and
  // auto-collapses again after a message is sent.
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !rabiriichi.ws) return;
    sendChatMessage(rabiriichi.ws, trimmed, null);
    setText('');
    setIsOpen(false);
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[999] flex items-center gap-1 font-sans">
      {!isOpen ? (
        <button
          type="button"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#121c32]/60 text-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:bg-[#80deea]/20 hover:text-[#80deea] outline-none"
          onClick={() => setIsOpen(true)}
          title={t('chat.open', 'Open chat')}
        >
          <ChatIcon className="w-3.5 h-3.5" />
        </button>
      ) : (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#121c32]/60 p-1 pl-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <ChatIcon className="w-3.5 h-3.5 text-[#80deea]/80 shrink-0" />
          <input
            type="text"
            className="w-32 bg-transparent text-[11px] text-white placeholder-white/40 outline-none sm:w-44 md:w-52"
            placeholder={t('chat.placeholder', 'Send chat message...')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex h-5 px-2 items-center justify-center rounded border-none bg-[#80deea] text-[11px] font-semibold text-[#121c32] cursor-pointer transition-all hover:bg-[#b2ebf2] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('chat.send', 'Send')}
          </button>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center border-none bg-transparent text-[10px] text-white/40 hover:text-white cursor-pointer"
            onClick={() => setIsOpen(false)}
            title={t('chat.close', 'Close chat')}
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}
