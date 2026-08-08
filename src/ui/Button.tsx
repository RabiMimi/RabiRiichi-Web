import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'normal' | 'compact';

const BASE =
  'select-none border-none rounded-full font-semibold cursor-pointer transition-all duration-200 ' +
  'whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-[#ff7a99] to-[#ff6b8b] text-white ' +
    'shadow-[0_4px_12px_rgba(0,0,0,0.45)] [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] ' +
    'hover:not-disabled:from-[#ff8da7] hover:not-disabled:to-[#ff7a99] ' +
    'hover:not-disabled:shadow-[0_6px_16px_rgba(0,0,0,0.55)]',
  secondary:
    'bg-white/[0.08] text-[#eee] border border-white/15 ' +
    'hover:not-disabled:bg-white/[0.15] hover:not-disabled:border-white/25',
  danger:
    'bg-[#cc3333] text-white border border-[#772222] ' +
    'hover:not-disabled:bg-[#dd4444]',
};

const SIZING: Record<ButtonSize, string> = {
  normal: 'px-4 py-2 text-sm md:text-base',
  compact: 'px-2.5 py-1.5 text-xs md:text-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'normal',
      className = '',
      children,
      ...props
    },
    ref,
  ): React.JSX.Element => {
    return (
      <button
        ref={ref}
        className={`${BASE} ${VARIANT[variant]} ${SIZING[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
