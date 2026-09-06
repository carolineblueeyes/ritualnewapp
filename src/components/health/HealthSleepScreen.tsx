import React, { useMemo } from 'react';
import type { ShineBreakdown } from '../../services/health/shine';
import HealthScreenShell from './HealthScreenShell';
import HealthHero from './HealthHero';
import HealthGroup from './HealthGroup';
import SleepHypnogram from './SleepHypnogram';
import HealthPeriodChart, { StageProgressBar } from './HealthPeriodChart';
import OvernightAreaChart from './OvernightAreaChart';
import MetricInsightRow from './MetricInsightRow';
import QualityBadge from './QualityBadge';
import { formatDurationHours, formatDurationMinutes, formatClockTime, chartDayLabel, finiteOrNull } from './format';
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
}

const SLEEP_GOAL_MINUTES = 480;

function historyToChart(points: DailyHealthPoint[], period: HealthPeriod) {
  const slice = period === 'week' ? 7 : period === 'month' ? 30 : 1;
  return points
    .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
    .slice(-slice)
    .map(point => ({ label: chartDayLabel(point.date), value: finiteOrNull(point.value) }));
}

export default function HealthSleepScreen({
  period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  hasRing,
  healthMetrics,
  historySleep,
  periodsLocked,
  onLockedPeriodClick,
}: HealthSleepScreenProps) {
  const { loading, selectedSummary, ringSummaries } = useHealthCategoryData({
    hasRing,
    selectedDate,
    period,
    historyByMetric: { sleepHours: historySleep } as HealthHistoryByMetric,
  });

  const hrSeries = useRingSeries('heartRate', hasRing && period === 'day', 2);
  const hrvSeries = useRingSeries('hrv', hasRing && period === 'day', 2);
  const spo2Series = useRingSeries('spo2', hasRing && period === 'day', 2);

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

  const weekMonthChart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.sleepHours),
      }));
    }
    return historyToChart(historySleep, period);
  }, [hasRing, ringSummaries, historySleep, period]);

  if (period !== 'day') {
    const values = weekMonthChart.map(p => p.value).filter((v): v is number => v !== null);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const avgTier = avg !== null ? qualitySleepDurationRatio(avg / (SLEEP_GOAL_MINUTES / 60)) : null;

    return (
      <HealthScreenShell
        period={period}
        onPeriodChange={onPeriodChange}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
        periodsLocked={periodsLocked}
        onLockedPeriodClick={onLockedPeriodClick}
      >
        <HealthHero
          value={avg !== null ? formatDurationHours(avg) : '—'}
          meaning={period === 'week' ? 'Средняя длительность за неделю' : 'Средняя длительность за месяц'}
        >
          {avgTier != null && <QualityBadge tier={avgTier} />}
        </HealthHero>
        <HealthGroup padded>
          <HealthPeriodChart
            bare
            points={weekMonthChart}
            color="#8D4FFF"
            formatValue={(v) => formatDurationHours(v).replace(' ', '')}
            baseline={7.1}
          />
        </HealthGroup>
      </HealthScreenShell>
    );
  }

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

  return (
    <HealthScreenShell
      period={period}
      onPeriodChange={onPeriodChange}
      selectedDate={selectedDate}
      onSelectedDateChange={onSelectedDateChange}
      periodsLocked={periodsLocked}
      onLockedPeriodClick={onLockedPeriodClick}
    >
      <HealthHero
        value={asleepHours !== null ? formatDurationHours(asleepHours) : '—'}
        meaning={score !== null ? scoreText : 'Общий сон'}
        eyebrow="Качество сна"
        delta={sleepDelta?.text ?? null}
        deltaColor={sleepDelta?.color}
      >
        {scoreTier != null && <QualityBadge tier={scoreTier} />}
      </HealthHero>

      <p className="text-[15px] text-[#F2EFE8]/55 leading-relaxed px-1">
        {sleepDescription(summary, score)}
      </p>

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
