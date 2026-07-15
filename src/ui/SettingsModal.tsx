import React, { useState, useMemo } from 'react';
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

interface SettingsModalProps {
  onClose: () => void;
}

const PlayIcon = (): React.JSX.Element => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="voice-play-icon-svg">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const StopIcon = (): React.JSX.Element => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="voice-play-icon-svg">
    <path d="M6 19h12V5H6v14z" />
  </svg>
);

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

    const audio = soundManager.playVoice(url);
    if (audio) {
      setPlayingVoiceId(id);
      const onStop = () => {
        setPlayingVoiceId((prev) => (prev === id ? null : prev));
      };
      audio.addEventListener('ended', onStop);
      audio.addEventListener('pause', onStop);
    } else {
      setPlayingVoiceId(null);
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div
        className="settings-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-left">
            <h2>{t('settings.title', 'System Settings')}</h2>
            <div className="settings-tab-bar-inline">
              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'visuals' ? 'active' : ''}`}
                onClick={() => setActiveTab('visuals')}
              >
                {t('settings.visualsTab', 'Visuals')}
              </button>
              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'sounds' ? 'active' : ''}`}
                onClick={() => setActiveTab('sounds')}
              >
                {t('settings.soundsTab', 'Sounds')}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="settings-content-wrapper">
          {activeTab === 'visuals' && (
            <div className="settings-visuals-tab">
              {/* Left Column - Portrait & Character Switcher */}
              <div className="settings-char-column">
                <div className="settings-section-title">
                  {t('settings.characterSelector', 'Active Character')}
                </div>

                <select
                  className="settings-char-select"
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
                  <div className="settings-warning-text">
                    {t(
                      'settings.inGameWarning',
                      'Active character cannot be changed in-game.',
                    )}
                  </div>
                )}

                <div className="settings-char-portrait-container">
                  <img
                    src={activeCharacter.visualUrl}
                    alt={t(`character.${activeCharacter.id}.name`)}
                    className="settings-char-portrait"
                  />
                  {(activeCharacter.illustration ?? activeCharacter.cv) && (
                    <div className="settings-char-credits-container">
                      {activeCharacter.illustration && (
                        <div className="settings-credit-capsule">
                          <span className="credit-label">
                            {t('character.credits.illustration', 'Artist')}
                          </span>
                          <span className="credit-value">
                            {activeCharacter.illustration}
                          </span>
                        </div>
                      )}
                      {activeCharacter.cv && (
                        <div className="settings-credit-capsule">
                          <span className="credit-label">
                            {t('character.credits.cv', 'CV')}
                          </span>
                          <span className="credit-value">
                            {activeCharacter.cv}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Stickers and Voice lines */}
              <div className="settings-assets-column">
                {/* Voice Lines */}
                <div className="settings-voice-section">
                  <div className="settings-section-title">
                    {t('settings.voicelines', 'Voice Lines')}
                  </div>
                  <div className="settings-scroll-box voice-list">
                    {voiceGroups.map((group) => (
                      <div key={group.category} className="voice-group">
                        <div className="voice-group-header">
                          {t(`settings.voiceCategories.${group.category}`)}
                        </div>
                        <div className="voice-group-grid">
                          {group.lines.map((v) => {
                            const isPlaying = playingVoiceId === v.id;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                className={`settings-voice-item-btn ${isPlaying ? 'playing' : ''}`}
                                onClick={() =>
                                  handlePlayVoice(v.id, v.audioUrl)
                                }
                              >
                                <span className="voice-play-icon">
                                  {isPlaying ? <StopIcon /> : <PlayIcon />}
                                </span>
                                <span>
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
                <div className="settings-stickers-section">
                  <div className="settings-section-title">
                    {t('settings.stickers', 'Stickers Preview')}
                  </div>
                  <div className="settings-scroll-box stickers-grid">
                    {activeCharacter.stickers.map((sName) => (
                      <div
                        key={sName}
                        className="settings-sticker-preview-item"
                      >
                        <img
                          src={`${activeCharacter.stickersDir}/${sName}`}
                          alt={sName}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="settings-sounds-tab">
              {/* Global Mute Toggle */}
              <div className="settings-sound-row global-mute-row">
                <span className="sound-row-label font-bold text-amber">
                  {t('settings.globalMute', 'Mute All')}
                </span>
                <div className="sound-row-controls">
                  <button
                    type="button"
                    className={`sound-mute-btn ${muteAll ? 'muted' : ''}`}
                    onClick={() => updateClientSettings({ muteAll: !muteAll })}
                  >
                    {muteAll ? '🔇' : '🔊'}
                  </button>
                </div>
              </div>

              <hr className="settings-divider" />

              {/* BGM Vol */}
              <div
                className={`settings-sound-row ${muteAll ? 'disabled' : ''}`}
              >
                <div className="sound-row-label">
                  {t('settings.volumeBGM', 'BGM Volume')}
                </div>
                <div className="sound-row-controls">
                  <button
                    type="button"
                    className={`sound-mute-btn ${muteBGM || muteAll ? 'muted' : ''}`}
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
                    className="settings-volume-slider"
                  />
                  <span className="volume-percent-text">
                    {muteBGM || muteAll
                      ? '0%'
                      : `${Math.round(volumeBGM * 100)}%`}
                  </span>
                </div>
              </div>

              {/* SE Vol */}
              <div
                className={`settings-sound-row ${muteAll ? 'disabled' : ''}`}
              >
                <div className="sound-row-label">
                  {t('settings.volumeSE', 'Sound Effects Volume')}
                </div>
                <div className="sound-row-controls">
                  <button
                    type="button"
                    className={`sound-mute-btn ${muteSE || muteAll ? 'muted' : ''}`}
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
                    className="settings-volume-slider"
                  />
                  <span className="volume-percent-text">
                    {muteSE || muteAll
                      ? '0%'
                      : `${Math.round(volumeSE * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Voice Vol */}
              <div
                className={`settings-sound-row ${muteAll ? 'disabled' : ''}`}
              >
                <div className="sound-row-label">
                  {t('settings.volumeVoice', 'Voice Volume')}
                </div>
                <div className="sound-row-controls">
                  <button
                    type="button"
                    className={`sound-mute-btn ${muteVoice || muteAll ? 'muted' : ''}`}
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
                    className="settings-volume-slider"
                  />
                  <span className="volume-percent-text">
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
    </div>
  );
}
