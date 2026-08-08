import { Toggle } from './Toggle';

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
          <Toggle
            key={p.value}
            appearance="inline"
            className="text-[0.72rem]"
            checked={(value & p.value) !== 0}
            onChange={() => toggleFlag(p.value)}
            disabled={disabled}
            label={t(p.labelKey)}
          />
        ))}
      </div>
    </div>
  );
}
