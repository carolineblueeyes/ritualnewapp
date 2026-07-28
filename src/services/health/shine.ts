import type {
  CyclePhase,
  HealthHistoryByMetric,
  HealthMetricKey,
  HealthMetrics,
  HealthProfileContext,
} from './types';

export type ShineDriver = 'sleep' | 'hrv' | 'restingHR' | 'activity' | 'respiratoryRate' | 'temperature';
export type ShineTrend = 'improving' | 'declining' | 'stable' | 'unknown';
export type ShineState = 'shining' | 'balanced' | 'tense' | 'overload' | 'waiting';

export interface ShineContext extends HealthProfileContext {
  historyByMetric?: Partial<HealthHistoryByMetric>;
}

export interface ShineBreakdown {
  hrv: number;
  sleep: number;
  activity: number;
  restingHR: number;
  respiratoryRate: number;
  temperature: number;
  total: number;
  state: ShineState;
  scores: Partial<Record<ShineDriver, number>>;
  primaryDriver: ShineDriver | null;
  secondaryDriver: ShineDriver | null;
  trend: ShineTrend;
  availableMetrics: number;
  maxPossible: number;
  dataQuality: 'full' | 'partial' | 'minimal' | 'none';
  usedPersonalBaseline: boolean;
  spo2SafetyAdjustment: boolean;
}

const WEIGHTS: Record<ShineDriver, number> = {
  sleep: 0.30,
  hrv: 0.25,
  restingHR: 0.15,
  activity: 0.10,
  respiratoryRate: 0.10,
  temperature: 0.10,
};

type Baseline = { mean: number; sigma: number; lowerIsBetter?: boolean };

const populationBaseline = (driver: ShineDriver, context: ShineContext): Baseline => {
  const age = context.age ?? 35;
  const female = context.gender === 'female';
  const base: Record<ShineDriver, Baseline> = {
    sleep: { mean: 7.5, sigma: 1.25 },
    hrv: { mean: age < 30 ? (female ? 65 : 60) : age < 50 ? (female ? 55 : 50) : (female ? 45 : 40), sigma: 15 },
    restingHR: { mean: 65, sigma: 10, lowerIsBetter: true },
    activity: { mean: 8_000, sigma: 3_000 },
    respiratoryRate: { mean: 14, sigma: 2.5, lowerIsBetter: true },
    temperature: { mean: 36.4, sigma: 0.35, lowerIsBetter: true },
  };
  return applyCycleAdjustment(driver, base[driver], context.cyclePhase ?? null);
};

function applyCycleAdjustment(driver: ShineDriver, baseline: Baseline, phase: CyclePhase): Baseline {
  if (!phase) return baseline;
  const adjusted = { ...baseline };
  if (driver === 'hrv') {
    const multipliers = { menstrual: 0.95, follicular: 1.05, ovulatory: 1.08, luteal: 0.92 };
    adjusted.mean *= multipliers[phase];
  } else if (driver === 'restingHR') {
    adjusted.mean += { menstrual: 3, follicular: -2, ovulatory: -4, luteal: 4 }[phase];
  } else if (driver === 'temperature') {
    adjusted.mean += { menstrual: -0.1, follicular: 0, ovulatory: 0.2, luteal: 0.2 }[phase];
  }
  return adjusted;
}

function meanAndSigma(values: number[]): Baseline | null {
  if (values.length < 7) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return { mean, sigma: Math.max(Math.sqrt(variance), Math.abs(mean) * 0.05, 0.1) };
}

function personalBaseline(metric: HealthMetricKey, context: ShineContext): Baseline | null {
  const points = context.historyByMetric?.[metric] ?? [];
  return meanAndSigma(points.filter(point => point.status === 'available' && point.value !== null).slice(-30).map(point => point.value as number));
}

function sigmoidScore(value: number, baseline: Baseline): number {
  const z = (value - baseline.mean) / baseline.sigma;
  const normalized = 1 / (1 + Math.exp(-1.2 * z));
  return Math.round(100 * (baseline.lowerIsBetter ? 1 - normalized : normalized));
}

function sleepScore(metrics: HealthMetrics, baseline: Baseline): number {
  const duration = sigmoidScore(metrics.sleepHours!, baseline);
  const deep = metrics.deepSleepPercent == null ? duration : Math.max(0, Math.min(100, metrics.deepSleepPercent * 3.5));
  const interruptions = metrics.sleepInterruptions == null
    ? duration
    : sigmoidScore(metrics.sleepInterruptions, { mean: 2, sigma: 1.5, lowerIsBetter: true });
  return Math.round(duration * 0.5 + deep * 0.3 + interruptions * 0.2);
}

function driverValue(driver: ShineDriver, metrics: HealthMetrics): number | null {
  if (driver === 'sleep') return metrics.sleepHours;
  if (driver === 'activity') return metrics.steps;
  return metrics[driver] ?? null;
}

function driverMetric(driver: ShineDriver): HealthMetricKey {
  if (driver === 'sleep') return 'sleepHours';
  if (driver === 'activity') return 'steps';
  return driver;
}

function calculateTrend(driver: ShineDriver | null, context: ShineContext): ShineTrend {
  if (!driver) return 'unknown';
  const points = (context.historyByMetric?.[driverMetric(driver)] ?? [])
    .filter(point => point.status === 'available' && point.value !== null)
    .slice(-3)
    .map(point => point.value as number);
  if (points.length < 3) return 'unknown';
  const baseline = populationBaseline(driver, context);
  const normalized = points.map(value => baseline.lowerIsBetter ? -value : value);
  if (normalized[0] < normalized[1] && normalized[1] < normalized[2]) return 'improving';
  if (normalized[0] > normalized[1] && normalized[1] > normalized[2]) return 'declining';
  return 'stable';
}

export function calculateShine(metrics: HealthMetrics, context: ShineContext | number = {}): ShineBreakdown {
  const resolvedContext: ShineContext = typeof context === 'number' ? {} : context;
  const scores: Partial<Record<ShineDriver, number>> = {};
  let usedPersonalBaseline = false;

  for (const driver of Object.keys(WEIGHTS) as ShineDriver[]) {
    const value = driverValue(driver, metrics);
    if (value == null) continue;
    const personal = personalBaseline(driverMetric(driver), resolvedContext);
    const baseline = personal
      ? { ...personal, lowerIsBetter: populationBaseline(driver, resolvedContext).lowerIsBetter }
      : populationBaseline(driver, resolvedContext);
    usedPersonalBaseline ||= Boolean(personal);
    scores[driver] = driver === 'sleep' ? sleepScore(metrics, baseline) : sigmoidScore(value, baseline);
  }

  const entries = Object.entries(scores) as [ShineDriver, number][];
  const availableWeight = entries.reduce((sum, [driver]) => sum + WEIGHTS[driver], 0);
  const canCalculate = metrics.hrv != null || metrics.restingHR != null;
  let total = entries.length && canCalculate
    ? Math.round(entries.reduce((sum, [driver, score]) => sum + score * WEIGHTS[driver], 0) / availableWeight)
    : 0;
  const spo2SafetyAdjustment = metrics.spo2 != null && metrics.spo2 < 93;
  if (spo2SafetyAdjustment) total = Math.max(0, total - 15);

  const ranked = entries
    .map(([driver, score]) => ({ driver, deviation: Math.abs(score / 100 - 0.5), score }))
    .sort((a, b) => b.deviation - a.deviation);
  const primaryDriver = ranked[0]?.driver ?? null;
  const secondaryDriver = ranked[1] && ranked[0] && ranked[0].deviation - ranked[1].deviation <= 0.1
    ? ranked[1].driver
    : null;
  const state: ShineState = !entries.length || !canCalculate
    ? 'waiting'
    : total >= 80 ? 'shining' : total >= 60 ? 'balanced' : total >= 40 ? 'tense' : 'overload';

  return {
    hrv: scores.hrv ?? 0,
    sleep: scores.sleep ?? 0,
    activity: scores.activity ?? 0,
    restingHR: scores.restingHR ?? 0,
    respiratoryRate: scores.respiratoryRate ?? 0,
    temperature: scores.temperature ?? 0,
    total,
    state,
    scores,
    primaryDriver,
    secondaryDriver,
    trend: calculateTrend(primaryDriver, resolvedContext),
    availableMetrics: entries.length,
    maxPossible: 100,
    dataQuality: entries.length >= 6 ? 'full' : entries.length >= 4 ? 'partial' : entries.length ? 'minimal' : 'none',
    usedPersonalBaseline,
    spo2SafetyAdjustment,
  };
}

export function getShineLabel(score: number, dataQuality: string): string {
  if (dataQuality === 'none') return 'Ждём данные';
  if (score >= 80) return 'Сияешь';
  if (score >= 60) return 'В балансе';
  if (score >= 40) return 'Напряжён';
  return 'Перегруз';
}

export function getShineColor(score: number, dataQuality: string): string {
  if (dataQuality === 'none') return '#94a3b8';
  if (score >= 80) return '#6ee7b7';
  if (score >= 60) return '#7dd3fc';
  if (score >= 40) return '#fbbf24';
  return '#fb7185';
}
