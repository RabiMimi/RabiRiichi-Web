import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface HTMLPropsWithEvents {
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  style?: React.CSSProperties;
}

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<HTMLPropsWithEvents>;
  position?: TooltipPosition;
  disabled?: boolean;
  style?: React.CSSProperties;
}

// Transforms template generators for setting transform style on bubble.
const TRANSFORMS: Record<
  TooltipPosition,
  (shiftX: number, shiftY: number) => string
> = {
  top: (sx, sy) =>
    `translate(calc(-50% + ${sx}px), calc(-100% + ${sy}px)) translateY(-8px)`,
  bottom: (sx, sy) =>
    `translate(calc(-50% + ${sx}px), calc(0% + ${sy}px)) translateY(8px)`,
  left: (sx, sy) =>
    `translate(calc(-100% + ${sx}px), calc(-50% + ${sy}px)) translateX(-8px)`,
  right: (sx, sy) =>
    `translate(calc(0% + ${sx}px), calc(-50% + ${sy}px)) translateX(8px)`,
};

const BUBBLE_CLASSES =
  'absolute z-[9999] px-2.5 py-1.5 rounded border border-[#ff7a99] ' +
  'bg-[#141414]/95 text-white text-[0.72rem] leading-[1.2] ' +
  'font-[inherit] whitespace-nowrap pointer-events-none ' +
  'shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

export function Tooltip({
  content,
  children,
  position = 'top',
  disabled = false,
  style,
}: TooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [shiftStyle, setShiftStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  // 1. Calculate anchor screen coordinates of the wrapper div
  useLayoutEffect(() => {
    if (visible && wrapperRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const sX = window.scrollX;
      const sY = window.scrollY;

      let calcTop = 0;
      let calcLeft = 0;

      switch (position) {
        case 'top':
          calcTop = wrapperRect.top + sY;
          calcLeft = wrapperRect.left + sX + wrapperRect.width / 2;
          break;
        case 'bottom':
          calcTop = wrapperRect.bottom + sY;
          calcLeft = wrapperRect.left + sX + wrapperRect.width / 2;
          break;
        case 'left':
          calcTop = wrapperRect.top + sY + wrapperRect.height / 2;
          calcLeft = wrapperRect.left + sX;
          break;
        case 'right':
          calcTop = wrapperRect.top + sY + wrapperRect.height / 2;
          calcLeft = wrapperRect.right + sX;
          break;
      }
      setCoords({ top: calcTop, left: calcLeft });
    } else {
      setCoords(null);
      setShiftStyle({});
    }
  }, [visible, position]);

  // 2. Measure bubble to calculate overflow adjustments
  useLayoutEffect(() => {
    if (visible && coords && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 8;

      let shiftX = 0;
      let shiftY = 0;

      if (rect.left < margin) {
        shiftX = margin - rect.left;
      } else if (rect.right > viewportWidth - margin) {
        shiftX = viewportWidth - margin - rect.right;
      }

      if (rect.top < margin) {
        shiftY = margin - rect.top;
      } else if (rect.bottom > viewportHeight - margin) {
        shiftY = viewportHeight - margin - rect.bottom;
      }

      setShiftStyle({
        transform: TRANSFORMS[position](shiftX, shiftY),
      });
    }
  }, [visible, coords, position]);

  if (disabled || !content) {
    return children;
  }

  const handleTouchStart = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    setVisible(true);
  };

  const handleTouchEnd = () => {
    touchTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 1500);
  };

  const trigger = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      setVisible(true);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      setVisible(false);
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      setVisible(true);
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      setVisible(false);
    },
    onTouchStart: (e: React.TouchEvent) => {
      children.props.onTouchStart?.(e);
      handleTouchStart();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      children.props.onTouchEnd?.(e);
      handleTouchEnd();
    },
    style: {
      ...children.props.style,
    },
  });

  return (
    <div ref={wrapperRef} className="relative inline-flex" style={style}>
      {trigger}
      {visible &&
        coords &&
        createPortal(
          <div
            ref={bubbleRef}
            className={BUBBLE_CLASSES}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              transform: TRANSFORMS[position](0, 0),
              ...shiftStyle,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}
