import React from 'react';
import HealthGroup from './HealthGroup';
import type { HealthSection } from './types';

export interface PathSphere {
  key: string;
  label: string;
  section: HealthSection;
  /** Текущее значение 0–100 */
  current: number | null;
  /** Целевое значение 0–100 */
  target: number;
  /** Среднее за 7 дней 0–100 (для наложения «было → стало») */
  weekAvg?: number | null;
  color: string;
}

interface YourPathNowProps {
  spheres: PathSphere[];
  onOpenSection: (section: HealthSection) => void;
}

function Bar({ value, color, dashed, glow }: { value: number; color: string; dashed?: boolean; glow?: boolean }) {
  const widthPct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1 flex-1 rounded-full bg-white/[0.06]">
      <div
        className="relative h-full rounded-full"
        style={{
          width: `${widthPct}%`,
          backgroundColor: color,
          opacity: dashed ? 0.4 : 1,
          boxShadow: glow ? `0 0 12px ${color}66` : undefined,
        }}
      >
        {glow && widthPct > 2 && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/**
 * «Твой путь сейчас» (протокол 02.09): идёт сразу после разбора Rail.
 * Показывает текущие значения сфер 0–100 поверх целевых + наложение
 * среднего за 7 дней («было → стало»), без радар-баланса.
 */
export default function YourPathNow({ spheres, onOpenSection }: YourPathNowProps) {
  return (
    <HealthGroup title="Твой путь сейчас" padded>
      <div className="flex flex-col gap-4">
        {spheres.map(sphere => (
          <button
            key={sphere.key}
            type="button"
            onClick={() => onOpenSection(sphere.section)}
            className="flex flex-col gap-1.5 text-left active:opacity-80 transition-opacity"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#F2EFE8]/70">{sphere.label}</span>
              <span className="text-[13px] tabular-nums text-[#F2EFE8]/85">
                {sphere.current !== null ? Math.round(sphere.current) : '—'}
                <span className="text-[#F2EFE8]/35"> / {sphere.target}</span>
              </span>
            </div>
            <Bar value={sphere.current ?? 0} color={sphere.color} glow />
            <div className="flex items-center gap-2">
              <Bar value={sphere.target} color={sphere.color} dashed />
              <span className="text-[10px] text-[#F2EFE8]/30 whitespace-nowrap">цель</span>
              {sphere.weekAvg !== null && sphere.weekAvg !== undefined && (
                <span className="text-[10px] tabular-nums text-[#F2EFE8]/30 whitespace-nowrap">
                  7д: {Math.round(sphere.weekAvg)}
                </span>
              )}
            </div>
          </button>
        ))}
        <p className="text-[11px] text-[#F2EFE8]/30 leading-relaxed">
          Яркая полоса — сегодня, бледная — цель. Подпись «7д» — среднее за неделю: видно, растёшь или просел.
        </p>
      </div>
    </HealthGroup>
  );
}
