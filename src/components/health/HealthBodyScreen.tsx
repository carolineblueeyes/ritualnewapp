import React, { useMemo } from 'react';
import HealthScreenShell from './HealthScreenShell';
import HealthHero from './HealthHero';
import HealthGroup from './HealthGroup';
import HealthPeriodChart from './HealthPeriodChart';
import OvernightAreaChart from './OvernightAreaChart';
import MetricInsightRow from './MetricInsightRow';
import QualityBadge from './QualityBadge';
import { qualitySpo2, qualityTemperature } from './healthQuality';
import { useHealthCategoryData, useRingSeries } from './useHealthCategoryData';
import { chartDayLabel, finiteOrNull } from './format';
import type { HealthPeriod } from './types';
import type { DailyHealthPoint, HealthMetrics } from '../../services/health/types';

interface HealthBodyScreenProps {
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  hasRing: boolean;
  healthMetrics: HealthMetrics;
  historySpo2: DailyHealthPoint[];
  historyTemp: DailyHealthPoint[];
  historyResp: DailyHealthPoint[];
  cycleSummary?: string | null;
  onOpenCycle?: () => void;
  periodsLocked?: boolean;
  onLockedPeriodClick?: () => void;
}

function toChart(points: DailyHealthPoint[], count: number) {
  return points
    .filter(p => p.status === 'available' && finiteOrNull(p.value) !== null)
    .slice(-count)
    .map(point => ({ label: chartDayLabel(point.date), value: finiteOrNull(point.value) }));
}

export default function HealthBodyScreen({
  period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  hasRing,
  healthMetrics,
  historySpo2,
  historyTemp,
  historyResp,
  cycleSummary,
  onOpenCycle,
  periodsLocked,
  onLockedPeriodClick,
}: HealthBodyScreenProps) {
  const { selectedSummary, ringSummaries } = useHealthCategoryData({
    hasRing,
    selectedDate,
    period,
    historyByMetric: { spo2: historySpo2, temperature: historyTemp, respiratoryRate: historyResp } as any,
  });

  const spo2 = finiteOrNull(selectedSummary?.spo2 ?? healthMetrics.spo2);
  const temp = finiteOrNull(selectedSummary?.temperature ?? healthMetrics.temperature);
  // Протокол 02.09: частоту дыхания убираем — кольцо не меряет вдохи напрямую
  // (оценка идёт из PPG/ВСР), у JCRing этого показателя нет. Не показываем,
  // чтобы не вводить в заблуждение.
  void historyResp;
  const spo2Tier = spo2 !== null ? qualitySpo2(spo2) : null;
  const tempTier = temp !== null ? qualityTemperature(temp) : null;

  const spo2Series = useRingSeries('spo2', hasRing && period === 'day', 1);
  const tempSeries = useRingSeries('temperature', hasRing && period === 'day', 1);

  const chartCount = period === 'week' ? 7 : 30;
  const spo2Chart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.spo2),
      }));
    }
    return toChart(historySpo2, chartCount);
  }, [hasRing, ringSummaries, historySpo2, chartCount]);

  const tempChart = useMemo(() => {
    if (hasRing && ringSummaries.length > 1) {
      return ringSummaries.map(item => ({
        label: chartDayLabel(item.date),
        value: finiteOrNull(item.temperature),
      }));
    }
    return toChart(historyTemp, chartCount);
  }, [hasRing, ringSummaries, historyTemp, chartCount]);

  if (period !== 'day') {
    const spo2Values = spo2Chart.map(p => p.value).filter((v): v is number => v !== null);
    const avgSpo2 = spo2Values.length ? spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length : null;
    const avgSpo2Tier = avgSpo2 !== null ? qualitySpo2(avgSpo2) : null;

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
          value={avgSpo2 !== null ? Math.round(avgSpo2) : '—'}
          meaning="Средний SpO₂, %"
        >
          {avgSpo2Tier != null && <QualityBadge tier={avgSpo2Tier} />}
        </HealthHero>
        <HealthGroup title="SpO₂" padded>
          <HealthPeriodChart bare points={spo2Chart} color="#2dd4bf" unit="%" baseline={97} />
        </HealthGroup>
        <HealthGroup title="Температура" padded>
          <HealthPeriodChart bare points={tempChart} color="#f87171" formatValue={(v) => `${v.toFixed(1)}°`} baseline={36.4} />
        </HealthGroup>
      </HealthScreenShell>
    );
  }

  const spo2Min = finiteOrNull(selectedSummary?.spo2Min ?? (spo2Series.length ? Math.min(...spo2Series.map(p => p.value)) : null));
  const spo2Max = finiteOrNull(selectedSummary?.spo2Max ?? (spo2Series.length ? Math.max(...spo2Series.map(p => p.value)) : null));
  const tempMin = finiteOrNull(selectedSummary?.temperatureMin ?? (tempSeries.length ? Math.min(...tempSeries.map(p => p.value)) : null));
  const tempMax = finiteOrNull(selectedSummary?.temperatureMax ?? (tempSeries.length ? Math.max(...tempSeries.map(p => p.value)) : null));

  return (
    <HealthScreenShell
      period={period}
      onPeriodChange={onPeriodChange}
      selectedDate={selectedDate}
      onSelectedDateChange={onSelectedDateChange}
    >
      <HealthHero
        value={spo2 !== null ? Math.round(spo2) : '—'}
        meaning="Насыщение крови кислородом, %"
      >
        {spo2Tier != null && <QualityBadge tier={spo2Tier} />}
      </HealthHero>

      <HealthGroup title="Показатели">
        <MetricInsightRow
          label="SpO₂"
          value={spo2 !== null ? `${Math.round(spo2)}%` : '—'}
          hint="Насыщение крови кислородом"
          tier={spo2Tier}
          gaugeValue={spo2 ?? 0}
          gaugeMax={100}
          gaugeColor="#2dd4bf"
        />
        <MetricInsightRow
          label="Диапазон SpO₂"
          value={spo2Min !== null && spo2Max !== null ? `${Math.round(spo2Min)}–${Math.round(spo2Max)}%` : '—'}
        />
        <MetricInsightRow
          label="Температура"
          value={temp !== null ? `${temp.toFixed(1)}°C` : '—'}
          hint="Температура кожи на пальце, а не тела. Значения 24–35° — норма датчика; смотрим на отклонение от личной базы, а не на абсолют"
          tier={tempTier}
          gaugeValue={temp ?? 0}
          gaugeMax={38}
          gaugeColor="#f87171"
        />
        <MetricInsightRow
          label="Диапазон температуры"
          value={tempMin !== null && tempMax !== null ? `${tempMin.toFixed(1)}–${tempMax.toFixed(1)}°C` : '—'}
        />
      </HealthGroup>

      {cycleSummary && (
        <HealthGroup title="Цикл">
          <button
            type="button"
            onClick={() => onOpenCycle?.()}
            className="flex items-center justify-between py-3.5 w-full text-left active:opacity-80 transition-opacity"
          >
            <span className="text-[15px] text-[#F2EFE8]/80">{cycleSummary}</span>
            <span className="text-[13px] text-[#F2EFE8]/40">Открыть →</span>
          </button>
        </HealthGroup>
      )}

      {spo2Series.length >= 2 && (
        <OvernightAreaChart
          title="SpO₂ за сутки"
          unit="%"
          color="#2dd4bf"
          fillColor="#2dd4bf"
          points={spo2Series}
          avg={spo2}
          min={spo2Min}
          max={spo2Max}
          tier={spo2Tier}
          formatValue={(v) => `${Math.round(v)}%`}
        />
      )}

      {tempSeries.length >= 2 && (
        <OvernightAreaChart
          title="Температура за сутки"
          unit="°C"
          color="#f87171"
          fillColor="#f87171"
          points={tempSeries}
          avg={temp}
          min={tempMin}
          max={tempMax}
          tier={tempTier}
          formatValue={(v) => `${v.toFixed(1)}°`}
        />
      )}

      {spo2Chart.length >= 2 && (
        <HealthGroup title="SpO₂ · 7 дней" padded>
          <HealthPeriodChart bare points={spo2Chart.slice(-7)} color="#2dd4bf" unit="%" baseline={97} />
        </HealthGroup>
      )}
    </HealthScreenShell>
  );
}
