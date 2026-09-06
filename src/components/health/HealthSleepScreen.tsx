import React, { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Lock, Sparkles } from 'lucide-react';
import type { ShineBreakdown } from '../../services/health/shine';
import HealthScreenShell from './HealthScreenShell';
import HealthHero from './HealthHero';
import HealthGroup from './HealthGroup';
import SleepHypnogram from './SleepHypnogram';
import { StageProgressBar } from './HealthPeriodChart';
import OvernightAreaChart from './OvernightAreaChart';
import MetricInsightRow from './MetricInsightRow';
import QualityBadge from './QualityBadge';
import { formatDurationHours, formatDurationMinutes, formatClockTime, finiteOrNull, shiftDate, todayIso, formatFriendlyDate } from './format';
import {
  computeSleepScore,
  sleepScoreLabel,
  sleepDescription,
  sleepEfficiency,
  sleepLatencyMinutes,
  stageMinutes,
  totalSleepMinutes,
  timeInBedMinutes,
  SLEEP_STAGE_META,
  extractNapSegments,
} from './sleepUtils';
import {
  getQualityMeta,
  qualityDeepSleepPct,
  qualityHrv,
  qualityRemSleepPct,
  qualitySleepAvgHr,
  qualitySleepDurationRatio,
  qualitySleepEfficiency,
  qualitySleepLatency,
  qualitySleepScore,
  qualitySpo2,
  qualityTimeInBed,
} from './healthQuality';
import {
  averagePointValue,
  filterPointsToWindow,
  maxPointValue,
  minPointValue,
  useHealthCategoryData,
  useRingSeries,
} from './useHealthCategoryData';
import type { HealthPeriod } from './types';
import type { DailyHealthPoint, HealthMetrics, HealthHistoryByMetric } from '../../services/health/types';

interface HealthSleepScreenProps {
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  hasRing: boolean;
  healthMetrics: HealthMetrics;
  historySleep: DailyHealthPoint[];
  accentColor: string;
  shine?: ShineBreakdown;
  periodsLocked?: boolean;
  onLockedPeriodClick?: () => void;
  isSubscribed?: boolean;
  onOpenSubscription?: () => void;
}

const SLEEP_GOAL_MINUTES = 480;

export default function HealthSleepScreen({
  period: _period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  hasRing,
  healthMetrics,
  historySleep,
  periodsLocked,
  onLockedPeriodClick,
  isSubscribed,
  onOpenSubscription,
}: HealthSleepScreenProps) {
  const { loading, selectedSummary } = useHealthCategoryData({
    hasRing,
    selectedDate,
    period: 'day',
    historyByMetric: { sleepHours: historySleep } as HealthHistoryByMetric,
  });

  const hrSeries = useRingSeries('heartRate', hasRing, 2);
  const hrvSeries = useRingSeries('hrv', hasRing, 2);
  const spo2Series = useRingSeries('spo2', hasRing, 2);

  const summary = selectedSummary;
  const asleepMin = totalSleepMinutes(summary);
  const asleepHours = asleepMin > 0 ? asleepMin / 60 : healthMetrics.sleepHours;
  const bedMin = timeInBedMinutes(summary);
  const score = computeSleepScore(summary);
  const scoreText = sleepScoreLabel(score);
  const scoreTier = score !== null ? qualitySleepScore(score) : null;
  const efficiency = sleepEfficiency(summary);
  const latency = sleepLatencyMinutes(summary);
  const naps = extractNapSegments(summary);
  const stageTotal = Math.max(asleepMin + stageMinutes(summary, 'awake'), 1);

  const overnightHr = useMemo(
    () => filterPointsToWindow(hrSeries, summary?.sleepStart, summary?.sleepEnd),
    [hrSeries, summary?.sleepStart, summary?.sleepEnd],
  );
  const overnightHrv = useMemo(
    () => filterPointsToWindow(hrvSeries, summary?.sleepStart, summary?.sleepEnd),
    [hrvSeries, summary?.sleepStart, summary?.sleepEnd],
  );
  const overnightSpo2 = useMemo(
    () => filterPointsToWindow(spo2Series, summary?.sleepStart, summary?.sleepEnd),
    [spo2Series, summary?.sleepStart, summary?.sleepEnd],
  );

  const avgHr = summary?.restingHR ?? averagePointValue(overnightHr);
  const avgHrv = summary?.hrv ?? averagePointValue(overnightHrv) ?? healthMetrics.hrv;
  const avgSpo2 = summary?.spo2 ?? averagePointValue(overnightSpo2);
  const minHr = summary?.heartRateMin ?? minPointValue(overnightHr);
  const maxHr = summary?.heartRateMax ?? maxPointValue(overnightHr);
  const minSpo2 = summary?.spo2Min ?? minPointValue(overnightSpo2);
  const maxSpo2 = summary?.spo2Max ?? maxPointValue(overnightSpo2);
  const minHrv = minPointValue(overnightHrv);
  const maxHrv = maxPointValue(overnightHrv);

  const durationRatio = asleepMin > 0 ? asleepMin / SLEEP_GOAL_MINUTES : null;
  const efficiency01 = efficiency !== null ? efficiency / 100 : null;

  const sleepDelta = useMemo(() => {
    const pts = historySleep
      .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
      .slice(-2);
    if (pts.length < 2) return null;
    const diffMin = Math.round(((pts[1].value as number) - (pts[0].value as number)) * 60);
    if (diffMin === 0) return null;
    return {
      text: `${diffMin > 0 ? '+' : ''}${diffMin} мин`,
      color: diffMin > 0 ? '#7BC67E' : '#E8685A',
    };
  }, [historySleep]);

  // Свайп по карточке оценки листает дни (как на скетче).
  const touchStartX = useRef<number | null>(null);
  const goDay = (delta: number) => {
    const next = shiftDate(selectedDate, delta);
    if (next > todayIso()) return;
    onSelectedDateChange(next);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    goDay(dx < 0 ? 1 : -1);
  };

  const railText = useMemo(() => {
    if (!isSubscribed) return null;
    const parts: string[] = [];
    if (asleepHours !== null && asleepHours > 0) {
      parts.push(`Спал ${formatDurationHours(asleepHours).replace(' ', '')} — ${scoreText.toLowerCase()}.`);
    }
    if (efficiency !== null) {
      parts.push(efficiency >= 85 ? 'Эффективность высокая, ночь цельная.' : 'Ночь прерывистая, смотри на пробуждения.');
    }
    if (latency !== null) {
      parts.push(latency <= 20 ? 'Засыпание быстрое.' : 'Засыпание затянуто — убери свет и экран за час.');
    }
    if (avgHrv !== null) {
      parts.push(avgHrv >= 40 ? 'ВСР держится — восстановление идёт.' : 'ВСР снижена — сегодня мягкий ритм.');
    }
    if (!parts.length) return sleepDescription(summary, score);
    return parts.join(' ');
  }, [isSubscribed, asleepHours, scoreText, efficiency, latency, avgHrv, summary, score]);

  const isToday = selectedDate === todayIso();

  return (
    <HealthScreenShell
      period="day"
      onPeriodChange={onPeriodChange}
      selectedDate={selectedDate}
      onSelectedDateChange={onSelectedDateChange}
      periodsLocked={periodsLocked}
      onLockedPeriodClick={onLockedPeriodClick}
      hidePeriods
    >
      {/* Заголовок Сон + стрелки дней */}
      <div className="flex items-center justify-between px-1 -mb-2">
        <div className="flex flex-col">
          <h2 className="font-display text-[28px] font-light leading-none text-[#F2EFE8]">Сон</h2>
          <span className="text-[13px] text-[#F2EFE8]/42 mt-1">{formatFriendlyDate(selectedDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Предыдущий день"
            onClick={() => goDay(-1)}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#F2EFE8]/60 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Следующий день"
            onClick={() => goDay(1)}
            disabled={isToday}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#F2EFE8]/60 active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Оценка сна — свайп листает дни */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] px-4 pt-2 pb-4 touch-pan-y"
      >
        <div key={selectedDate} className="animate-section-fade">
          <HealthHero
            value={asleepHours !== null ? formatDurationHours(asleepHours) : '—'}
            meaning={score !== null ? scoreText : 'Общий сон'}
            eyebrow="Оценка сна"
            delta={sleepDelta?.text ?? null}
            deltaColor={sleepDelta?.color}
          >
            {scoreTier != null && <QualityBadge tier={scoreTier} />}
          </HealthHero>
        </div>
        <p className="text-[15px] text-[#F2EFE8]/55 leading-relaxed px-1 text-center">
          {sleepDescription(summary, score)}
        </p>
        <p className="text-[11px] text-[#F2EFE8]/25 text-center mt-2">Свайп влево / вправо — другой день</p>
      </div>

      {/* Расшифровка Rail */}
      {isSubscribed ? (
        <div className="rounded-[22px] border border-[#8D4FFF]/25 bg-[#8D4FFF]/[0.07] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8D4FFF]" />
            <span className="text-[13px] font-medium text-[#F2EFE8]/80">Разбор от Rail</span>
          </div>
          <p className="text-[14px] text-[#F2EFE8]/70 leading-relaxed mt-2">{railText}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenSubscription?.()}
          className="rounded-[22px] border border-amber-200/20 bg-amber-200/[0.06] p-4 text-left active:scale-[0.99] transition-transform"
        >
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-amber-200/90">
            <Lock className="w-3.5 h-3.5" /> Разбор от Rail
          </span>
          <span className="text-[13px] text-[#F2EFE8]/50 block mt-1 leading-relaxed">
            Что хотел сон / что получил — расшифровка ночи, фазы и рекомендации. Открой с Rail.
          </span>
        </button>
      )}

      <HealthGroup title="Фазы" padded>
        <SleepHypnogram summary={summary} />
      </HealthGroup>

      <HealthGroup title="Структура сна" padded>
        <div className="flex flex-col gap-4">
          {(['deep', 'rem', 'light', 'awake'] as const).map(stage => {
            const minutes = stageMinutes(summary, stage);
            const pct = asleepMin > 0 ? (minutes / asleepMin) * 100 : 0;
            const tier = stage === 'deep'
              ? qualityDeepSleepPct(pct)
              : stage === 'rem'
                ? qualityRemSleepPct(pct)
                : null;
            return (
              <div key={stage}>
                <StageProgressBar
                  label={SLEEP_STAGE_META[stage].label}
                  minutes={minutes}
                  total={stage === 'awake' ? stageTotal : Math.max(asleepMin, 1)}
                  color={SLEEP_STAGE_META[stage].color}
                  tier={tier}
                />
              </div>
            );
          })}
        </div>
      </HealthGroup>

      {naps.length > 0 && (
        <HealthGroup title="Дневной отдых">
          {naps.map((nap, index) => (
            <div key={`${nap.start}-${index}`} className="flex justify-between py-3.5 border-b border-[rgba(242,239,232,0.08)] last:border-0">
              <span className="text-[13px] text-[#F2EFE8]/70">
                {formatClockTime(nap.start)} – {formatClockTime(nap.end)}
              </span>
              <span className="text-[15px] text-[#F2EFE8]/88 tabular-nums">{nap.minutes} мин</span>
            </div>
          ))}
        </HealthGroup>
      )}

      <HealthGroup title="Показатели ночи">
        {score !== null && (
          <MetricInsightRow
            label="Оценка ночи"
            value={String(score)}
            tier={scoreTier}
            gaugeValue={score}
            gaugeMax={100}
            gaugeColor="#8D4FFF"
          />
        )}
        <MetricInsightRow
          label="Длительность сна"
          value={asleepHours !== null ? formatDurationHours(asleepHours) : '—'}
          tier={durationRatio !== null ? qualitySleepDurationRatio(durationRatio) : null}
          gaugeValue={asleepMin}
          gaugeMax={SLEEP_GOAL_MINUTES}
          gaugeColor="#8D4FFF"
        />
        <MetricInsightRow
          label="Время в постели"
          value={formatDurationMinutes(bedMin)}
          tier={bedMin > 0 ? qualityTimeInBed(bedMin, SLEEP_GOAL_MINUTES) : null}
          gaugeValue={bedMin}
          gaugeMax={SLEEP_GOAL_MINUTES * 1.25}
          gaugeColor="#B0C9FF"
        />
        <MetricInsightRow
          label="Эффективность сна"
          value={efficiency !== null ? `${efficiency}%` : '—'}
          hint="Доля времени сна от времени в постели"
          tier={efficiency01 !== null ? qualitySleepEfficiency(efficiency01) : null}
          gaugeValue={efficiency ?? 0}
          gaugeMax={100}
          gaugeColor="#6ee7b7"
        />
        <MetricInsightRow
          label="Засыпание"
          value={latency !== null ? `${latency} мин` : '—'}
          hint="Время до первого эпизода сна"
          tier={latency !== null ? qualitySleepLatency(latency) : null}
          gaugeValue={latency ?? 0}
          gaugeMax={45}
          gaugeColor="#E6B85C"
        />
        <MetricInsightRow
          label="Средний пульс"
          value={avgHr !== null ? `${Math.round(avgHr)} уд/м` : '—'}
          tier={avgHr !== null ? qualitySleepAvgHr(avgHr) : null}
          gaugeValue={avgHr ?? 0}
          gaugeMax={avgHr != null ? avgHr + 50 : 120}
          gaugeColor="#fca5a5"
        />
        <MetricInsightRow
          label="Средняя ВСР"
          value={avgHrv !== null ? `${Math.round(avgHrv)} мс` : '—'}
          tier={avgHrv !== null ? qualityHrv(avgHrv) : null}
          gaugeValue={avgHrv ?? 0}
          gaugeMax={128}
          gaugeColor="#6ee7b7"
        />
        <MetricInsightRow
          label="Средний SpO₂"
          value={avgSpo2 !== null ? `${Math.round(avgSpo2)}%` : '—'}
          tier={avgSpo2 !== null ? qualitySpo2(avgSpo2) : null}
          gaugeValue={avgSpo2 ?? 0}
          gaugeMax={100}
          gaugeColor="#2dd4bf"
        />
        <div className="flex justify-between py-3.5 text-[11px] text-[#F2EFE8]/30">
          <span>Засыпание {formatClockTime(summary?.sleepStart)}</span>
          <span>Пробуждение {formatClockTime(summary?.sleepEnd)}</span>
        </div>
      </HealthGroup>

      <OvernightAreaChart
        title="Пульс"
        unit=" уд/м"
        color="#fca5a5"
        fillColor="#fca5a5"
        points={overnightHr}
        avg={avgHr}
        min={minHr}
        max={maxHr}
        tier={avgHr !== null ? qualitySleepAvgHr(avgHr) : null}
      />
      <OvernightAreaChart
        title="ВСР"
        unit=" мс"
        color="#6ee7b7"
        fillColor="#6ee7b7"
        points={overnightHrv}
        avg={avgHrv}
        min={minHrv}
        max={maxHrv}
        tier={avgHrv !== null ? qualityHrv(avgHrv) : null}
      />
      <OvernightAreaChart
        title="SpO₂"
        unit="%"
        color="#2dd4bf"
        fillColor="#2dd4bf"
        points={overnightSpo2}
        avg={avgSpo2}
        min={minSpo2}
        max={maxSpo2}
        tier={avgSpo2 !== null ? qualitySpo2(avgSpo2) : null}
        formatValue={(v) => `${Math.round(v)}%`}
      />

      {scoreTier != null && (
        <p className="text-[15px] text-[#F2EFE8]/50 leading-relaxed px-1 text-center">
          {getQualityMeta(scoreTier).label} ночь — оценка {score}.
        </p>
      )}

      {loading && hasRing && (
        <p className="text-[13px] text-[#F2EFE8]/35 text-center">Синхронизация данных кольца…</p>
      )}
    </HealthScreenShell>
  );
}
