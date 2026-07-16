import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useIsReplay,
  useCharacterId,
  useVolumeSE,
  useVolumeBGM,
  useVolumeVoice,
  useMuteSE,
  useMuteBGM,
  useMuteVoice,
  useMuteAll,
  updateClientSettings,
} from '../state/store';
import {
  CHARACTERS,
  VOICE_CATEGORIES,
  type VoiceLineConfig,
} from '../domain/character';
import { soundManager } from '../lib/sound';
import { FORM, MODAL } from './styles';

interface SettingsModalProps {
  onClose: () => void;
}

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

const VOLUME_SLIDER_CLASS =
  'flex-1 h-1 bg-white/15 rounded-lg outline-none appearance-none cursor-pointer ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fbbf24] [&::-webkit-slider-thumb]:cursor-pointer ' +
  '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:transition-transform ' +
  '[&::-webkit-slider-thumb]:duration-100 hover:[&::-webkit-slider-thumb]:scale-[1.2] ' +
  'disabled:bg-white/5 disabled:cursor-not-allowed disabled:[&::-webkit-slider-thumb]:bg-[#4b5563] ' +
  'disabled:[&::-webkit-slider-thumb]:cursor-not-allowed';

export function SettingsModal({
  onClose,
}: SettingsModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const room = useRoom();
  const isReplay = useIsReplay();
  const activeCharacterId = useCharacterId();

  // Sounds state from store
  const volumeSE = useVolumeSE();
  const volumeBGM = useVolumeBGM();
  const volumeVoice = useVolumeVoice();
  const muteSE = useMuteSE();
  const muteBGM = useMuteBGM();
  const muteVoice = useMuteVoice();
  const muteAll = useMuteAll();

  const [activeTab, setActiveTab] = useState<'visuals' | 'sounds'>('visuals');
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

  return createPortal(
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} w-[95%] max-w-[900px] md:max-w-[1000px] lg:max-w-[1100px] xl:max-w-[1250px] max-h-[85vh] lg:max-h-[90vh] border border-[#ff7a99]/30 bg-[#121c32]/95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-1">
          <div className="flex items-center gap-5">
            <h2 className="m-0 text-lg lg:text-2xl font-bold text-[#ff7a99] whitespace-nowrap">
              {t('settings.title', 'System Settings')}
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                className={`bg-transparent border-none text-sm lg:text-base font-bold px-3 py-1.5 lg:px-4 lg:py-2 cursor-pointer rounded transition-all duration-200 focus:outline-none ${
                  activeTab === 'visuals'
                    ? 'text-[#ff7a99] bg-white/[0.05] shadow-[inset_0_-2px_0_#ff7a99]'
                    : 'text-[#888] hover:text-white hover:bg-[#333]'
                }`}
                onClick={() => setActiveTab('visuals')}
              >
                {t('settings.visualsTab', 'Visuals')}
              </button>
              <button
                type="button"
                className={`bg-transparent border-none text-sm lg:text-base font-bold px-3 py-1.5 lg:px-4 lg:py-2 cursor-pointer rounded transition-all duration-200 focus:outline-none ${
                  activeTab === 'sounds'
                    ? 'text-[#ff7a99] bg-white/[0.05] shadow-[inset_0_-2px_0_#ff7a99]'
                    : 'text-[#888] hover:text-white hover:bg-[#333]'
                }`}
                onClick={() => setActiveTab('sounds')}
              >
                {t('settings.soundsTab', 'Sounds')}
              </button>
            </div>
          </div>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col overflow-hidden min-h-0">
          {activeTab === 'visuals' && (
            <div className="flex flex-1 gap-4 overflow-hidden min-h-0 sm:flex-row flex-col">
              {/* Column 1: Selector & Portrait */}
              <div className="w-full sm:w-[28%] lg:w-[32%] flex flex-col gap-2 shrink-0">
                <div className="text-xs lg:text-sm font-extrabold uppercase tracking-wider text-white/50 text-left">
                  {t('settings.characterSelector', 'Active Character')}
                </div>
                <select
                  className={`${FORM.input} w-full text-sm lg:text-base py-1 px-2 h-8 lg:h-10`}
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
                </select>

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
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col gap-1">
                      {activeCharacter.illustration && (
                        <div className="flex items-center bg-[#0a0c12]/85 border border-white/10 rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[0.62rem] sm:text-xs lg:text-sm w-fit">
                          <span className="text-[#fbbf24] font-bold mr-1 border-r border-white/20 pr-1 uppercase">
                            {t('character.credits.illustration', 'Art')}
                          </span>
                          <span className="text-[#f3f4f6] font-medium">
                            {activeCharacter.illustration}
                          </span>
                        </div>
                      )}
                      {activeCharacter.cv && (
                        <div className="flex items-center bg-[#0a0c12]/85 border border-white/10 rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[0.62rem] sm:text-xs lg:text-sm w-fit">
                          <span className="text-[#fbbf24] font-bold mr-1 border-r border-white/20 pr-1 uppercase">
                            {t('character.credits.cv', 'CV')}
                          </span>
                          <span className="text-[#f3f4f6] font-medium">
                            {activeCharacter.cv}
                          </span>
                        </div>
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
                                onClick={() =>
                                  handlePlayVoice(v.id, v.audioUrl)
                                }
                              >
                                <span className="opacity-75 inline-flex items-center justify-center w-[18px] h-[18px] shrink-0">
                                  {isPlaying ? <StopIcon /> : <PlayIcon />}
                                </span>
                                <span className="truncate">
                                  {t(
                                    `character.${activeCharacter.id}.voices.${v.id}`,
                                  )}
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
          )}

          {activeTab === 'sounds' && (
            <div
              className="flex flex-col gap-2.5 sm:gap-4 p-3 sm:p-4 lg:p-6 max-w-[480px] lg:max-w-[600px] w-full mx-auto min-h-0 overflow-y-auto"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Global Mute Toggle */}
              <div className="flex justify-start items-center gap-3 py-1.5 px-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                <span className="text-sm lg:text-base font-bold text-[#fbbf24] w-[140px] lg:w-[180px] shrink-0 text-left">
                  {t('settings.globalMute', 'Mute All')}
                </span>
                <div className="sound-row-controls">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center w-7 h-7 lg:w-9 lg:h-9 border text-white cursor-pointer text-base lg:text-lg rounded transition-all duration-120 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      muteAll
                        ? 'bg-red-500/[0.06] border-red-500/20'
                        : 'bg-white/[0.04] border-white/10 hover:not-disabled:border-[#fbbf24] hover:not-disabled:bg-[#fbbf24]/[0.08]'
                    }`}
                    onClick={() => updateClientSettings({ muteAll: !muteAll })}
                  >
                    {muteAll ? '🔇' : '🔊'}
                  </button>
                </div>
              </div>

              {/* BGM Vol */}
              <div
                className={`flex justify-start items-center gap-3 py-1 px-1 transition-opacity duration-200 ${
                  muteAll ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="text-sm lg:text-base font-semibold text-[#e5e7eb] w-[140px] lg:w-[180px] max-[480px]:w-[100px] shrink-0 text-left max-[480px]:text-xs">
                  {t('settings.volumeBGM', 'BGM Volume')}
                </div>
                <div className="flex items-center gap-2.5 flex-grow justify-start">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center w-6.5 h-6.5 lg:w-8 lg:h-8 border text-white cursor-pointer text-sm lg:text-base rounded transition-all duration-120 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      muteBGM || muteAll
                        ? 'bg-red-500/[0.06] border-red-500/20'
                        : 'bg-white/[0.04] border-white/10 hover:not-disabled:border-[#fbbf24] hover:not-disabled:bg-[#fbbf24]/[0.08]'
                    }`}
                    disabled={muteAll}
                    onClick={() => updateClientSettings({ muteBGM: !muteBGM })}
                  >
                    {muteBGM || muteAll ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={muteAll || muteBGM}
                    value={volumeBGM}
                    onChange={(e) =>
                      updateClientSettings({
                        volumeBGM: parseFloat(e.target.value),
                      })
                    }
                    className={VOLUME_SLIDER_CLASS}
                  />
                  <span className="text-sm lg:text-base font-bold w-10 lg:w-14 text-[#888] shrink-0 text-right">
                    {muteBGM || muteAll
                      ? '0%'
                      : `${Math.round(volumeBGM * 100)}%`}
                  </span>
                </div>
              </div>

              {/* SE Vol */}
              <div
                className={`flex justify-start items-center gap-3 py-1 px-1 transition-opacity duration-200 ${
                  muteAll ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="text-sm lg:text-base font-semibold text-[#e5e7eb] w-[140px] lg:w-[180px] max-[480px]:w-[100px] shrink-0 text-left max-[480px]:text-xs">
                  {t('settings.volumeSE', 'Sound Effects')}
                </div>
                <div className="flex items-center gap-2.5 flex-grow justify-start">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center w-6.5 h-6.5 lg:w-8 lg:h-8 border text-white cursor-pointer text-sm lg:text-base rounded transition-all duration-120 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      muteSE || muteAll
                        ? 'bg-red-500/[0.06] border-red-500/20'
                        : 'bg-white/[0.04] border-white/10 hover:not-disabled:border-[#fbbf24] hover:not-disabled:bg-[#fbbf24]/[0.08]'
                    }`}
                    disabled={muteAll}
                    onClick={() => updateClientSettings({ muteSE: !muteSE })}
                  >
                    {muteSE || muteAll ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={muteAll || muteSE}
                    value={volumeSE}
                    onChange={(e) =>
                      updateClientSettings({
                        volumeSE: parseFloat(e.target.value),
                      })
                    }
                    className={VOLUME_SLIDER_CLASS}
                  />
                  <span className="text-sm lg:text-base font-bold w-10 lg:w-14 text-[#888] shrink-0 text-right">
                    {muteSE || muteAll
                      ? '0%'
                      : `${Math.round(volumeSE * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Voice Vol */}
              <div
                className={`flex justify-start items-center gap-3 py-1 px-1 transition-opacity duration-200 ${
                  muteAll ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="text-sm lg:text-base font-semibold text-[#e5e7eb] w-[140px] lg:w-[180px] max-[480px]:w-[100px] shrink-0 text-left max-[480px]:text-xs">
                  {t('settings.volumeVoice', 'Voice Volume')}
                </div>
                <div className="flex items-center gap-2.5 flex-grow justify-start">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center w-6.5 h-6.5 border text-[#e5e7eb] cursor-pointer text-sm rounded transition-all duration-120 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      muteVoice || muteAll
                        ? 'bg-red-500/[0.06] border-red-500/20'
                        : 'bg-white/[0.04] border-white/10 hover:not-disabled:border-[#fbbf24] hover:not-disabled:bg-[#fbbf24]/[0.08]'
                    }`}
                    disabled={muteAll}
                    onClick={() =>
                      updateClientSettings({ muteVoice: !muteVoice })
                    }
                  >
                    {muteVoice || muteAll ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={muteAll || muteVoice}
                    value={volumeVoice}
                    onChange={(e) =>
                      updateClientSettings({
                        volumeVoice: parseFloat(e.target.value),
                      })
                    }
                    className={VOLUME_SLIDER_CLASS}
                  />
                  <span className="text-sm lg:text-base font-bold w-10 lg:w-14 text-[#888] shrink-0 text-right">
                    {muteVoice || muteAll
                      ? '0%'
                      : `${Math.round(volumeVoice * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
