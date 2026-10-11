import type { HealthMetrics } from './types';
import type { RingDailySummary } from './x6RingPlugin';
import {
  sleepEfficiency,
  sleepLatencyMinutes,
  stageMinutes,
  timeInBedMinutes,
  totalSleepMinutes,
} from '../../components/health/sleepUtils';

/**
 * Проброс сна: из богатого RingDailySummary (стадии, интервалы, границы ночи)
 * в плоские HealthMetrics, которые умеет есть движок Сияния.
 */

export interface SleepEnrichment {
  sleepHours: number | null;
  deepSleepPercent: number | null;
  remSleepPercent: number | null;
  sleepInterruptions: number | null;
  sleepMidpointHours: number | null;
  sleepEfficiency: number | null;
  sleepLatencyMinutes: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  timeInBedHours: number | null;
  wasoMinutes: number | null;
}

/** Середина ночи в часах 0–24, якорь 3:00 (типичный midpoint здорового сна). */
export function midpointHours(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const mid = new Date((start + end) / 2);
  return mid.getHours() + mid.getMinutes() / 60 + mid.getSeconds() / 3600;
}

export function enrichSleepFromSummary(summary: RingDailySummary | null): SleepEnrichment {
  if (!summary) {
    return {
      sleepHours: null,
      deepSleepPercent: null,
      remSleepPercent: null,
      sleepInterruptions: null,
      sleepMidpointHours: null,
      sleepEfficiency: null,
      sleepLatencyMinutes: null,
      sleepStart: null,
      sleepEnd: null,
      timeInBedHours: null,
      wasoMinutes: null,
    };
  }
  const asleepMin = totalSleepMinutes(summary);
  const deep = stageMinutes(summary, 'deep');
  const rem = stageMinutes(summary, 'rem');
  const awake = stageMinutes(summary, 'awake');
  const bedMin = timeInBedMinutes(summary);
  // Пробуждения: явные awake-интервалы внутри ночи.
  const interruptions = (summary.sleepIntervals ?? []).filter(item => item.stage === 'awake').length;

  return {
    sleepHours: asleepMin > 0 ? Math.round((asleepMin / 60) * 10) / 10 : summary.sleepHours,
    deepSleepPercent: asleepMin > 0 ? Math.round(((deep / asleepMin) * 100) * 10) / 10 : null,
    remSleepPercent: asleepMin > 0 ? Math.round(((rem / asleepMin) * 100) * 10) / 10 : null,
    sleepInterruptions: interruptions > 0 ? interruptions : null,
    sleepMidpointHours: midpointHours(summary.sleepStart, summary.sleepEnd),
    sleepEfficiency: sleepEfficiency(summary),
    sleepLatencyMinutes: sleepLatencyMinutes(summary),
    sleepStart: summary.sleepStart,
    sleepEnd: summary.sleepEnd,
    timeInBedHours: bedMin > 0 ? Math.round((bedMin / 60) * 10) / 10 : null,
    wasoMinutes: awake > 0 ? awake : null,
  };
}

export function applySleepEnrichment(
  metrics: HealthMetrics,
  enrichment: SleepEnrichment,
): HealthMetrics {
  return {
    ...metrics,
    sleepHours: metrics.sleepHours ?? enrichment.sleepHours,
    deepSleepPercent: metrics.deepSleepPercent ?? enrichment.deepSleepPercent,
    remSleepPercent: metrics.remSleepPercent ?? enrichment.remSleepPercent,
    sleepInterruptions: metrics.sleepInterruptions ?? enrichment.sleepInterruptions,
    sleepMidpointHours: metrics.sleepMidpointHours ?? enrichment.sleepMidpointHours,
    sleepEfficiency: metrics.sleepEfficiency ?? enrichment.sleepEfficiency,
    sleepLatencyMinutes: metrics.sleepLatencyMinutes ?? enrichment.sleepLatencyMinutes,
    sleepStart: metrics.sleepStart ?? enrichment.sleepStart,
    sleepEnd: metrics.sleepEnd ?? enrichment.sleepEnd,
    timeInBedHours: metrics.timeInBedHours ?? enrichment.timeInBedHours,
    wasoMinutes: metrics.wasoMinutes ?? enrichment.wasoMinutes,
  };
}

export interface SleepNightLike {
  sleepHours: number | null;
  midpointHours: number | null;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Банк сна: суммарный недосып за 7 дней в часах.
 * needHours — личная норма (long-база), фолбэк 7.5.
 */
export function sleepDebt(nights: SleepNightLike[], needHours = 7.5): number {
  const recent = nights.filter(night => night.sleepHours != null).slice(-7);
  if (recent.length === 0) return 0;
  const debt = recent.reduce((sum, night) => sum + (needHours - (night.sleepHours as number)), 0);
  return Math.round(debt * 10) / 10;
}

export interface BedtimeWindow {
  from: string;
  to: string;
  midpointHours: number;
  needHours: number;
}

function formatBedtime(hours: number): string {
  const normalized = ((hours % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Окно отбоя: midpoint − need/2 ± 30 мин.
 * Пересчитывать раз в неделю — иначе тревожность от прыгающего окна.
 */
export function bedtimeWindow(needHours: number, avgMidpointHours: number | null): BedtimeWindow | null {
  if (avgMidpointHours == null || !Number.isFinite(avgMidpointHours)) return null;
  const bedtime = avgMidpointHours - needHours / 2;
  return {
    from: formatBedtime(bedtime - 0.5),
    to: formatBedtime(bedtime + 0.5),
    midpointHours: Math.round(avgMidpointHours * 10) / 10,
    needHours: Math.round(needHours * 10) / 10,
  };
}

/** Средний midpoint за N ночей — якорь для окна отбоя и регулярности. */
export function averageMidpoint(nights: SleepNightLike[], days = 7): number | null {
  const points = nights
    .filter(night => night.midpointHours != null && Number.isFinite(night.midpointHours as number))
    .slice(-days)
    .map(night => night.midpointHours as number);
  if (points.length < 4) return null;
  return mean(points);
}

/** Стандартное отклонение midpoint — мера регулярности в часах. */
export function midpointStd(nights: SleepNightLike[], days = 7): number | null {
  const points = nights
    .filter(night => night.midpointHours != null && Number.isFinite(night.midpointHours as number))
    .slice(-days)
    .map(night => night.midpointHours as number);
  if (points.length < 4) return null;
  const avg = mean(points);
  return Math.sqrt(points.reduce((sum, value) => sum + (value - avg) ** 2, 0) / points.length);
}
