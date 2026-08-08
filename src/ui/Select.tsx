import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

export type SelectSize = 'normal' | 'inline' | 'compact';

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
  isHeader?: boolean;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value'
> {
  selectSize?: SelectSize;
  value?: string | number;
  options?: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

const CONTAINER_SIZE_CLASS: Record<SelectSize, string> = {
  normal: 'h-10 text-base px-4 py-2',
  inline: 'h-8 text-sm px-3 py-1.5',
  compact: 'h-7 text-xs px-2.5 py-1',
};

const MENU_ITEM_SIZE_CLASS: Record<SelectSize, string> = {
  normal: 'px-4 py-2 text-sm',
  inline: 'px-3 py-1.5 text-xs',
  compact: 'px-2.5 py-1 text-xs',
};

const noop = () => {
  /* noop */
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      selectSize = 'normal',
      value,
      options: optionsProp,
      onChange,
      onValueChange,
      disabled = false,
      className = '',
      children,
      id,
      name: nameAttr,
    },
    ref,
  ): React.JSX.Element => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement | null>(null);

    // Combine external ref and internal ref
    const setRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        nativeSelectRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    // Extract options from props or React children (<option> & <optgroup>)
    const parsedOptions = useMemo<SelectOption[]>(() => {
      if (optionsProp) return optionsProp;

      const extracted: SelectOption[] = [];

      const processNode = (node: React.ReactNode) => {
        React.Children.forEach(node, (child) => {
          if (!React.isValidElement(child)) return;

          if (child.type === 'option') {
            const optProps = child.props as {
              value?: string | number;
              children?: React.ReactNode;
              disabled?: boolean;
            };
            const valLabel =
              typeof optProps.children === 'string' ||
              typeof optProps.children === 'number'
                ? String(optProps.children)
                : '';
            const val = optProps.value ?? valLabel;
            extracted.push({
              value: val,
              label: optProps.children ?? String(val),
              disabled: Boolean(optProps.disabled),
            });
          } else if (child.type === 'optgroup') {
            const groupProps = child.props as {
              label: string;
              children?: React.ReactNode;
            };
            // Add a disabled header option for the group
            extracted.push({
              value: `__group_header_${groupProps.label}_${extracted.length}`,
              label: groupProps.label,
              disabled: true,
              isHeader: true,
            });
            processNode(groupProps.children);
          } else if (
            child.props &&
            (child.props as { children?: React.ReactNode }).children
          ) {
            processNode(
              (child.props as { children?: React.ReactNode }).children,
            );
          }
        });
      };

      processNode(children);
      return extracted;
    }, [optionsProp, children]);

    const stringValue = value !== undefined ? String(value) : '';
    const selectedOption =
      parsedOptions.find(
        (opt) => !opt.isHeader && String(opt.value) === stringValue,
      ) ??
      parsedOptions.find((opt) => !opt.isHeader) ??
      parsedOptions[0];

    const handleSelectOption = useCallback(
      (optValue: string | number) => {
        if (disabled) return;
        const stringVal = String(optValue);

        if (nativeSelectRef.current) {
          nativeSelectRef.current.value = stringVal;
        }

        if (onValueChange) {
          onValueChange(stringVal);
        }

        if (onChange) {
          const syntheticEvent = {
            target: { value: stringVal, id, name: nameAttr },
            currentTarget: { value: stringVal, id, name: nameAttr },
            preventDefault: noop,
            stopPropagation: noop,
          } as unknown as React.ChangeEvent<HTMLSelectElement>;
          onChange(syntheticEvent);
        }

        setIsOpen(false);
      },
      [disabled, id, nameAttr, onChange, onValueChange],
    );

    // Close menu on click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Keyboard handling
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (!isOpen) {
        if (
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          e.preventDefault();
          setIsOpen(true);
          const idx = parsedOptions.findIndex(
            (opt) => !opt.isHeader && String(opt.value) === stringValue,
          );
          setFocusedIndex(idx >= 0 ? idx : 0);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (
            next < parsedOptions.length &&
            (parsedOptions[next]?.disabled || parsedOptions[next]?.isHeader)
          ) {
            next++;
          }
          return next < parsedOptions.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (
            next >= 0 &&
            (parsedOptions[next]?.disabled || parsedOptions[next]?.isHeader)
          ) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < parsedOptions.length) {
          const targetOpt = parsedOptions[focusedIndex];
          if (targetOpt && !targetOpt.disabled && !targetOpt.isHeader) {
            handleSelectOption(targetOpt.value);
          }
        }
      }
    };

    return (
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className={`relative inline-block select-none ${
          className.includes('w-') ? '' : 'w-full'
        } ${className}`}
      >
        {/* Hidden native select for form compatibility / testing accessibility */}
        <select
          ref={setRefs}
          id={id}
          name={nameAttr}
          value={stringValue}
          disabled={disabled}
          onChange={onChange}
          tabIndex={-1}
          className="sr-only"
        >
          {parsedOptions.map((opt) => {
            if (opt.isHeader) {
              return (
                <optgroup
                  key={String(opt.value)}
                  label={
                    typeof opt.label === 'string' ||
                    typeof opt.label === 'number'
                      ? String(opt.label)
                      : String(opt.value)
                  }
                />
              );
            }
            return (
              <option
                key={String(opt.value)}
                value={String(opt.value)}
                disabled={opt.disabled}
              >
                {typeof opt.label === 'string' ? opt.label : String(opt.value)}
              </option>
            );
          })}
        </select>

        {/* Custom Trigger Button - Dark Gray / Glassmorphism Theme */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-2 rounded-full border border-[#555] bg-[#1a1a1a]/95 text-white font-medium outline-none transition-all duration-200 hover:not-disabled:border-[#ff7a99]/60 focus:border-[#ff7a99] focus:ring-2 focus:ring-[#ff7a99]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
            CONTAINER_SIZE_CLASS[selectSize]
          } ${isOpen ? 'border-[#ff7a99] ring-2 ring-[#ff7a99]/30' : ''}`}
        >
          <span className="truncate text-left flex-1 min-w-0">
            {selectedOption ? selectedOption.label : ''}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-white/70 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#ff7a99]' : ''
            }`}
          />
        </button>

        {/* Floating Dropdown Popup - Dark Gray / Transparent Glass Theme */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 mt-1.5 z-[9999] rounded-xl border border-white/20 bg-[#1a1a1a]/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(255,122,153,0.08)] py-1.5 overflow-y-auto max-h-56 animate-in fade-in slide-in-from-top-1 duration-150"
            role="listbox"
          >
            {parsedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                No options
              </div>
            ) : (
              parsedOptions.map((opt, idx) => {
                if (opt.isHeader) {
                  return (
                    <div
                      key={String(opt.value)}
                      className="px-3.5 py-1.5 text-[0.7rem] font-bold text-[#ff7a99]/80 select-none uppercase tracking-wider border-t border-white/5 first:border-t-0 mt-1.5 first:mt-0"
                    >
                      {opt.label}
                    </div>
                  );
                }

                const isSelected = String(opt.value) === stringValue;
                const isFocused = idx === focusedIndex;

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelectOption(opt.value);
                      }
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`cursor-pointer transition-colors duration-120 flex items-center justify-between gap-2 ${
                      MENU_ITEM_SIZE_CLASS[selectSize]
                    } ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-gray-500'
                        : isSelected
                          ? 'bg-white/[0.12] text-[#ff7a99] font-bold'
                          : isFocused
                            ? 'bg-white/10 text-white'
                            : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 shrink-0 text-[#ff7a99]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

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
