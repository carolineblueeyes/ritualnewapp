import { useEffect, useMemo, useState } from 'react';
import { bleRingService } from '../../services/health/ring';
import type { HealthHistoryByMetric } from '../../services/health/types';
import type { RingDailySummary, RingPoint } from '../../services/health/x6RingPlugin';
import { shiftDate, todayIso } from './format';
import type { HealthPeriod } from './types';
import { withMergedNightSleep } from './sleepUtils';

function emptySummary(date: string): RingDailySummary {
  return {
    date,
    hrv: null,
    sleepHours: null,
    steps: null,
    restingHR: null,
    spo2: null,
    temperature: null,
    distance: null,
    calories: null,
    activeMinutes: null,
    heartRateMin: null,
    heartRateMax: null,
    spo2Min: null,
    spo2Max: null,
    temperatureMin: null,
    temperatureMax: null,
    sleepStart: null,
    sleepEnd: null,
    sleepStages: [],
    sleepIntervals: [],
    workouts: [],
    batteryLevel: 0,
    lastSync: null,
  };
}

export function useHealthCategoryData(options: {
  hasRing: boolean;
  selectedDate: string;
  period: HealthPeriod;
  historyByMetric: HealthHistoryByMetric;
}) {
  const { hasRing, selectedDate, period, historyByMetric } = options;
  const [ringSummaries, setRingSummaries] = useState<RingDailySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const dayCount = period === 'day' ? 1 : period === 'week' ? 7 : 30;

  useEffect(() => {
    if (!hasRing) {
      setRingSummaries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const dates: string[] = [];
      for (let i = dayCount - 1; i >= 0; i -= 1) {
        dates.push(shiftDate(selectedDate, -i));
      }

      const summaries = await Promise.all(
        dates.map(async (date) => {
          try {
            const summary = (await bleRingService.getDailySummary(date)) ?? emptySummary(date);
            return withMergedNightSleep(summary) ?? summary;
          } catch {
            return emptySummary(date);
          }
        }),
      );

      if (!cancelled) {
        setRingSummaries(summaries);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasRing, selectedDate, dayCount]);

  const selectedSummary = useMemo(
    () => ringSummaries.find(item => item.date === selectedDate) ?? ringSummaries[ringSummaries.length - 1] ?? null,
    [ringSummaries, selectedDate],
  );

  const historySleep = historyByMetric.sleepHours ?? [];
  const historyHrv = historyByMetric.hrv ?? [];
  const historyHr = historyByMetric.restingHR ?? [];
  const historySteps = historyByMetric.steps ?? [];
  const historySpo2 = historyByMetric.spo2 ?? [];
  const historyTemp = historyByMetric.temperature ?? [];
  const historyResp = historyByMetric.respiratoryRate ?? [];

  return {
    loading,
    ringSummaries,
    selectedSummary,
    historySleep,
    historyHrv,
    historyHr,
    historySteps,
    historySpo2,
    historyTemp,
    historyResp,
  };
}

export function useRingSeries(type: 'heartRate' | 'hrv' | 'spo2' | 'temperature', enabled: boolean, days = 1) {
  const [points, setPoints] = useState<RingPoint[]>([]);

  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      return;
    }

    let cancelled = false;
    bleRingService.getSeries(type, days, 'hour').then(result => {
      if (!cancelled) setPoints(result);
    }).catch(() => {
      if (!cancelled) setPoints([]);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, type, days]);

  return points;
}

export function filterPointsToWindow(points: RingPoint[], startIso: string | null | undefined, endIso: string | null | undefined): RingPoint[] {
  if (!startIso || !endIso || !points.length) return points;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return points;
  return points.filter(point => {
    const ts = new Date(point.timestamp).getTime();
    return ts >= start - 30 * 60_000 && ts <= end + 30 * 60_000;
  });
}

export function averagePointValue(points: RingPoint[]): number | null {
  if (!points.length) return null;
  return points.reduce((sum, p) => sum + p.value, 0) / points.length;
}

export function minPointValue(points: RingPoint[]): number | null {
  if (!points.length) return null;
  return Math.min(...points.map(p => p.value));
}

export function maxPointValue(points: RingPoint[]): number | null {
  if (!points.length) return null;
  return Math.max(...points.map(p => p.value));
}

export function defaultSelectedDate(): string {
  return todayIso();
}
