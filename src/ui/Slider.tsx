import React, { useRef, useCallback, useState } from 'react';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
  accentColor?: 'pink' | 'amber' | 'cyan';
  ariaLabel?: string;
}

const ACCENT_STYLES = {
  pink: {
    track: 'bg-gradient-to-r from-[#ff7a99] to-[#ff99b0]',
    thumb:
      'bg-white border-2 border-[#ff7a99] shadow-[0_0_8px_rgba(255,122,153,0.5)]',
    thumbHover: 'hover:shadow-[0_0_12px_rgba(255,122,153,0.8)]',
    glow: 'bg-[#ff7a99]/20',
  },
  amber: {
    track: 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]',
    thumb:
      'bg-white border-2 border-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    thumbHover: 'hover:shadow-[0_0_12px_rgba(251,191,36,0.8)]',
    glow: 'bg-[#fbbf24]/20',
  },
  cyan: {
    track: 'bg-gradient-to-r from-[#06b6d4] to-[#38bdf8]',
    thumb:
      'bg-white border-2 border-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)]',
    thumbHover: 'hover:shadow-[0_0_12px_rgba(56,189,248,0.8)]',
    glow: 'bg-[#38bdf8]/20',
  },
} as const;

export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
  onChange,
  className = '',
  accentColor = 'pink',
  ariaLabel = 'Slider',
}: SliderProps): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clampAndStep = useCallback(
    (rawValue: number): number => {
      const clamped = Math.max(min, Math.min(max, rawValue));
      if (step <= 0) return clamped;
      const stepsCount = Math.round((clamped - min) / step);
      const stepped = min + stepsCount * step;
      const decimals = (step.toString().split('.')[1] ?? '').length;
      return Number(stepped.toFixed(decimals));
    },
    [min, max, step],
  );

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = (clientX - rect.left) / rect.width;
      const rawVal = min + ratio * (max - min);
      const newVal = clampAndStep(rawVal);
      if (newVal !== value) {
        onChange(newVal);
      }
    },
    [disabled, min, max, clampAndStep, value, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updateFromPointer(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !disabled) {
      updateFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback if pointer capture was lost
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let newValue = value;
    const stepSize = step > 0 ? step : (max - min) / 100;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      newValue = clampAndStep(value + stepSize);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      newValue = clampAndStep(value - stepSize);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newValue = min;
    } else if (e.key === 'End') {
      e.preventDefault();
      newValue = max;
    }
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const accent = ACCENT_STYLES[accentColor];

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`relative flex items-center h-4 select-none cursor-pointer touch-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      {/* Background Inactive Track */}
      <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden relative border border-white/5">
        {/* Filled Active Track */}
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            disabled ? 'bg-white/30' : accent.track
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb Handle */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full transition-transform duration-100 ${
          disabled
            ? 'bg-gray-500 border border-gray-400 cursor-not-allowed'
            : `${accent.thumb} ${accent.thumbHover}`
        } ${isDragging ? 'scale-125' : 'hover:scale-110'}`}
        style={{ left: `${percentage}%` }}
      >
        {isDragging && !disabled && (
          <div
            className={`absolute -inset-1.5 rounded-full ${accent.glow} animate-ping pointer-events-none`}
          />
        )}
      </div>
    </div>
  );
}
