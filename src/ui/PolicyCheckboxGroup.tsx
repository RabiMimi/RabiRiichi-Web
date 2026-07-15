export interface PolicyOption {
  value: number;
  labelKey: string;
}

interface PolicyCheckboxGroupProps {
  title: string;
  options: PolicyOption[];
  value: number;
  onChange: (newValue: number) => void;
  disabled: boolean;
  t: (key: string) => string;
}

export function PolicyCheckboxGroup({
  title,
  options,
  value,
  onChange,
  disabled,
  t,
}: PolicyCheckboxGroupProps) {
  const toggleFlag = (flag: number) => {
    if ((value & flag) !== 0) {
      onChange(value & ~flag);
    } else {
      onChange(value | flag);
    }
  };

  return (
    <div className="flex flex-col gap-1 text-[0.75rem]">
      <h4 className="m-0 mb-1 text-[0.8rem] text-[#ff7a99] font-bold">
        {title}
      </h4>
      <div className="flex flex-col gap-1">
        {options.map((p) => (
          <label
            key={p.value}
            className="flex items-center gap-1.5 text-[0.72rem] cursor-pointer leading-[1.2] text-[#ccc] hover:text-white transition-colors duration-150"
          >
            <input
              type="checkbox"
              checked={(value & p.value) !== 0}
              onChange={() => toggleFlag(p.value)}
              disabled={disabled}
              className="m-0 scale-[0.85] origin-left-center shrink-0 cursor-pointer"
            />
            {t(p.labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}
