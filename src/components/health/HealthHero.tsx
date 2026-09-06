import React from 'react';

interface HealthHeroProps {
  value: React.ReactNode;
  meaning: string;
  children?: React.ReactNode;
}

export default function HealthHero({ value, meaning, children }: HealthHeroProps) {
  return (
    <div className="flex flex-col items-center text-center py-3 gap-2">
      <span className="font-display text-[64px] font-light text-[#F2EFE8] tabular-nums leading-none tracking-tight">
        {value}
      </span>
      <p className="text-[15px] text-[#F2EFE8]/50 leading-snug max-w-[280px]">{meaning}</p>
      {children}
    </div>
  );
}
