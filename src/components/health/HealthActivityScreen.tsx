import React, { useMemo } from 'react';
import HealthScreenShell from './HealthScreenShell';
import HealthHero from './HealthHero';
import HealthGroup from './HealthGroup';
import HealthPeriodChart from './HealthPeriodChart';
import MetricInsightRow from './MetricInsightRow';
import MetricGaugeBar from './MetricGaugeBar';
import QualityBadge from './QualityBadge';
import { qualitySteps } from './healthQuality';
import { useHealthCategoryData } from './useHealthCategoryData';
import { chartDayLabel, finiteOrNull } from './format';
import type { HealthPeriod } from './types';
import type { DailyHealthPoint, HealthMetrics } from '../../services/health/types';

const STEPS_GOAL = 8000;

interface HealthActivityScreenProps {
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  hasRing: boolean;
  healthMetrics: HealthMetrics;
  historySteps: DailyHealthPoint[];
  accentColor: string;
  periodsLocked?: boolean;
  onLockedPeriodClick?: () => void;
}

function toChart(points: DailyHealthPoint[], count: number) {
  return points
    .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
    .slice(-count)
    .map(point => ({ label: chartDayLabel(point.date), value: finiteOrNull(point.value) }));
}

export default function HealthActivityScreen({
  period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  hasRing,
  healthMetrics,
  historySteps,
  periodsLocked,
  onLockedPeriodClick,
}: HealthActivityScreenProps) {
  const { selectedSummary, ringSummaries } = useHealthCategoryData({
    hasRing,
    selectedDate,
    period,
    historyByMetric: { steps: historySteps } as any,
  });

  const steps = selectedSummary?.steps ?? healthMetrics.steps;
  const calories = selectedSummary?.calories ?? healthMetrics.calories;
  const distance = selectedSummary?.distance ?? healthMetrics.distance;
  const activeMinutes = selectedSummary?.activeMinutes ?? healthMetrics.activeMinutes;
  const workouts = selectedSummary?.workouts ?? [];
  const stepsTier = steps !== null ? qualitySteps(steps, STEPS_GOAL) : null;

  const stepsDelta = useMemo(() => {
    const pts = historySteps
      .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
      .slice(-2);
    if (pts.length < 2) return null;
    const diff = Math.round((pts[1].value as number) - (pts[0].value as number));
    if (diff === 0) return null;
    const text = `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('ru-RU')}`;
    return { text, color: diff > 0 ? '#7BC67E' : '#E8685A' };
  }, [historySteps]);

  const chartCount = period === 'week' ? 7 : 30;
  const stepsChart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.steps),
      }));
    }
    return toChart(historySteps, chartCount);
  }, [hasRing, ringSummaries, historySteps, chartCount]);

  if (period !== 'day') {
    const values = stepsChart.map(p => p.value).filter((v): v is number => v !== null);
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    const avgTier = avg !== null ? qualitySteps(avg, STEPS_GOAL) : null;

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
          value={avg !== null ? avg.toLocaleString('ru-RU') : '—'}
          meaning="Средние шаги"
        >
          {avgTier != null && <QualityBadge tier={avgTier} />}
        </HealthHero>
        <HealthGroup padded>
          <HealthPeriodChart
            bare
            points={stepsChart}
            color="#fcd34d"
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`}
            baseline={STEPS_GOAL}
          />
        </HealthGroup>
      </HealthScreenShell>
    );
  }

  return (
    <HealthScreenShell
      period={period}
      onPeriodChange={onPeriodChange}
      selectedDate={selectedDate}
      onSelectedDateChange={onSelectedDateChange}
    >
      <HealthHero
        value={steps !== null ? steps.toLocaleString('ru-RU') : '—'}
        meaning="шагов"
        eyebrow="Активность"
        delta={stepsDelta?.text ?? null}
        deltaColor={stepsDelta?.color}
      >
        {stepsTier != null && <QualityBadge tier={stepsTier} />}
        {steps !== null && (
          <div className="w-full max-w-[280px] mt-2 flex flex-col gap-1.5">
            <MetricGaugeBar value={steps} max={STEPS_GOAL} color="#fcd34d" />
            <span className="text-[13px] text-[#F2EFE8]/35">
              {Math.min(100, Math.round((steps / STEPS_GOAL) * 100))}% от цели {STEPS_GOAL.toLocaleString('ru-RU')}
            </span>
          </div>
        )}
      </HealthHero>

      <HealthGroup title="Показатели">
        <MetricInsightRow
          label="Дистанция"
          value={distance !== null ? `${(distance / 1000).toFixed(2)} км` : '—'}
          gaugeValue={distance ?? 0}
          gaugeMax={10000}
          gaugeColor="#B0C9FF"
        />
        <MetricInsightRow
          label="Калории"
          value={calories !== null ? `${Math.round(calories)} ккал` : '—'}
          gaugeValue={calories ?? 0}
          gaugeMax={600}
          gaugeColor="#f87171"
        />
        <MetricInsightRow
          label="Активные минуты"
          value={activeMinutes !== null ? `${Math.round(activeMinutes)} мин` : '—'}
          gaugeValue={activeMinutes ?? 0}
          gaugeMax={60}
          gaugeColor="#6ee7b7"
        />
      </HealthGroup>

      {workouts.length > 0 && (
        <HealthGroup title="Тренировки">
          {workouts.map((workout, index) => (
            <div key={`${workout.start}-${index}`} className="flex justify-between py-3.5 border-b border-[rgba(242,239,232,0.08)] last:border-0">
              <div>
                <span className="text-[15px] text-[#F2EFE8]/88 block">{workout.type || 'Тренировка'}</span>
                <span className="text-[13px] text-[#F2EFE8]/40">
                  {new Date(workout.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{workout.durationMinutes} мин
                </span>
              </div>
              <span className="text-[15px] text-[#F2EFE8]/70 tabular-nums">
                {workout.calories !== null ? `${Math.round(workout.calories)} ккал` : workout.heartRate !== null ? `${workout.heartRate} уд/м` : '—'}
              </span>
            </div>
          ))}
        </HealthGroup>
      )}

      {stepsChart.length >= 2 && (
        <HealthGroup title="Тренд · 7 дней" padded>
          <HealthPeriodChart
            bare
            points={stepsChart.slice(-7)}
            color="#fcd34d"
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`}
            baseline={STEPS_GOAL}
          />
        </HealthGroup>
      )}
    </HealthScreenShell>
  );
}
