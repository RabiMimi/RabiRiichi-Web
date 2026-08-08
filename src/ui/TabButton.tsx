import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabButton({
  active,
  onClick,
  children,
  className = '',
  disabled,
}: TabButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`bg-transparent border-none text-sm font-bold px-3 py-1.5 cursor-pointer rounded transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'text-[#ff7a99] bg-white/[0.05] shadow-[inset_0_-2px_0_#ff7a99]'
          : 'text-[#888] hover:text-white hover:bg-[#ff7a99]/[0.08]'
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
