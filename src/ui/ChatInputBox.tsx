import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { sendChatMessage } from '../net/messages';
import { useSelf, useChatHistory } from '../state/store';

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
  const currentUser = useSelf();
  const chatHistory = useChatHistory();
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
    <div className="pointer-events-auto absolute bottom-3 left-3 lg:bottom-5 lg:left-5 z-[999] flex flex-col items-start gap-0 font-sans">
      {isOpen && (
        <div className="w-[200px] sm:w-[270px] md:w-[310px] lg:w-[380px] xl:w-[420px] max-h-48 md:max-h-64 lg:max-h-80 xl:max-h-[380px] flex flex-col rounded-t-lg rounded-b-none border border-white/10 border-b-0 bg-[#121c32]/15 p-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm text-[11px] lg:text-[13px] text-white">
          <div className="overflow-y-auto pr-1 flex-grow flex flex-col-reverse gap-1.5 scrollbar-thin">
            {chatHistory
              .slice()
              .reverse()
              .map((entry) => {
                const displayName = entry.senderName;
                const isMe = entry.senderId === currentUser?.id;
                const nameColor = isMe ? 'text-[#ff7a99]' : 'text-[#80deea]';

                return (
                  <div
                    key={entry.id}
                    className="break-words animate-chat-msg-fade-in py-0.5"
                  >
                    <span className={`font-bold ${nameColor} mr-1`}>
                      {displayName}:
                    </span>
                    {entry.text && (
                      <span className="text-white/90">{entry.text}</span>
                    )}
                    {entry.sticker &&
                      (() => {
                        const [charId, filename] = entry.sticker.split('/');
                        const srcPath = `/assets/${charId}/stickers/${filename}`;
                        return (
                          <img
                            src={srcPath}
                            alt="sticker"
                            className="w-10 h-10 lg:w-14 lg:h-14 object-contain rounded inline-block align-middle ml-1"
                          />
                        );
                      })()}
                  </div>
                );
              })}
            {chatHistory.length === 0 && (
              <div className="text-white/40 text-center py-4 italic">
                {t('chat.noMessages', 'No messages')}
              </div>
            )}
          </div>
        </div>
      )}
      {!isOpen ? (
        <button
          type="button"
          className="flex h-7 w-7 lg:h-9 lg:w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#121c32]/15 text-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all hover:bg-[#80deea]/20 hover:text-[#80deea] outline-none"
          onClick={() => setIsOpen(true)}
          title={t('chat.open', 'Open chat')}
        >
          <ChatIcon className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
        </button>
      ) : (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-1.5 rounded-b-lg rounded-t-none border border-white/10 bg-[#121c32]/15 p-1 lg:p-1.5 pl-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm w-[200px] sm:w-[270px] md:w-[310px] lg:w-[380px] xl:w-[420px]"
        >
          <ChatIcon className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-[#80deea]/80 shrink-0" />
          <input
            type="text"
            className="flex-grow min-w-0 bg-transparent text-[11px] lg:text-[13px] text-white placeholder-white/40 outline-none"
            placeholder={t('chat.placeholder', 'Send chat message...')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex h-5 lg:h-6 px-2 lg:px-3 items-center justify-center rounded border-none bg-[#80deea] text-[11px] lg:text-[12px] font-semibold text-[#121c32] cursor-pointer transition-all hover:bg-[#b2ebf2] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('chat.send', 'Send')}
          </button>
          <button
            type="button"
            className="flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center border-none bg-transparent text-[10px] lg:text-[12px] text-white/40 hover:text-white cursor-pointer"
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
