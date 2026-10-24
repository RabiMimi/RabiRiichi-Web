import React from 'react';
import { Slider } from './Slider';

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

export function VolumeIcon({
  volume,
  isMuted,
  className = 'w-4 h-4',
}: {
  volume: number;
  isMuted?: boolean;
  className?: string;
}): React.JSX.Element {
  if (isMuted || volume === 0) {
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
        />
      </svg>
    );
  }

  if (volume < 0.35) {
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.536 8.464a5 5 0 010 7.072"
        />
      </svg>
    );
  }

  if (volume < 0.7) {
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.536 8.464a5 5 0 010 7.072"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 6.343a8 8 0 010 11.314"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.536 8.464a5 5 0 010 7.072"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 6.343a8 8 0 010 11.314"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.778 4.222a11 11 0 010 15.556"
      />
    </svg>
  );
}

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
    <div className="flex items-center gap-3 py-1.5 px-2 w-full group">
      {/* Label */}
      <span
        className={`w-[110px] sm:w-[130px] shrink-0 text-sm font-semibold truncate text-left ${
          highlightLabel ? 'text-[#ff7a99] font-bold' : 'text-gray-300'
        }`}
      >
        {label}
      </span>

      {/* Flat Mute Icon Button */}
      {showMuteToggle && onMuteToggle && (
        <button
          type="button"
          onClick={onMuteToggle}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`p-1.5 rounded-lg border-none transition-colors duration-150 cursor-pointer outline-none shrink-0 active:scale-95 ${
            isMuted
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : highlightLabel
                ? 'bg-[#ff7a99]/15 text-[#ff7a99] hover:bg-[#ff7a99]/25'
                : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <VolumeIcon volume={volume} isMuted={isMuted} className="w-4 h-4" />
        </button>
      )}

      {/* Compact 1-line Slider */}
      <div className="flex-1 min-w-0">
        <Slider
          value={isMuted ? 0 : volume}
          min={0}
          max={1}
          step={0.01}
          disabled={sliderDisabled}
          onChange={onVolumeChange}
          accentColor={highlightLabel ? 'pink' : 'cyan'}
          ariaLabel={label}
        />
      </div>

      {/* Percentage Badge */}
      <span
        className={`w-11 text-right text-xs font-bold shrink-0 ${
          isMuted || volume === 0
            ? 'text-red-400'
            : highlightLabel
              ? 'text-[#ff7a99]'
              : 'text-gray-400'
        }`}
      >
        {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
      </span>
    </div>
  );
}
