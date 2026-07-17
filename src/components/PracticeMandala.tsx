import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserStats } from '../types';

interface PracticeMandalaProps {
  stats: UserStats;
  streak?: number;
  weeksOffset?: number;
  size?: 'compact' | 'full';
  onCenterClick?: () => void;
  onWeekChange?: (offset: number) => void;
}

const LEVEL_COLORS = [
  'rgba(255,255,255,0.04)',
  'rgba(201,169,110,0.18)',
  'rgba(201,169,110,0.35)',
  'rgba(201,169,110,0.55)',
  'rgba(201,169,110,0.80)',
];

const LEVEL_STROKE = [
  'none',
  'rgba(201,169,110,0.10)',
  'rgba(201,169,110,0.20)',
  'rgba(201,169,110,0.30)',
  'rgba(201,169,110,0.40)',
];

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const BLOCK_LABELS = [
  '00:00–03:00', '03:00–06:00', '06:00–09:00', '09:00–12:00',
  '12:00–15:00', '15:00–18:00', '18:00–21:00', '21:00–00:00',
];

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx: number, cy: number, innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const p1 = polarToCartesian(cx, cy, innerR, startDeg);
  const p2 = polarToCartesian(cx, cy, innerR, endDeg);
  const p3 = polarToCartesian(cx, cy, outerR, endDeg);
  const p4 = polarToCartesian(cx, cy, outerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
}

function normalizeDate(dateStr: string): string {
  const now = new Date();
  if (dateStr.startsWith('Сегодня')) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (dateStr.startsWith('Вчера')) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  }
  const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return dateStr.slice(0, 10);
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`;
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

interface CellData {
  dayIdx: number;
  blockIdx: number;
  count: number;
  level: number;
  practices: { practiceTitle: string; minutes: number }[];
}

export default function PracticeMandala({
  stats,
  streak = 0,
  weeksOffset = 0,
  size = 'compact',
  onCenterClick,
  onWeekChange,
}: PracticeMandalaProps) {
  const [selectedCell, setSelectedCell] = useState<{ dayIdx: number; blockIdx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewBox = size === 'compact' ? 200 : 300;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const centerR = size === 'compact' ? 16 : 24;
  const ringThickness = size === 'compact' ? 7 : 11;
  const ringGap = size === 'compact' ? 2 : 3;
  const startGap = size === 'compact' ? 4 : 6;

  const rings = useMemo(() => {
    const result: { innerR: number; outerR: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const fromCenter = 6 - i;
      const innerR = centerR + startGap + fromCenter * (ringThickness + ringGap);
      result.push({ innerR, outerR: innerR + ringThickness });
    }
    return result;
  }, []);

  const weekStart = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + weeksOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [weeksOffset]);

  const cells = useMemo(() => {
    const map = new Map<string, { count: number; practices: { practiceTitle: string; minutes: number }[] }>();
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const entry of stats.history) {
      const dateKey = normalizeDate(entry.date);
      const d = new Date(dateKey + 'T12:00:00');
      if (d >= weekStart && d < weekEnd) {
        const dayIdx = (d.getDay() + 6) % 7;
        const hour = d.getHours();
        const blockIdx = Math.floor(hour / 3);
        const key = `${dayIdx}-${blockIdx}`;
        if (!map.has(key)) map.set(key, { count: 0, practices: [] });
        const cell = map.get(key)!;
        cell.count++;
        cell.practices.push({ practiceTitle: entry.practiceTitle, minutes: entry.minutes });
      }
    }

    const result: CellData[] = [];
    for (let d = 0; d < 7; d++) {
      for (let b = 0; b < 8; b++) {
        const entry = map.get(`${d}-${b}`);
        const count = entry?.count ?? 0;
        result.push({ dayIdx: d, blockIdx: b, count, level: getLevel(count), practices: entry?.practices ?? [] });
      }
    }
    return result;
  }, [stats.history, weekStart]);

  const handleSectorClick = (dayIdx: number, blockIdx: number) => {
    if (selectedCell?.dayIdx === dayIdx && selectedCell?.blockIdx === blockIdx) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ dayIdx, blockIdx });
    }
  };

  const selectedData = selectedCell
    ? cells.find(c => c.dayIdx === selectedCell.dayIdx && c.blockIdx === selectedCell.blockIdx)
    : null;

  const today = new Date();
  const todayDayIdx = (today.getDay() + 6) % 7;

  const ringSize = size === 'compact' ? 'w-44 h-44' : 'w-full max-w-[300px] h-auto';

  const dayLabelPositions = useMemo(() => {
    const outerR = rings[0].outerR;
    const labelR = outerR + (size === 'compact' ? 10 : 16);
    return DAY_LABELS.map((_, i) => {
      const angle = i * (360 / 7) - 90;
      const pos = polarToCartesian(cx, cy, labelR, angle);
      const norm = ((angle + 90) % 360 + 360) % 360;
      return { ...pos, label: DAY_LABELS[i], angle: norm };
    });
  }, [cx, cy, rings, size]);

  return (
    <div className="flex flex-col items-center" ref={containerRef}>
      {size === 'full' && (
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <button
            onClick={() => onWeekChange?.(weeksOffset - 1)}
            className="w-8 h-8 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center text-white/55 hover:text-white/80 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-white/50 font-medium">{formatWeekRange(weekStart)}</span>
          <button
            onClick={() => onWeekChange?.(weeksOffset + 1)}
            className="w-8 h-8 rounded-full bg-white/5 active:bg-white/10 flex items-center justify-center text-white/55 hover:text-white/80 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className={ringSize}>
          {cells.map((cell) => {
            const { dayIdx, blockIdx, level, count } = cell;
            const ring = rings[dayIdx];
            const startDeg = blockIdx * 45;
            const endDeg = startDeg + 45;
            const path = sectorPath(cx, cy, ring.innerR, ring.outerR, startDeg, endDeg);
            const isSelected = selectedCell?.dayIdx === dayIdx && selectedCell?.blockIdx === blockIdx;

            return (
              <motion.path
                key={`${dayIdx}-${blockIdx}`}
                d={path}
                fill={LEVEL_COLORS[level]}
                stroke={isSelected ? 'rgba(201,169,110,0.9)' : count > 0 ? LEVEL_STROKE[level] : 'none'}
                strokeWidth={isSelected ? 2 : count > 0 ? 0.5 : 0}
                className="cursor-pointer active:opacity-80"
                onClick={() => handleSectorClick(dayIdx, blockIdx)}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (dayIdx * 8 + blockIdx) * 0.008, duration: 0.3 }}
              />
            );
          })}

          <motion.g
            className="cursor-pointer"
            onClick={onCenterClick}
            whileTap={{ scale: 0.95 }}
          >
            <circle cx={cx} cy={cy} r={centerR} fill="rgba(201,169,110,0.06)" stroke="rgba(201,169,110,0.12)" strokeWidth="1" />
            <motion.circle
              cx={cx} cy={cy} r={centerR}
              fill="none" stroke="rgba(201,169,110,0.20)" strokeWidth="0.5"
              animate={{ rotate: 360 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="rgba(230,184,140,0.95)"
              fontSize={size === 'compact' ? 16 : 24} fontWeight="bold" fontFamily="ui-monospace,monospace">
              {streak}
            </text>
            <text x={cx} y={cy + (size === 'compact' ? 11 : 17)} textAnchor="middle" fill="rgba(255,255,255,0.35)"
              fontSize={size === 'compact' ? 5 : 7} fontFamily="ui-monospace,monospace" fontWeight="500">
              серия
            </text>
          </motion.g>

          {size === 'full' && dayLabelPositions.map((p) => (
            <text
              key={p.label}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.45)"
              fontSize={9}
              fontFamily="ui-monospace,monospace"
              fontWeight="600"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>

      <AnimatePresence mode="wait">
        {selectedData && (
          <motion.div
            key={`${selectedData.dayIdx}-${selectedData.blockIdx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2.5 text-center"
          >
            <span className="text-[11px] font-mono text-white/65 font-medium">
              {DAY_LABELS[selectedData.dayIdx]}, {BLOCK_LABELS[selectedData.blockIdx]}
            </span>
            <span className="text-[11px] font-mono text-white/30 mx-1.5">·</span>
            {selectedData.count > 0 ? (
              <span className="text-[11px] font-mono text-[#C9A96E] font-semibold">
                {selectedData.count} {selectedData.count === 1 ? 'практика' : selectedData.count < 5 ? 'практики' : 'практик'}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-white/30 font-medium">нет практик</span>
            )}
            {size === 'full' && selectedData.count > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {selectedData.practices.map((p, i) => (
                  <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/70 font-mono font-medium border border-white/5">
                    {p.practiceTitle}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {size === 'compact' && !selectedCell && (
        <p className="text-[10px] font-mono text-white/25 mt-2 font-medium">коснитесь сектора для деталей</p>
      )}
    </div>
  );
}
