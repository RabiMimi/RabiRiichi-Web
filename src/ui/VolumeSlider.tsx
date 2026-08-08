import React from 'react';

interface VolumeSliderProps {
  label: string;
  volume: number;
  isMuted?: boolean;
  disableSlider?: boolean;
  onMuteToggle?: () => void;
  onVolumeChange: (value: number) => void;
  showMuteToggle?: boolean;
  highlightLabel?: boolean;
}

const VOLUME_SLIDER_CLASS =
  'flex-1 h-1 bg-white/15 rounded-lg outline-none appearance-none cursor-pointer ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fbbf24] [&::-webkit-slider-thumb]:cursor-pointer ' +
  '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:transition-transform ' +
  '[&::-webkit-slider-thumb]:duration-100 hover:[&::-webkit-slider-thumb]:scale-[1.2] ' +
  'disabled:bg-white/5 disabled:cursor-not-allowed disabled:[&::-webkit-slider-thumb]:bg-[#4b5563] ' +
  'disabled:[&::-webkit-slider-thumb]:cursor-not-allowed';

export function VolumeSlider({
  label,
  volume,
  isMuted = false,
  disableSlider,
  onMuteToggle,
  onVolumeChange,
  showMuteToggle = true,
  highlightLabel = false,
}: VolumeSliderProps): React.JSX.Element {
  const sliderDisabled = disableSlider ?? isMuted;

  return (
    <div className="flex justify-start items-center gap-3 py-1 px-1">
      <div
        className={`text-sm lg:text-base w-[140px] lg:w-[180px] max-[480px]:w-[100px] shrink-0 text-left max-[480px]:text-xs ${
          highlightLabel
            ? 'font-bold text-[#fbbf24]'
            : 'font-semibold text-[#e5e7eb]'
        }`}
      >
        {label}
      </div>
      <div className="flex items-center gap-2.5 flex-grow justify-start">
        {showMuteToggle && onMuteToggle && (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-6.5 h-6.5 lg:w-8 lg:h-8 border text-white cursor-pointer text-sm lg:text-base rounded transition-all duration-120 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isMuted
                ? 'bg-red-500/[0.06] border-red-500/20'
                : 'bg-white/[0.04] border-white/10 hover:not-disabled:border-[#fbbf24] hover:not-disabled:bg-[#fbbf24]/[0.08]'
            }`}
            onClick={onMuteToggle}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          disabled={sliderDisabled}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className={VOLUME_SLIDER_CLASS}
        />
        <span className="text-sm lg:text-base font-bold w-10 lg:w-14 text-[#888] shrink-0 text-right">
          {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>
      </div>
    </div>
  );
}
