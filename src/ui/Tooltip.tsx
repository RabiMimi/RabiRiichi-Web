import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

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

// Placement offsets (8px away from the trigger), keyed by tooltip position.
const POSITION_CLASSES: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
  left: 'right-full top-1/2 -translate-x-2 -translate-y-1/2',
  right: 'left-full top-1/2 translate-x-2 -translate-y-1/2',
};

const BUBBLE_CLASSES =
  'absolute z-[1000] px-2.5 py-1.5 rounded border border-[#ff7a99] ' +
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
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [shiftStyle, setShiftStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (visible && bubbleRef.current) {
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

      if (shiftX !== 0 || shiftY !== 0) {
        setShiftStyle({
          marginLeft: shiftX !== 0 ? `${shiftX}px` : undefined,
          marginTop: shiftY !== 0 ? `${shiftY}px` : undefined,
        });
      }
    } else {
      setShiftStyle({});
    }
  }, [visible]);

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
    <div className="relative inline-flex" style={style}>
      {trigger}
      {visible && (
        <div
          ref={bubbleRef}
          className={`${BUBBLE_CLASSES} ${POSITION_CLASSES[position]}`}
          style={shiftStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
}
