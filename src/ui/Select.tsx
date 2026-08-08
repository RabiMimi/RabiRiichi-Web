import React from 'react';
import { FORM } from './styles';

export type SelectSize = 'normal' | 'inline' | 'compact';

const SIZE_CLASS: Record<SelectSize, string> = {
  normal: FORM.select,
  inline: FORM.selectInline,
  compact: FORM.selectCompact,
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: SelectSize;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { selectSize = 'normal', className = '', children, ...props },
    ref,
  ): React.JSX.Element => (
    <select
      ref={ref}
      className={`${SIZE_CLASS[selectSize]} ${className}`}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';

/**
 * The same chevron the selects draw, as an element.
 *
 * A `<select>` gets it as a background image (see FORM.select); anything that
 * merely behaves like a dropdown — a menu button, say — needs a real node.
 * Both have to be the same glyph, or "opens a list" reads differently
 * depending on which control you happen to be looking at.
 */
export function ChevronDown({
  className = '',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
