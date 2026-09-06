import React from 'react';

/** JCRing SleepLineView: progress bar where fill = value/max (with 5% min padding). */
export default function MetricGaugeBar({
  value,
  max,
  color = '#B0C9FF',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  if (max <= 0 || value <= 0) {
    return <div className="h-1.5 rounded-full bg-white/[0.06]" />;
  }

  const ratio = value / max;
  const widthPct = value >= max ? 100 : Math.min(100, Math.max(8, ratio * 90 + 5));

  return (
    <div className="h-1.5 rounded-full bg-white/[0.06]">
      <div
        className="relative h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${widthPct}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}
      >
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
