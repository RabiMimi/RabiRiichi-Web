import React from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useAnimationSpeed } from '../state/store';
import {
  ANIMATION_SPEEDS,
  sliderIndexToSpeed,
  speedToSliderIndex,
} from './animationSpeedSlider';

export function GameModalTab(): React.JSX.Element {
  const { t } = useTranslation();
  const animationSpeed = useAnimationSpeed();

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
            className="flex-1 h-2 rounded-full appearance-none bg-white/15 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff7a99]"
          />
          <span className="text-sm text-white/80 w-10 text-right">
            {animationSpeed}x
          </span>
        </div>
      </div>
    </div>
  );
}
