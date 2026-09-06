/** JCRing-aligned 3-tier quality labels (setLevelTextView / new_sleep_day_level*). */

export type QualityTier = 1 | 2 | 3;

export interface QualityMeta {
  tier: QualityTier;
  label: string;
  color: string;
  bg: string;
  border: string;
}

const TIER_META: Record<QualityTier, Omit<QualityMeta, 'tier'>> = {
  1: { label: 'Отлично', color: '#7BC67E', bg: 'rgba(123,198,126,0.14)', border: 'rgba(123,198,126,0.28)' },
  2: { label: 'Приемлемо', color: '#E6B85C', bg: 'rgba(230,184,92,0.14)', border: 'rgba(230,184,92,0.28)' },
  3: { label: 'Плохо', color: '#E8685A', bg: 'rgba(232,104,90,0.14)', border: 'rgba(232,104,90,0.28)' },
};

export function getQualityMeta(tier: QualityTier): QualityMeta {
  return { tier, ...TIER_META[tier] };
}

export function qualitySleepDurationRatio(ratio: number): QualityTier {
  if (ratio >= 0.85 && ratio <= 1.2) return 1;
  if (ratio > 0.7 && ratio < 0.85) return 2;
  return 3;
}

export function qualitySleepEfficiency(efficiency01: number): QualityTier {
  if (efficiency01 > 0.9) return 1;
  if (efficiency01 >= 0.8 && efficiency01 <= 0.9) return 2;
  return 3;
}

export function qualitySleepLatency(minutes: number): QualityTier {
  if (minutes >= 0 && minutes < 15) return 1;
  if (minutes >= 15 && minutes < 31) return 2;
  return 3;
}

export function qualityTimeInBed(minutes: number, goalMinutes = 480): QualityTier {
  const low = goalMinutes * 0.95;
  const high = goalMinutes * 1.25;
  if (minutes >= low && minutes <= high) return 1;
  if (minutes > goalMinutes * 0.75 && minutes < low) return 2;
  return 3;
}

export function qualitySpo2(percent: number): QualityTier {
  if (percent >= 95 && percent <= 100) return 1;
  if (percent >= 90 && percent < 95) return 2;
  return 3;
}

export function qualitySleepAvgHr(bpm: number, age = 30): QualityTier {
  const maxHr = 220 - age;
  const low = maxHr * 0.25;
  const high = maxHr * 0.35;
  if (bpm >= low && bpm <= high) return 1;
  if ((bpm >= maxHr * 0.2 && bpm < low) || (bpm > high && bpm <= maxHr * 0.4)) return 2;
  return 3;
}

export function qualityHrv(ms: number, age = 30): QualityTier {
  if (age < 19) {
    if (ms >= 80) return 1;
    if (ms >= 40) return 2;
    return 3;
  }
  if (age < 29) {
    if (ms >= 100) return 1;
    if (ms >= 60) return 2;
    return 3;
  }
  if (age < 39) {
    if (ms >= 80) return 1;
    if (ms >= 40) return 2;
    return 3;
  }
  if (age < 49) {
    if (ms >= 70) return 1;
    if (ms >= 30) return 2;
    return 3;
  }
  if (ms >= 60) return 1;
  if (ms >= 35) return 2;
  return 3;
}

export function qualitySteps(steps: number, goal = 8000): QualityTier {
  const ratio = steps / goal;
  if (ratio >= 1) return 1;
  if (ratio >= 0.7) return 2;
  return 3;
}

export function qualityRestingHr(bpm: number): QualityTier {
  if (bpm >= 50 && bpm <= 65) return 1;
  if (bpm >= 45 && bpm <= 75) return 2;
  return 3;
}

export function qualityTemperature(celsius: number): QualityTier {
  if (celsius >= 36.1 && celsius <= 37.0) return 1;
  if (celsius >= 35.8 && celsius <= 37.3) return 2;
  return 3;
}

export function qualityDeepSleepPct(pct: number): QualityTier {
  if (pct >= 15 && pct <= 25) return 1;
  if (pct >= 10 && pct < 15) return 2;
  return 3;
}

export function qualityRemSleepPct(pct: number): QualityTier {
  if (pct >= 18 && pct <= 28) return 1;
  if (pct >= 12 && pct < 18) return 2;
  return 3;
}

export function qualitySleepScore(score: number): QualityTier {
  if (score >= 80) return 1;
  if (score >= 60) return 2;
  return 3;
}

/**
 * Индекс спокойствия (протокол 02.09): позитивная инверсия стресса.
 * Чем выше — тем спокойнее (восстановление лучше). 0–100.
 * Калибровка по ВСР: 55+ мс — спокойствие высокое, <30 — низкое.
 */
export function calmIndexFromHrv(hrvMs: number | null | undefined): number | null {
  if (hrvMs === null || hrvMs === undefined || !Number.isFinite(hrvMs)) return null;
  if (hrvMs >= 80) return 95;
  if (hrvMs >= 55) return Math.round(75 + ((hrvMs - 55) / 25) * 20);
  if (hrvMs >= 35) return Math.round(50 + ((hrvMs - 35) / 20) * 25);
  if (hrvMs >= 20) return Math.round(25 + ((hrvMs - 20) / 15) * 25);
  return Math.max(5, Math.round((hrvMs / 20) * 25));
}

export function qualityCalmIndex(score: number): QualityTier {
  if (score >= 70) return 1;
  if (score >= 45) return 2;
  return 3;
}

export function calmIndexLabel(score: number | null): string {
  if (score === null) return 'Нет данных';
  if (score >= 70) return 'Спокойствие';
  if (score >= 45) return 'Умеренное напряжение';
  return 'Нарушено спокойствие';
}

/** Общая оценка сердца 0–100 (аналог оценки сна): ВСР + пульс покоя. */
export function computeHeartScore(
  hrvMs: number | null | undefined,
  restingHr: number | null | undefined,
): number | null {
  if (
    (hrvMs === null || hrvMs === undefined) &&
    (restingHr === null || restingHr === undefined)
  ) {
    return null;
  }
  let score = 55;
  if (hrvMs !== null && hrvMs !== undefined) {
    if (hrvMs >= 55) score += 20;
    else if (hrvMs >= 35) score += 10;
    else if (hrvMs >= 20) score += 0;
    else score -= 12;
  }
  if (restingHr !== null && restingHr !== undefined) {
    if (restingHr >= 50 && restingHr <= 65) score += 15;
    else if (restingHr >= 45 && restingHr <= 75) score += 5;
    else if (restingHr > 85 || restingHr < 42) score -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
