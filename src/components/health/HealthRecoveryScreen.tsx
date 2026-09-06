import React, { useMemo } from 'react';
import HealthScreenShell from './HealthScreenShell';
import HealthHero from './HealthHero';
import HealthGroup from './HealthGroup';
import HealthPeriodChart from './HealthPeriodChart';
import OvernightAreaChart from './OvernightAreaChart';
import MetricInsightRow from './MetricInsightRow';
import QualityBadge from './QualityBadge';
import { qualityHrv, qualityRestingHr } from './healthQuality';
import { useHealthCategoryData, useRingSeries } from './useHealthCategoryData';
import { chartDayLabel, finiteOrNull } from './format';
import type { HealthPeriod } from './types';
import type { DailyHealthPoint, HealthMetrics } from '../../services/health/types';

interface HealthRecoveryScreenProps {
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  hasRing: boolean;
  healthMetrics: HealthMetrics;
  historyHrv: DailyHealthPoint[];
  historyHr: DailyHealthPoint[];
  accentColor: string;
}

function toChart(points: DailyHealthPoint[], count: number) {
  return points
    .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
    .slice(-count)
    .map(point => ({ label: chartDayLabel(point.date), value: finiteOrNull(point.value) }));
}

export default function HealthRecoveryScreen({
  period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  hasRing,
  healthMetrics,
  historyHrv,
  historyHr,
}: HealthRecoveryScreenProps) {
  const { selectedSummary, ringSummaries } = useHealthCategoryData({
    hasRing,
    selectedDate,
    period,
    historyByMetric: { hrv: historyHrv, restingHR: historyHr } as any,
  });

  const hrvSeries = useRingSeries('hrv', hasRing && period === 'day', 1);
  const hrSeries = useRingSeries('heartRate', hasRing && period === 'day', 1);

  const hrvValue = selectedSummary?.hrv ?? healthMetrics.hrv;
  const hrValue = selectedSummary?.restingHR ?? healthMetrics.restingHR;
  const hrvTier = hrvValue !== null ? qualityHrv(hrvValue) : null;
  const hrTier = hrValue !== null ? qualityRestingHr(hrValue) : null;

  const chartCount = period === 'week' ? 7 : 30;
  const hrvChart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.hrv),
      }));
    }
    return toChart(historyHrv, chartCount);
  }, [hasRing, ringSummaries, historyHrv, chartCount]);

  const hrChart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.restingHR),
      }));
    }
    return toChart(historyHr, chartCount);
  }, [hasRing, ringSummaries, historyHr, chartCount]);

  if (period !== 'day') {
    const hrvValues = hrvChart.map(p => p.value).filter((v): v is number => v !== null);
    const avgHrv = hrvValues.length ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length : null;
    const avgHrvTier = avgHrv !== null ? qualityHrv(avgHrv) : null;

    return (
      <HealthScreenShell
        period={period}
        onPeriodChange={onPeriodChange}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
      >
        <HealthHero
          value={avgHrv !== null ? Math.round(avgHrv) : '—'}
          meaning="Средняя вариабельность, мс"
        >
          {avgHrvTier != null && <QualityBadge tier={avgHrvTier} />}
        </HealthHero>
        <HealthGroup title="ВСР" padded>
          <HealthPeriodChart bare points={hrvChart} color="#6ee7b7" unit=" мс" baseline={48} />
        </HealthGroup>
        <HealthGroup title="Пульс покоя" padded>
          <HealthPeriodChart bare points={hrChart} color="#fca5a5" unit=" уд/м" baseline={65} />
        </HealthGroup>
      </HealthScreenShell>
    );
  }

  const hrvMin = hrvSeries.length ? Math.min(...hrvSeries.map(p => p.value)) : null;
  const hrvMax = hrvSeries.length ? Math.max(...hrvSeries.map(p => p.value)) : null;
  const hrMin = selectedSummary?.heartRateMin ?? (hrSeries.length ? Math.min(...hrSeries.map(p => p.value)) : null);
  const hrMax = selectedSummary?.heartRateMax ?? (hrSeries.length ? Math.max(...hrSeries.map(p => p.value)) : null);

  return (
    <HealthScreenShell
      period={period}
      onPeriodChange={onPeriodChange}
      selectedDate={selectedDate}
      onSelectedDateChange={onSelectedDateChange}
    >
      <HealthHero
        value={hrvValue !== null ? Math.round(hrvValue) : '—'}
        meaning="Вариабельность сердечного ритма, мс"
      >
        {hrvTier != null && <QualityBadge tier={hrvTier} />}
      </HealthHero>

      <HealthGroup title="Показатели">
        <MetricInsightRow
          label="ВСР"
          value={hrvValue !== null ? `${Math.round(hrvValue)} мс` : '—'}
          hint="Чем выше, тем лучше восстановление"
          tier={hrvTier}
          gaugeValue={hrvValue ?? 0}
          gaugeMax={128}
          gaugeColor="#6ee7b7"
        />
        <MetricInsightRow
          label="Диапазон ВСР за сутки"
          value={hrvMin !== null && hrvMax !== null ? `${Math.round(hrvMin)}–${Math.round(hrvMax)} мс` : '—'}
        />
        <MetricInsightRow
          label="Пульс покоя"
          value={hrValue !== null ? `${Math.round(hrValue)} уд/м` : '—'}
          tier={hrTier}
          gaugeValue={hrValue ?? 0}
          gaugeMax={100}
          gaugeColor="#fca5a5"
        />
        <MetricInsightRow
          label="Диапазон пульса"
          value={hrMin !== null && hrMax !== null ? `${Math.round(hrMin)}–${Math.round(hrMax)} уд/м` : '—'}
        />
      </HealthGroup>

      {hrvSeries.length >= 2 && (
        <OvernightAreaChart
          title="ВСР за сутки"
          unit=" мс"
          color="#6ee7b7"
          fillColor="#6ee7b7"
          points={hrvSeries}
          avg={hrvValue}
          min={hrvMin}
          max={hrvMax}
          tier={hrvTier}
        />
      )}

      {hrSeries.length >= 2 && (
        <OvernightAreaChart
          title="Пульс за сутки"
          unit=" уд/м"
          color="#fca5a5"
          fillColor="#fca5a5"
          points={hrSeries}
          avg={hrValue}
          min={hrMin}
          max={hrMax}
          tier={hrTier}
        />
      )}

      {hrvChart.length >= 2 && (
        <HealthGroup title="Тренд ВСР · 7 дней" padded>
          <HealthPeriodChart bare points={hrvChart.slice(-7)} color="#6ee7b7" unit=" мс" baseline={48} />
        </HealthGroup>
      )}
    </HealthScreenShell>
  );
}
