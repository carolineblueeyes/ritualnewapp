import type { DailyHealthPoint } from './types';
import type { BaselineTuning } from './shineConfig';

/**
 * EPIC 1 — двухгоризонтная персональная база (Baseline).
 *
 * short: последние 14 дней, экспоненциальное взвешивание по давности (свежее важнее).
 * long: последние 60 дней, робастная фильтрация выбросов через MAD.
 * Становление норм: <7 точек — популяционная норма; 7–13 дней — бленд 50/50;
 * 14–29 — short; 30–89 — бленд short/long; 90+ — long.
 */

export type BaselineSource = 'population' | 'blending-short' | 'short' | 'long';

export interface BaselineResult {
  mean: number;
  sigma: number;
  source: BaselineSource;
  /** true, если итог — смесь двух горизонтов (становление норм). */
  blended: boolean;
  daysOfData: number;
}

export interface AgedValue {
  value: number;
  ageDays: number;
}

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function std(values: number[]): number | null {
  if (values.length < 3) return null;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Робастная сигма через MAD (median absolute deviation), масштабированная под нормальное распределение. */
export function madSigma(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  return 1.4826 * median(values.map(value => Math.abs(value - med)));
}

/** Выкидывает выбросы дальше threshold * robust_sigma от медианы. */
export function filterOutliersMAD(values: number[], threshold = 3): number[] {
  if (values.length < 4) return [...values];
  const med = median(values);
  let robust = madSigma(values);
  if (robust <= 0) {
    // Постоянный ряд (MAD = 0): фолбэк на классическую сигму, иначе один
    // выброс вроде 120 среди десяток 50 никогда не отфильтруется.
    const fallback = std(values);
    if (!fallback || fallback <= 0) return [...values];
    robust = fallback;
  }
  return values.filter(value => Math.abs(value - med) <= threshold * robust);
}

/** Превращает DailyHealthPoint[] в значения с возрастом в днях (UTC, календарные сутки). */
export function valuesWithAge(
  points: DailyHealthPoint[] | undefined,
  today: Date = new Date(),
): AgedValue[] {
  if (!points) return [];
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const out: AgedValue[] = [];
  for (const point of points) {
    if (point.status !== 'available' || point.value == null || !Number.isFinite(point.value)) continue;
    const dayMs = Date.parse(`${point.date}T00:00:00Z`);
    if (!Number.isFinite(dayMs)) continue;
    out.push({ value: point.value, ageDays: Math.max(0, Math.round((todayMs - dayMs) / 86_400_000)) });
  }
  return out.sort((a, b) => a.ageDays - b.ageDays);
}

function expWeightedMean(short: AgedValue[], decayDays: number): number | null {
  if (short.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const point of short) {
    const weight = Math.exp(-point.ageDays / decayDays);
    num += point.value * weight;
    den += weight;
  }
  return den > 0 ? num / den : null;
}

function floorSigma(sigmaMean: number, sigma: number): number {
  return Math.max(sigma, Math.abs(sigmaMean) * 0.05, 0.1);
}

export function dualBaseline(
  aged: AgedValue[],
  population: { mean: number; sigma: number },
  tuning: BaselineTuning,
): BaselineResult {
  const inWindow = aged.filter(point => point.ageDays < tuning.longDays);
  const clean = filterOutliersMAD(
    inWindow.map(point => point.value),
    tuning.madThreshold,
  );
  const daysOfData = clean.length;

  if (daysOfData < tuning.minPoints) {
    return {
      mean: population.mean,
      sigma: population.sigma,
      source: 'population',
      blended: false,
      daysOfData,
    };
  }

  // Короткое окно; при редких синках (кольцо молчало) берём свежие точки вместо пустого окна.
  let short = inWindow.filter(point => point.ageDays < tuning.shortDays);
  if (short.length === 0) short = inWindow.slice(0, tuning.shortDays);
  const shortClean = filterOutliersMAD(
    short.map(point => point.value),
    tuning.madThreshold,
  );
  const shortMean = expWeightedMean(short, tuning.shortDecayDays) ?? mean(shortClean);
  const shortSigma = std(shortClean) ?? population.sigma;

  // Становление: 7–13 дней — смесь популяционной и short.
  if (daysOfData < tuning.shortDays) {
    const weight = tuning.onsetBlendWeight;
    const blendedMean = population.mean * (1 - weight) + shortMean * weight;
    return {
      mean: blendedMean,
      sigma: floorSigma(blendedMean, Math.max(shortSigma, population.sigma)),
      source: 'blending-short',
      blended: true,
      daysOfData,
    };
  }

  const longClean = clean;
  if (daysOfData < 30 || longClean.length < tuning.minPoints) {
    return {
      mean: shortMean,
      sigma: floorSigma(shortMean, shortSigma),
      source: 'short',
      blended: false,
      daysOfData,
    };
  }

  const longMean = mean(longClean);
  const longSigma = std(longClean) ?? shortSigma;

  // Зрелая база: 90+ дней — чистый long.
  if (daysOfData >= 90) {
    return {
      mean: longMean,
      sigma: floorSigma(longMean, longSigma),
      source: 'long',
      blended: false,
      daysOfData,
    };
  }

  // Переход 30–89 дней — смесь short/long.
  const weight = tuning.longBlendWeight;
  const blendedMean = shortMean * (1 - weight) + longMean * weight;
  return {
    mean: blendedMean,
    sigma: floorSigma(blendedMean, Math.max(shortSigma, longSigma)),
    source: 'long',
    blended: true,
    daysOfData,
  };
}
