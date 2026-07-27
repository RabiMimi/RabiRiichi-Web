import React from 'react';
import { FORM } from './styles';

export type InputSize = 'normal' | 'inline';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { inputSize = 'normal', className = '', ...props },
    ref,
  ): React.JSX.Element => {
    const baseClass = inputSize === 'inline' ? FORM.inputInline : FORM.input;
    return (
      <input ref={ref} className={`${baseClass} ${className}`} {...props} />
    );
  },
);

Input.displayName = 'Input';
