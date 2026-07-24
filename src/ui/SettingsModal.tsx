import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useAnimationSpeed } from '../state/store';
import { ProfileTab } from './ProfileTab';
import { PlayerTab } from './PlayerTab';
import { SoundsTab } from './SoundsTab';
import { GameSettingsTab } from './GameSettingsTab';
import { GameModalTab } from './GameModalTab';
import { TabButton } from './TabButton';
import { MODAL } from './styles';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({
  onClose,
}: SettingsModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const animationSpeed = useAnimationSpeed();

  const [activeTab, setActiveTab] = useState<'player' | 'game' | 'profile' | 'sounds'>('player');

  return createPortal(
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} min-h-96 w-[95%] max-w-[900px] md:max-w-[1000px] lg:max-w-[1100px] xl:max-w-[1250px] max-h-[85vh] lg:max-h-[90vh] border border-[#ff7a99]/30 bg-[#121c32]/95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-1">
          <div className="flex items-center gap-5">
            <h2 className="m-0 text-lg lg:text-2xl font-bold text-[#ff7a99] whitespace-nowrap">
              {t('settings.title', 'System Settings')}
            </h2>
            <div className="flex gap-1">
              <TabButton
                active={activeTab === 'game'}
                onClick={() => setActiveTab('game')}
                className="lg:px-4 lg:py-2 lg:text-base"
              >
                {t('settings.gameTab', 'Game')}
              </TabButton>
              <TabButton
                active={activeTab === 'player'}
                onClick={() => setActiveTab('player')}
                className="lg:px-4 lg:py-2 lg:text-base"
              >
                {t('settings.playerTab', 'Player')}
              </TabButton>
              <TabButton
                active={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
                className="lg:px-4 lg:py-2 lg:text-base"
              >
                {t('settings.profileTab', 'Profile')}
              </TabButton>
              <TabButton
                active={activeTab === 'sounds'}
                onClick={() => setActiveTab('sounds')}
                className="lg:px-4 lg:py-2 lg:text-base"
              >
                {t('settings.soundsTab', 'Sounds')}
              </TabButton>
            </div>
          </div>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col overflow-hidden min-h-0">
          {activeTab === 'player' && <PlayerTab />}
          {activeTab === 'game' && <GameModalTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'sounds' && <SoundsTab />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
