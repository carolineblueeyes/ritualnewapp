import { HealthMetrics } from './types';

export interface ShineBreakdown {
  hrv: number;
  sleep: number;
  activity: number;
  restingHR: number;
  total: number;
  availableMetrics: number;
  maxPossible: number;
  dataQuality: 'full' | 'partial' | 'minimal' | 'none';
}

const WEIGHTS = {
  hrv: 30,
  sleep: 25,
  activity: 25,
  restingHR: 20,
} as const;

const BENCHMARKS = {
  hrv: { min: 20, optimal: 70, max: 120 },
  sleep: { min: 4, optimal: 8, max: 10 },
  activity: { min: 2000, optimal: 10000, max: 15000 },
  restingHR: { min: 40, optimal: 55, max: 100 },
} as const;

function scoreMetric(
  value: number,
  benchmark: { min: number; optimal: number; max: number }
): number {
  if (value <= benchmark.min) return 0;
  if (value >= benchmark.max) return 100;

  if (value <= benchmark.optimal) {
    const range = benchmark.optimal - benchmark.min;
    const progress = (value - benchmark.min) / range;
    return Math.round(progress * 85);
  }

  const range = benchmark.max - benchmark.optimal;
  const progress = (value - benchmark.optimal) / range;
  return Math.round(85 + progress * 15);
}

function scoreHRV(value: number): number {
  if (value <= 20) return 0;
  if (value >= 120) return 100;
  if (value <= 50) {
    return Math.round(((value - 20) / 30) * 70);
  }
  if (value <= 70) {
    return Math.round(70 + ((value - 50) / 20) * 20);
  }
  return Math.round(90 + ((value - 70) / 50) * 10);
}

function scoreRestingHR(value: number): number {
  if (value <= 40) return 100;
  if (value <= 55) return Math.round(90 + ((55 - value) / 15) * 10);
  if (value <= 70) return Math.round(60 + ((70 - value) / 15) * 30);
  if (value <= 90) return Math.round(20 + ((90 - value) / 20) * 40);
  return Math.round(Math.max(0, 20 - (value - 90)));
}

export function calculateShine(metrics: HealthMetrics, practicesCompleted: number = 0): ShineBreakdown {
  const scores: Partial<Record<keyof typeof WEIGHTS, number>> = {};
  let availableMetrics = 0;

  if (metrics.hrv !== null && metrics.hrv !== undefined) {
    scores.hrv = scoreHRV(metrics.hrv);
    availableMetrics++;
  }

  if (metrics.sleepHours !== null && metrics.sleepHours !== undefined) {
    scores.sleep = scoreMetric(metrics.sleepHours, BENCHMARKS.sleep);
    availableMetrics++;
  }

  if (metrics.steps !== null && metrics.steps !== undefined) {
    scores.activity = scoreMetric(metrics.steps, BENCHMARKS.activity);
    availableMetrics++;
  }

  if (metrics.restingHR !== null && metrics.restingHR !== undefined) {
    scores.restingHR = scoreRestingHR(metrics.restingHR);
    availableMetrics++;
  }

  const maxPossible = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

  if (availableMetrics === 0) {
    return {
      hrv: 0,
      sleep: 0,
      activity: 0,
      restingHR: 0,
      total: 0,
      availableMetrics: 0,
      maxPossible,
      dataQuality: 'none',
    };
  }

  const totalWeight = Object.entries(WEIGHTS)
    .filter(([key]) => scores[key as keyof typeof WEIGHTS] !== undefined)
    .reduce((sum, [key, weight]) => sum + weight, 0);

  let total = 0;
  if (totalWeight > 0) {
    total = Object.entries(WEIGHTS)
      .filter(([key]) => scores[key as keyof typeof WEIGHTS] !== undefined)
      .reduce((sum, [key, weight]) => {
        return sum + (scores[key as keyof typeof WEIGHTS]! * weight) / totalWeight;
      }, 0);
  }

  const practiceBonus = Math.min(15, practicesCompleted * 3);
  total = Math.min(100, Math.round(total + practiceBonus));

  let dataQuality: ShineBreakdown['dataQuality'] = 'minimal';
  if (availableMetrics >= 4) dataQuality = 'full';
  else if (availableMetrics >= 2) dataQuality = 'partial';

  return {
    hrv: scores.hrv ?? 0,
    sleep: scores.sleep ?? 0,
    activity: scores.activity ?? 0,
    restingHR: scores.restingHR ?? 0,
    total,
    availableMetrics,
    maxPossible,
    dataQuality,
  };
}

export function getShineLabel(score: number, dataQuality: string): string {
  if (dataQuality === 'none') return 'Нет данных';
  if (score >= 85) return 'Сияешь';
  if (score >= 70) return 'В балансе';
  if (score >= 50) return 'Напряжён';
  if (score >= 25) return 'Восстанавливаешься';
  return 'Начни с практики';
}

export function getShineColor(score: number, dataQuality: string): string {
  if (dataQuality === 'none') return '#ffffff40';
  if (score >= 85) return '#6ee7b7';
  if (score >= 70) return '#93c5fd';
  if (score >= 50) return '#fcd34d';
  if (score >= 25) return '#fdba74';
  return '#fca5a5';
}
