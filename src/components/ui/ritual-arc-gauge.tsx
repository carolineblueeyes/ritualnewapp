import React from 'react';

interface RitualArcGaugeProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
}

export default function RitualArcGauge({
  value,
  max = 100,
  label = '',
  color = '#8fb7ff',
  size = 220,
}: RitualArcGaugeProps) {
  const ticks = 37;
  const clamped = Math.max(0, Math.min(max, value));
  const activeTicks = Math.round((clamped / max) * ticks);
  const radius = size / 2 - 18;
  const center = size / 2;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size / 1.75 }}>
      <svg width={size} height={size / 1.75} viewBox={`0 0 ${size} ${size / 1.75}`} aria-hidden="true">
        {Array.from({ length: ticks }).map((_, index) => {
          const angle = 205 + (130 / (ticks - 1)) * index;
          const rad = (angle * Math.PI) / 180;
          const inner = radius - 8;
          const outer = radius + 14;
          const x1 = center + inner * Math.cos(rad);
          const y1 = center + inner * Math.sin(rad);
          const x2 = center + outer * Math.cos(rad);
          const y2 = center + outer * Math.sin(rad);
          const active = index < activeTicks;
          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? color : 'rgba(255,255,255,0.18)'}
              strokeWidth={active ? 4 : 3}
              strokeLinecap="round"
              opacity={active ? 0.95 : 0.48}
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">{label}</p>
        <p className="mt-1 text-4xl font-light leading-none text-white">{Math.round(clamped)}</p>
      </div>
    </div>
  );
}
