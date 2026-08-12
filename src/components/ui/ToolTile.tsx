import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ToolTileProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onClick: () => void;
  accent?: string;
}

export default function ToolTile({ title, subtitle, icon: Icon, onClick, accent = '#74B6A0' }: ToolTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-full min-h-[104px] w-full grid-rows-[36px_1fr] gap-3 rounded-[20px] border border-white/10 bg-white/[0.06] p-4 text-left backdrop-blur-xl transition-transform duration-[160ms] ease-out active:scale-[0.97] overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at 88% 12%, ${accent}55, transparent 52%)`,
        }}
      />
      <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.08]">
        <Icon className="h-4 w-4 text-[#F2EFE8]/75" strokeWidth={2} />
      </div>
      <div className="relative z-10 flex min-h-[40px] flex-col justify-end">
        <h4 className="truncate text-[15px] font-semibold leading-tight text-[#F2EFE8]/92">{title}</h4>
        <span className="mt-1 block truncate text-[11px] text-[#F2EFE8]/42">{subtitle}</span>
      </div>
    </button>
  );
}
