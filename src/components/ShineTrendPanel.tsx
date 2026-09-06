import React from 'react';

export type ShineTrendDay = {
  dateStr: string;
  dayOfWeek: string;
  dayOfMonth: number;
  monthStr: string;
  label: string;
  practicesCount: number;
  shineScore: number | null;
  hasHealthData: boolean;
  isToday: boolean;
};

type ShineTrendPanelProps = {
  period: '7' | '30' | '90';
  onPeriodChange: (period: '7' | '30' | '90') => void;
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  days: ShineTrendDay[];
  dayPractices: Array<{ practiceTitle: string; minutes: number }>;
  accentColor: string;
  practiceBarMax: number;
};

const DAYS_FULL: Record<string, string> = {
  Пн: 'Понедельник',
  Вт: 'Вторник',
  Ср: 'Среда',
  Чт: 'Четверг',
  Пт: 'Пятница',
  Сб: 'Суббота',
  Вс: 'Воскресенье',
};

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatFriendlyDate(dateStr: string, isToday: boolean, dayOfWeek: string) {
  if (isToday) return 'Сегодня';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Вчера';

  const [, month, day] = dateStr.split('-');
  const monthName = MONTHS[parseInt(month, 10) - 1];
  const dayName = DAYS_FULL[dayOfWeek] || dayOfWeek;
  return `${parseInt(day, 10)} ${monthName}, ${dayName}`;
}

function getShineAdvice(score: number | null) {
  if (score === null) return 'За этот день нет HealthKit / Health Connect данных, поэтому биометрический тренд не рассчитывается.';
  if (score >= 85) return 'Превосходное состояние. Высокая регулярность практик и отличный физиологический баланс организма.';
  if (score >= 70) return 'Стабильное состояние. Регулярные осознанные паузы защищают нервную систему от накопления стресса.';
  if (score >= 55) return 'Умеренный тонус. Рекомендуется уделить 5 минут глубокому расслаблению перед сном или сделать микропаузу.';
  return 'Период восстановления. Резервы энергии снижены. Попробуйте мягкое дыхание «Квадрат» для центрирования.';
}

export default function ShineTrendPanel({
  period,
  onPeriodChange,
  selectedIndex,
  onSelectDay,
  days,
  dayPractices,
  accentColor,
  practiceBarMax,
}: ShineTrendPanelProps) {
  const currentSelectedDay = days[selectedIndex];
  if (!currentSelectedDay) return null;

  const width = 300;
  const height = 120;
  const chartLeft = 20;
  const chartRight = 260;
  const chartWidth = chartRight - chartLeft;
  const axisLabelX = width - 12;
  const daysCount = days.length;

  const points = days.map((dVal, i) => {
    const x = daysCount > 1
      ? chartLeft + i * (chartWidth / (daysCount - 1))
      : chartLeft + chartWidth / 2;
    const clampedScore = dVal.shineScore === null ? null : Math.max(40, Math.min(100, dVal.shineScore));
    const y = clampedScore === null ? 95 : 95 - ((clampedScore - 40) / 60) * 80;
    return { x, y, ...dVal, originalIndex: i };
  });
  const scoredPoints = points.filter(p => p.hasHealthData && p.shineScore !== null);
  let previousPointHadHealthData = false;
  const shinePath = points.reduce((path, p) => {
    if (!p.hasHealthData || p.shineScore === null) {
      previousPointHadHealthData = false;
      return path;
    }
    const command = previousPointHadHealthData ? 'L' : 'M';
    previousPointHadHealthData = true;
    return `${path} ${command} ${p.x} ${p.y}`;
  }, '').trim();
  const hasEnoughTrendData = scoredPoints.length >= 2;
  const selectedScore = currentSelectedDay.shineScore;
  const prevScored = [...days]
    .slice(0, selectedIndex)
    .reverse()
    .find(d => d.shineScore !== null);
  const scoreDelta = selectedScore !== null && prevScored?.shineScore !== null && prevScored?.shineScore !== undefined
    ? selectedScore - (prevScored.shineScore as number)
    : null;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col items-center text-center gap-1.5">
        <span className="text-[11px] tracking-[0.16em] uppercase text-[#F2EFE8]/35">
          {formatFriendlyDate(currentSelectedDay.dateStr, currentSelectedDay.isToday, currentSelectedDay.dayOfWeek)}
        </span>
        <span className="font-display text-[64px] font-light tabular-nums leading-none tracking-tight" style={{ color: selectedScore !== null ? accentColor : undefined }}>
          {selectedScore !== null ? selectedScore : <span className="text-[#F2EFE8]/25">—</span>}
          {scoreDelta !== null && scoreDelta !== 0 && (
            <span
              className="font-sans text-[15px] font-medium tabular-nums align-top ml-1.5"
              style={{ color: scoreDelta > 0 ? '#7BC67E' : '#E8685A' }}
            >
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
            </span>
          )}
        </span>
        <span className="text-[13px] text-[#F2EFE8]/42">Сияние дня · 0–100</span>
        <p className="mt-1 text-[15px] text-[#F2EFE8]/60 leading-relaxed max-w-[300px]">
          {getShineAdvice(selectedScore)}
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
        {(['7', '30', '90'] as const).map((key) => {
          const active = period === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPeriodChange(key)}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-[160ms] ease-out active:scale-[0.97] ${
                active
                  ? 'bg-[#F2EFE8] text-[#08090A] shadow-[0_0_20px_rgba(242,239,232,0.25)]'
                  : 'text-[#F2EFE8]/42'
              }`}
            >
              {key === '7' ? 'Неделя' : key === '30' ? '30 дней' : '90 дней'}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[13px] text-[#F2EFE8]/42">
        <span>Сияние и практики</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            Сияние
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-sm bg-white/20" />
            Практики
          </span>
        </div>
      </div>

      <div className="w-full relative py-2">
        {!hasEnoughTrendData && (
          <div className="absolute inset-x-4 top-8 z-10 border-y border-white/[0.06] py-4 text-center backdrop-blur-md">
            <p className="text-[11px] text-white/55 leading-relaxed">
              Недостаточно реальных дневных health-данных для линии тренда. Подключите HealthKit / Health Connect или синхронизируйте кольцо несколько дней подряд.
            </p>
          </div>
        )}
        <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {[40, 70, 100].map((gridVal) => {
            const yCoord = 95 - ((gridVal - 40) / 60) * 80;
            return (
              <g key={gridVal} className="opacity-[0.1]">
                <line
                  x1={chartLeft - 6}
                  y1={yCoord}
                  x2={chartRight + 4}
                  y2={yCoord}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x={axisLabelX}
                  y={yCoord - 3}
                  className="text-[7px] font-mono fill-white text-right"
                  textAnchor="end"
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {period === '7' && points.map((p) => {
            const barW = 14;
            const maxPossibleBars = Math.max(practiceBarMax, 3);
            const barH = (p.practicesCount / maxPossibleBars) * 45;
            const barY = 95 - barH;
            const isSelected = p.originalIndex === selectedIndex;

            return (
              <g key={p.dateStr}>
                <rect
                  x={p.x - barW / 2}
                  y="15"
                  width={barW}
                  height="80"
                  rx="2"
                  className={`transition-all duration-300 ${isSelected ? 'fill-white/[0.03]' : 'fill-transparent'}`}
                />
                <rect
                  x={p.x - barW / 2}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="1.5"
                  fill={isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                  className="transition-all duration-300"
                />
                {p.practicesCount > 0 && (
                  <text
                    x={p.x}
                    y={barY - 4}
                    className={`text-[8px] font-mono font-medium text-center ${isSelected ? 'fill-white' : 'fill-white/30'}`}
                    textAnchor="middle"
                  >
                    {p.practicesCount}
                  </text>
                )}
              </g>
            );
          })}

          {hasEnoughTrendData && (
            <path
              d={shinePath}
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80"
            />
          )}

          {period !== '7' && hasEnoughTrendData && (
            <path
              d={`M ${scoredPoints[0].x} 95 ` + scoredPoints.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${scoredPoints[scoredPoints.length - 1].x} 95 Z`}
              fill="url(#shine-area-grad)"
              className="opacity-20"
            />
          )}

          <defs>
            <linearGradient id="shine-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1={points[selectedIndex].x}
            y1="10"
            x2={points[selectedIndex].x}
            y2="95"
            stroke={accentColor}
            strokeWidth="0.6"
            strokeDasharray="2,2"
            className="opacity-35"
          />

          {points.map((p) => {
            const isSelected = p.originalIndex === selectedIndex;
            if (!p.hasHealthData || p.shineScore === null) return null;

            const shouldRenderDot = period === '7' || isSelected || p.isToday || (period === '30' && p.dayOfMonth % 5 === 0);
            if (!shouldRenderDot) return null;

            return (
              <g key={`dot-${p.dateStr}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? '3.5' : '1.8'}
                  fill={isSelected ? accentColor : '#08090A'}
                  stroke={accentColor}
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {points.map((p) => {
            const isSelected = p.originalIndex === selectedIndex;
            let shouldShowLabel = false;
            if (period === '7') {
              shouldShowLabel = true;
            } else if (period === '30') {
              shouldShowLabel = p.dayOfMonth % 5 === 0 || p.isToday;
            } else {
              shouldShowLabel = p.dayOfMonth === 1 || p.isToday;
            }
            if (!shouldShowLabel) return null;

            return (
              <text
                key={`lbl-${p.dateStr}`}
                x={p.x}
                y="112"
                className={`text-[11px] transition-all duration-300 ${
                  isSelected
                    ? 'fill-[#F2EFE8]/90 font-medium'
                    : p.isToday
                      ? 'font-medium'
                      : 'fill-[#F2EFE8]/25'
                }`}
                style={p.isToday && !isSelected ? { fill: accentColor } : undefined}
                textAnchor="middle"
              >
                {p.label}
              </text>
            );
          })}

          {points.map((p) => {
            const colWidth = daysCount > 1
              ? chartWidth / (daysCount - 1)
              : chartWidth;
            return (
              <rect
                key={`click-${p.dateStr}`}
                x={p.x - colWidth / 2}
                y="10"
                width={colWidth}
                height="100"
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelectDay(p.originalIndex)}
              />
            );
          })}
        </svg>
      </div>

      <div className="border-t border-[rgba(242,239,232,0.12)] pt-4">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-[13px] text-[#F2EFE8]/42">Ритуалы</span>
          <span className="text-[13px] text-[#F2EFE8]/70 tabular-nums">{currentSelectedDay.practicesCount} сессий</span>
        </div>
        {dayPractices.length > 0 ? (
          <div className="flex flex-col">
            {dayPractices.map((p, pIdx) => (
              <div key={`${p.practiceTitle}-${pIdx}`} className="flex items-center justify-between py-3 border-b border-[rgba(242,239,232,0.12)] text-[15px] text-[#F2EFE8]/80">
                <span className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#F2EFE8]/30" />
                  {p.practiceTitle}
                </span>
                <span className="text-[13px] text-[#F2EFE8]/42">{p.minutes} мин</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#F2EFE8]/35 leading-relaxed">
            В этот день практик не зафиксировано.
          </p>
        )}
      </div>
    </div>
  );
}
