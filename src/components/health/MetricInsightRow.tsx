import React from 'react';
import MetricGaugeBar from './MetricGaugeBar';
import QualityBadge from './QualityBadge';
import type { QualityTier } from './healthQuality';

interface MetricInsightRowProps {
  label: string;
  value: string;
  hint?: string;
  tier?: QualityTier | null;
  gaugeValue?: number | null;
  gaugeMax?: number | null;
  gaugeColor?: string;
}

export default function MetricInsightRow({
  label,
  value,
  hint,
  tier,
  gaugeValue,
  gaugeMax,
  gaugeColor,
}: MetricInsightRowProps) {
  const showGauge = gaugeValue != null && gaugeMax != null && gaugeMax > 0;

  return (
    <div className="flex flex-col gap-2.5 py-3.5 border-b border-[rgba(242,239,232,0.08)] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[13px] text-[#F2EFE8]/42">{label}</span>
          {hint && <span className="text-[11px] text-[#F2EFE8]/28 leading-relaxed">{hint}</span>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[15px] text-[#F2EFE8]/88 tabular-nums">{value}</span>
          {tier != null && <QualityBadge tier={tier} />}
        </div>
      </div>
      {showGauge && (
        <MetricGaugeBar value={gaugeValue!} max={gaugeMax!} color={gaugeColor} />
      )}
    </div>
  );
}
