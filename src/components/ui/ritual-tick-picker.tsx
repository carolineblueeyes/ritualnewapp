import React from 'react';

interface RitualTickPickerProps {
  label: string;
  value: number;
  values: number[];
  unit?: string;
  color?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export default function RitualTickPicker({
  label,
  value,
  values,
  unit = '',
  color = '#8fb7ff',
  onChange,
  formatValue,
}: RitualTickPickerProps) {
  const selectedIndex = Math.max(0, values.indexOf(value));
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="relative overflow-hidden rounded-[34px] bg-black/72 px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black to-transparent" />
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/36">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-5xl font-light leading-none text-white">{displayValue}</span>
            {unit ? <span className="text-lg font-light text-white/42">{unit}</span> : null}
          </div>
        </div>
        <span className="pb-1 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color }}>
          {selectedIndex + 1}/{values.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-10 py-2">
        {values.map((tick) => {
          const isSelected = tick === value;
          const distance = Math.abs(values.indexOf(tick) - selectedIndex);
          return (
            <button
              key={tick}
              type="button"
              onClick={() => onChange(tick)}
              className="flex min-w-7 flex-col items-center gap-2 active:scale-95"
              aria-label={`${label}: ${tick}${unit}`}
            >
              <span
                className="w-2 rounded-full transition-all duration-300"
                style={{
                  height: isSelected ? 54 : Math.max(26, 48 - distance * 5),
                  backgroundColor: isSelected ? color : 'rgba(255,255,255,0.24)',
                  boxShadow: isSelected ? `0 0 22px ${color}88` : undefined,
                  opacity: isSelected ? 1 : Math.max(0.24, 0.74 - distance * 0.12),
                }}
              />
              <span className={`text-[10px] font-mono ${isSelected ? 'text-white' : 'text-white/32'}`}>
                {tick}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
