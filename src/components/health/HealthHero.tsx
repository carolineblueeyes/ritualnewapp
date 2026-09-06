import React from 'react';

interface HealthHeroProps {
  value: React.ReactNode;
  meaning: string;
  /** Small-caps eyebrow над цифрой («КАЧЕСТВО СНА», «ШАГИ») */
  eyebrow?: string;
  /** Акцентная дельта справа от цифры («+5», «−3») в цвете deltaColor */
  delta?: string | null;
  deltaColor?: string;
  children?: React.ReactNode;
}

export default function HealthHero({ value, meaning, eyebrow, delta, deltaColor = '#7BC67E', children }: HealthHeroProps) {
  return (
    <div className="flex flex-col items-center text-center py-3 gap-2">
      {eyebrow && (
        <span className="text-[11px] tracking-[0.16em] uppercase text-[#F2EFE8]/35">
          {eyebrow}
        </span>
      )}
      <span className="font-display text-[80px] font-light text-[#F2EFE8] tabular-nums leading-none tracking-tight">
        {value}
        {delta && (
          <span className="font-sans text-[15px] font-medium tabular-nums align-top ml-1.5" style={{ color: deltaColor }}>
            {delta}
          </span>
        )}
      </span>
      <p className="text-[15px] text-[#F2EFE8]/50 leading-snug max-w-[280px]">{meaning}</p>
      {children}
    </div>
  );
}
