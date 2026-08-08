import React from 'react';

/**
 * Visual variants for {@link IconButton}. All share the same dark, rounded,
 * bordered base; they differ only in the hover accent colour (and its glow).
 */
export type IconButtonVariant = 'default' | 'exit' | 'client' | 'server';

// Base look shared by every icon button (formerly the `.info-icon-btn` CSS).
const BASE =
  'pointer-events-auto flex cursor-pointer items-center justify-center ' +
  'rounded-lg border-[1.5px] border-[#444] bg-[#141414]/85 text-white ' +
  'shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200 ' +
  'hover:scale-105';

// Per-variant hover accent. Full literal strings so Tailwind can scan them.
const VARIANT: Record<IconButtonVariant, string> = {
  default: 'hover:border-[#ff7a99] hover:text-[#ff7a99]',
  exit: 'hover:border-[#ff3333] hover:text-[#ff3333]',
  client:
    'hover:border-[#ff7a99] hover:text-[#ff7a99] ' +
    'hover:shadow-[0_4px_12px_rgba(255,122,153,0.35)]',
  server:
    'hover:border-[#80deea] hover:text-[#80deea] ' +
    'hover:shadow-[0_4px_12px_rgba(128,222,234,0.35)]',
};

// Padding differs: badge buttons (client/server) are fixed-size, no padding.
const SIZING: Record<IconButtonVariant, string> = {
  default: 'w-fit p-2',
  exit: 'w-fit p-2',
  client: 'relative h-[38px] w-[38px] p-0',
  server: 'relative h-[38px] w-[38px] p-0',
};

interface CommonProps {
  variant?: IconButtonVariant;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    as?: 'button';
  };

type AnchorProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    as: 'a';
  };

export type IconButtonProps = ButtonProps | AnchorProps;

/**
 * A dark, rounded icon button used across the HUD, lobby and modals. Renders a
 * `<button>` by default, or an `<a>` when `as="a"`. Consolidates what used to be
 * the `.info-icon-btn` / `.exit-btn` / `.github-btn` CSS families.
 */
export function IconButton(props: IconButtonProps): React.JSX.Element {
  const variant = props.variant ?? 'default';
  const classes =
    `${BASE} ${VARIANT[variant]} ${SIZING[variant]} ` +
    `${props.className ?? ''}`;

  if (props.as === 'a') {
    const { variant: _v, className: _c, as: _a, children, ...rest } = props;
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const { variant: _v, className: _c, as: _a, children, ...rest } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
