import React from 'react';
import { FORM } from './styles';

export type SelectSize = 'normal' | 'inline';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: SelectSize;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { selectSize = 'normal', className = '', children, ...props },
    ref,
  ): React.JSX.Element => {
    const baseClass = selectSize === 'inline' ? FORM.selectInline : FORM.select;
    return (
      <select ref={ref} className={`${baseClass} ${className}`} {...props}>
        {children}
      </select>
    );
  },
);

Select.displayName = 'Select';
