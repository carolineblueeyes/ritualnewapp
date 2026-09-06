import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import HealthSparkline from './HealthSparkline';
import type { ShineState } from '../../services/health/shine';
import { driverBorderColor } from './driverInsights';

export interface HealthDriverCardProps {
  label: string;
  value: number | null | undefined;
  formattedValue?: string;
  sparklineData: number[];
  sparklineColor?: string;
  insight: string;
  driverRole?: 'primary' | 'secondary' | null;
  shineState?: ShineState;
  defaultExpanded?: boolean;
  onPress?: () => void;
}

export default function HealthDriverCard({
  label,
  value,
  formattedValue,
  sparklineData,
  sparklineColor = '#74B6A0',
  insight,
  driverRole = null,
  shineState,
  defaultExpanded = false,
  onPress,
}: HealthDriverCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasData = value !== null && value !== undefined;
  const borderColor = driverBorderColor(shineState, driverRole);
  const displayValue = hasData ? (formattedValue ?? String(value)) : '—';

  const toggle = () => {
    setExpanded(prev => !prev);
    onPress?.();
  };

  return (
    <div className="border-b border-[rgba(242,239,232,0.08)] last:border-0">
      <button
        type="button"
        onClick={toggle}
        className="w-full py-3.5 text-left active:opacity-80 transition-opacity duration-[160ms]"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {driverRole && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: borderColor ?? sparklineColor }}
                aria-hidden="true"
              />
            )}
            <span className="text-[13px] text-[#F2EFE8]/70">{label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[15px] text-[#F2EFE8]/88 tabular-nums">{displayValue}</span>
            <ChevronDown
              className={`w-4 h-4 text-[#F2EFE8]/35 transition-transform duration-[200ms] ease-out ${
                expanded ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          </div>
        </div>

        {expanded && (
          <div className="mt-3">
            <HealthSparkline
              data={sparklineData}
              color={sparklineColor}
              height={80}
            />
            <p className="mt-3 text-[13px] text-[#F2EFE8]/50 leading-relaxed">
              {hasData ? insight : 'Подключите NŌW Core или Health Connect, чтобы увидеть динамику.'}
            </p>
          </div>
        )}
      </button>
    </div>
  );
}
