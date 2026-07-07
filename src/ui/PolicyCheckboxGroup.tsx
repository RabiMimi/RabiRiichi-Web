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
    <div className="policy-group" style={{ fontSize: '0.75rem' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#ff7a99' }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {options.map((p) => (
          <label
            key={p.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              lineHeight: '1.2',
            }}
          >
            <input
              type="checkbox"
              checked={(value & p.value) !== 0}
              onChange={() => toggleFlag(p.value)}
              disabled={disabled}
              style={{
                margin: 0,
                transform: 'scale(0.85)',
                transformOrigin: 'left center',
              }}
            />
            {t(p.labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}
