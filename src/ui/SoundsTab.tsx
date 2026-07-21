import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useVolumeSE,
  useVolumeBGM,
  useVolumeVoice,
  useMuteSE,
  useMuteBGM,
  useMuteVoice,
  useVolumeAll,
  updateClientSettings,
} from '../state/store';
import { VolumeSlider } from './VolumeSlider';

export function SoundsTab(): React.JSX.Element {
  const { t } = useTranslation();

  // Sounds state from store
  const volumeSE = useVolumeSE();
  const volumeBGM = useVolumeBGM();
  const volumeVoice = useVolumeVoice();
  const muteSE = useMuteSE();
  const muteBGM = useMuteBGM();
  const muteVoice = useMuteVoice();
  const volumeAll = useVolumeAll();

  return (
    <div
      className="flex flex-col gap-2.5 sm:gap-4 p-3 sm:p-4 lg:p-6 max-w-[480px] lg:max-w-[600px] w-full mx-auto min-h-0 overflow-y-auto"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <VolumeSlider
        label={t('settings.volumeAll', 'Master Volume')}
        volume={volumeAll}
        isMuted={volumeAll === 0}
        disableSlider={false}
        onMuteToggle={() =>
          updateClientSettings({
            volumeAll: volumeAll > 0 ? 0 : 1.0,
          })
        }
        onVolumeChange={(value) =>
          updateClientSettings({
            volumeAll: value,
          })
        }
        highlightLabel
      />

      <VolumeSlider
        label={t('settings.volumeBGM', 'BGM Volume')}
        volume={volumeBGM}
        isMuted={muteBGM}
        onMuteToggle={() => updateClientSettings({ muteBGM: !muteBGM })}
        onVolumeChange={(value) =>
          updateClientSettings({
            volumeBGM: value,
          })
        }
      />

      <VolumeSlider
        label={t('settings.volumeSE', 'Sound Effects')}
        volume={volumeSE}
        isMuted={muteSE}
        onMuteToggle={() => updateClientSettings({ muteSE: !muteSE })}
        onVolumeChange={(value) =>
          updateClientSettings({
            volumeSE: value,
          })
        }
      />

      <VolumeSlider
        label={t('settings.volumeVoice', 'Voice Volume')}
        volume={volumeVoice}
        isMuted={muteVoice}
        onMuteToggle={() => updateClientSettings({ muteVoice: !muteVoice })}
        onVolumeChange={(value) =>
          updateClientSettings({
            volumeVoice: value,
          })
        }
      />
    </div>
  );
}
