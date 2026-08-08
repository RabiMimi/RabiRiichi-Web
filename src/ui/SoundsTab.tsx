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
      className="flex flex-col gap-1.5 p-4 sm:p-5 max-w-[500px] w-full mx-auto bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md shadow-lg"
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

      <div className="w-full h-px bg-white/10 my-1" />

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
