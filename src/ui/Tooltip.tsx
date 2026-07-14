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

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<HTMLPropsWithEvents>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  style?: React.CSSProperties;
}

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
    <div className="tooltip-wrapper" style={style}>
      {trigger}
      {visible && (
        <div
          ref={bubbleRef}
          className={`tooltip-bubble tooltip-${position}`}
          style={shiftStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
}
