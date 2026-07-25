import React from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import {
  useAnimationSpeed,
  useAutoAgari,
  useAutoDiscard,
  useAutoNuki,
  useNoCalls,
  useRoom,
} from '../state/store';
import { Tooltip } from './Tooltip';
import {
  ANIMATION_SPEEDS,
  sliderIndexToSpeed,
  speedToSliderIndex,
} from './animationSpeedSlider';

/** Bit flag in `config.doraOption` that enables nukidora (three-player rule). */
const DORA_OPTION_NUKI = 128;

interface AutoPlayToggle {
  key: string;
  isActive: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}

function toggleButtonClass(isActive: boolean): string {
  return `flex-1 bg-[#141414]/85 border-[1.5px] rounded-[6px] py-1.5 text-sm font-bold cursor-pointer transition-all duration-200 text-center select-none hover:-translate-y-[1px] active:translate-y-[1px] ${
    isActive
      ? 'bg-[#ff7a99]/15 border-[#ff7a99] text-[#ff7a99] shadow-[0_0_10px_rgba(255,122,153,0.3),inset_0_0_4px_rgba(255,122,153,0.2)] [text-shadow:0_0_4px_rgba(255,122,153,0.4)]'
      : 'border-[#444] text-[#888] shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-[#ff7a99] hover:text-[#ccc]'
  }`;
}

export function GameModalTab(): React.JSX.Element {
  const { t } = useTranslation();
  const animationSpeed = useAnimationSpeed();
  const autoAgari = useAutoAgari();
  const noCalls = useNoCalls();
  const autoDiscard = useAutoDiscard();
  const autoNuki = useAutoNuki();
  const room = useRoom();

  const doraOption = room?.config?.doraOption;
  const hasNukiDora =
    doraOption != null && (doraOption & DORA_OPTION_NUKI) !== 0;

  const toggles: AutoPlayToggle[] = [
    {
      key: 'autoAgari',
      isActive: Boolean(autoAgari),
      label: t('hud.autoAgari', 'Win'),
      description: t(
        'hud.autoAgariDesc',
        'Automatically declare Win (Ron/Tsumo) when available',
      ),
      onToggle: () => rabiriichi.toggleAutoAgari(),
    },
    {
      key: 'noCalls',
      isActive: Boolean(noCalls),
      label: t('hud.noCalls', 'No Calls'),
      description: t(
        'hud.noCallsDesc',
        'Never claim discards from other players (Chii/Pon/Kan)',
      ),
      onToggle: () => rabiriichi.toggleNoCalls(),
    },
    {
      key: 'autoDiscard',
      isActive: Boolean(autoDiscard),
      label: t('hud.autoDiscard', 'Auto Discard'),
      description: t(
        'hud.autoDiscardDesc',
        'Automatically discard drawn tile if no other actions are possible',
      ),
      onToggle: () => rabiriichi.toggleAutoDiscard(),
    },
  ];

  if (hasNukiDora) {
    toggles.push({
      key: 'autoNuki',
      isActive: Boolean(autoNuki),
      label: t('hud.autoNuki', 'Auto Nuki'),
      description: t(
        'hud.autoNukiDesc',
        'Automatically declare Kita (Nukidora) if available',
      ),
      onToggle: () => rabiriichi.toggleAutoNuki(),
    });
  }

  const speedIndex = speedToSliderIndex(animationSpeed);

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-white/60">
          {t('settings.animationSpeed', 'Animation Speed')}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={ANIMATION_SPEEDS.length - 1}
            step="1"
            value={speedIndex}
            onChange={(e) =>
              rabiriichi.setAnimationSpeed(
                sliderIndexToSpeed(Number(e.target.value)),
              )
            }
            className="flex-1 h-2 rounded-full appearance-none bg-[#333] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff7a99]"
          />
          <span className="text-sm text-white/80 w-10 text-right">
            {animationSpeed}x
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-white/60">
          {t('settings.autoPlay', 'Auto Play')}
        </label>
        <div className="flex flex-row gap-[6px] w-full">
          {toggles.map((toggle) => (
            <Tooltip
              key={toggle.key}
              content={toggle.description}
              position="top"
              style={{ flex: 1 }}
            >
              <button
                type="button"
                className={toggleButtonClass(toggle.isActive)}
                onClick={toggle.onToggle}
              >
                {toggle.label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
