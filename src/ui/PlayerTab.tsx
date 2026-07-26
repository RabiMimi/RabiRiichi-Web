import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useIsReplay,
  useCharacterId,
  updateClientSettings,
} from '../state/store';
import {
  CHARACTERS,
  VOICE_CATEGORIES,
  type VoiceLineConfig,
} from '../domain/character';
import { soundManager } from '../lib/sound';
import { Select } from './Select';

const PlayIcon = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[18px] h-[18px] block"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const StopIcon = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[18px] h-[18px] block"
  >
    <path d="M6 6h12v12H6z" />
  </svg>
);

interface CreditCapsuleProps {
  label: string;
  value: string;
}

const CreditCapsule = ({
  label,
  value,
}: CreditCapsuleProps): React.JSX.Element => (
  <div className="inline-flex w-fit max-w-full items-stretch overflow-hidden rounded-full border border-white/15 bg-[#080b14]/90 text-[0.62rem] shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:text-xs lg:text-sm">
    <span className="flex w-12 shrink-0 items-center justify-center border-r border-[#fbbf24]/35 bg-[#fbbf24]/10 px-1 font-extrabold uppercase tracking-wide text-[#fbbf24]">
      {label}
    </span>
    <span className="truncate px-2 py-0.5 font-medium leading-5 text-[#f3f4f6] lg:px-3 lg:py-1">
      {value}
    </span>
  </div>
);

export function PlayerTab(): React.JSX.Element {
  const { t } = useTranslation();
  const room = useRoom();
  const isReplay = useIsReplay();
  const activeCharacterId = useCharacterId();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const inGame = useMemo(() => {
    return Boolean(room?.info && !isReplay);
  }, [room, isReplay]);

  const activeCharacter = useMemo(() => {
    const found = CHARACTERS.find((c) => c.id === activeCharacterId);
    if (found) return found;
    const fallback = CHARACTERS[0];
    if (!fallback) {
      throw new Error('No characters configured');
    }
    return fallback;
  }, [activeCharacterId]);

  // Group voice lines by category, preserving the canonical category order and
  // dropping any category with no lines for this character.
  const voiceGroups = useMemo(() => {
    const byCategory = new Map<string, VoiceLineConfig[]>();
    for (const line of activeCharacter.voiceLines) {
      const list = byCategory.get(line.category) ?? [];
      list.push(line);
      byCategory.set(line.category, list);
    }
    return VOICE_CATEGORIES.map((category) => ({
      category,
      lines: byCategory.get(category) ?? [],
    })).filter((group) => group.lines.length > 0);
  }, [activeCharacter]);

  const handlePlayVoice = (id: string, url: string) => {
    if (playingVoiceId === id) {
      soundManager.stopAllVoices();
      setPlayingVoiceId(null);
      return;
    }

    const playback = soundManager.playVoice(url);
    if (playback) {
      setPlayingVoiceId(id);
      playback.onEnded(() => {
        setPlayingVoiceId((prev) => (prev === id ? null : prev));
      });
    } else {
      setPlayingVoiceId(null);
    }
  };

  return (
    <div className="flex flex-1 gap-4 overflow-hidden min-h-0 sm:flex-row flex-col">
      {/* Column 1: Selector & Portrait */}
      <div className="w-full sm:w-[28%] lg:w-[32%] flex flex-col gap-2 shrink-0">
        <div className="text-xs lg:text-sm font-extrabold uppercase tracking-wider text-white/50 text-left">
          {t('settings.characterSelector', 'Active Character')}
        </div>
        <Select
          className="w-full text-sm lg:text-base py-1 px-4 h-8 lg:h-10"
          value={activeCharacterId}
          disabled={inGame}
          onChange={(e) =>
            updateClientSettings({ characterId: e.target.value })
          }
        >
          {CHARACTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {t(`character.${c.id}.name`)}
            </option>
          ))}
        </Select>

        {inGame && (
          <div className="text-xs text-[#ff6666] italic text-left -mt-1">
            {t(
              'settings.inGameWarning',
              'Active character cannot be changed in-game.',
            )}
          </div>
        )}

        <div className="flex-grow bg-[#141414]/50 border border-white/5 rounded-lg overflow-hidden flex justify-center items-center relative aspect-[3/4]">
          <img
            src={activeCharacter.visualUrl}
            alt={t(`character.${activeCharacter.id}.name`)}
            className="max-w-full max-h-full object-contain"
          />
          {(activeCharacter.illustration ?? activeCharacter.cv) && (
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col gap-1.5">
              {activeCharacter.illustration && (
                <CreditCapsule
                  label={t('character.credits.illustration', 'Art')}
                  value={activeCharacter.illustration}
                />
              )}
              {activeCharacter.cv && (
                <CreditCapsule
                  label={t('character.credits.cv', 'CV')}
                  value={activeCharacter.cv}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stacked columns wrapper (sm: side-by-side, lg: stacked vertically) */}
      <div className="flex-grow flex flex-col sm:flex-row lg:flex-col gap-4 min-h-0 overflow-hidden">
        {/* Voice Lines */}
        <div className="flex-grow flex flex-col gap-2 min-h-0 lg:h-[220px]">
          <div className="text-xs lg:text-sm font-extrabold uppercase tracking-wider text-white/50 text-left">
            {t('settings.voicelines', 'Voice Lines')}
          </div>
          <div
            className="flex-grow flex flex-col gap-2.5 p-2 overflow-y-auto bg-[#141414]/30 border border-white/5 rounded-lg"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {voiceGroups.map((group) => (
              <div key={group.category} className="flex flex-col gap-1">
                <div className="text-xs lg:text-sm font-bold text-white/40 border-b border-white/5 pb-0.5 text-left">
                  {t(`settings.voiceCategories.${group.category}`)}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {group.lines.map((v) => {
                    const isPlaying = playingVoiceId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`flex items-center justify-start gap-1 border border-none rounded px-1.5 py-0.5 text-[0.7rem] lg:text-xs font-medium text-left cursor-pointer transition-all duration-150 outline-none truncate h-6 lg:h-7 ${
                          isPlaying
                            ? 'bg-[#fbbf24]/[0.12] border-[#fbbf24] text-[#fbbf24]'
                            : 'bg-white/[0.03] border-white/[0.05] text-[#d1d5db] hover:bg-[#fbbf24]/[0.08] hover:text-[#fbbf24]'
                        }`}
                        onClick={() => handlePlayVoice(v.id, v.audioUrl)}
                      >
                        <span className="opacity-75 inline-flex items-center justify-center w-[18px] h-[18px] shrink-0">
                          {isPlaying ? <StopIcon /> : <PlayIcon />}
                        </span>
                        <span className="truncate">
                          {t(`character.${activeCharacter.id}.voices.${v.id}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stickers */}
        <div className="w-full sm:w-[32%] lg:w-full flex flex-col gap-2 min-h-0 lg:flex-grow">
          <div className="text-xs lg:text-sm font-extrabold uppercase tracking-wider text-white/50 text-left">
            {t('settings.stickers', 'Stickers')}
          </div>
          <div
            className="flex-grow grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-8 gap-1 p-2 overflow-y-auto bg-[#141414]/30 border border-white/5 rounded-lg content-start"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {activeCharacter.stickers.map((sName) => (
              <div
                key={sName}
                className="aspect-square bg-white/[0.02] border border-white/[0.04] rounded flex items-center justify-center p-0.5 hover:border-[#ff7a99]/40 hover:bg-white/[0.05] transition-all"
              >
                <img
                  src={`${activeCharacter.stickersDir}/${sName}`}
                  alt={sName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
