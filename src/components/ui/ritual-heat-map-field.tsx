import React from 'react';

interface RitualHeatMapFieldProps {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  className?: string;
}

export default function RitualHeatMapField({
  title = 'Balance field',
  xLabel = 'Load',
  yLabel = 'Recovery',
  primaryColor = '#22d3ee',
  secondaryColor = '#3b82f6',
  accentColor = '#ec4899',
  className = '',
}: RitualHeatMapFieldProps) {
  return (
    <div className={`relative h-56 overflow-hidden border-y border-white/[0.07] ${className}`}>
      <div
        className="absolute inset-0 opacity-44"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.28) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="absolute left-1/2 top-5 bottom-5 w-px bg-white/12" />
      <div className="absolute left-5 right-5 top-1/2 h-px bg-white/12" />
      <div
        className="absolute left-[18%] top-[30%] h-28 w-44 rounded-full blur-2xl"
        style={{ backgroundColor: primaryColor, opacity: 0.52 }}
      />
      <div
        className="absolute left-[34%] top-[24%] h-32 w-52 rounded-full blur-2xl"
        style={{ backgroundColor: secondaryColor, opacity: 0.48 }}
      />
      <div
        className="absolute left-[20%] top-[43%] h-20 w-20 rounded-full blur-xl"
        style={{ backgroundColor: accentColor, opacity: 0.76 }}
      />
      <span className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] font-mono text-white/48">{yLabel}</span>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/48">{xLabel}</span>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/48">{title}</span>
    </div>
  );
}
