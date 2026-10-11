import type {
  HealthHistoryByMetric,
  HealthMetricKey,
  HealthMetrics,
  HealthProfileContext,
} from './types';
import { DEFAULT_SHINE_CONFIG, type Baseline, type ShineConfig, type ShineDriver } from './shineConfig';
import { dualBaseline, valuesWithAge, type BaselineSource } from './baseline';
import { applyCycleAndPregnancy, phaseFromCycleDay } from './cycle';
import {
  midpointStd as midpointStdFromNights,
  sleepDebt as calcSleepDebt,
  type SleepNightLike,
} from './sleep';

export type { ShineDriver };
export type ShineTrend = 'improving' | 'declining' | 'stable' | 'unknown';
export type ShineState = 'shining' | 'balanced' | 'tense' | 'overload' | 'waiting';

export interface ShineContext extends HealthProfileContext {
  historyByMetric?: Partial<HealthHistoryByMetric>;
  sleepNights?: SleepNightLike[];
  sleepDebtHours?: number | null;
}

export interface ShinePenaltyBreakdown {
  breath: number;
  temperature: number;
  circadian: number;
  spo2: number;
  sleepDebt: number;
  sleepDebtHours: number;
  total: number;
  capped: boolean;
}

export interface ShineBreakdown {
  hrv: number;
  sleep: number;
  activity: number;
  restingHR: number;
  respiratoryRate: number;
  temperature: number;
  total: number;
  /** Взвешенная база до вычета штрафов — для отладки и EPIC 2 (нарративы). */
  baseScore: number;
  state: ShineState;
  scores: Partial<Record<ShineDriver, number>>;
  primaryDriver: ShineDriver | null;
  secondaryDriver: ShineDriver | null;
  trend: ShineTrend;
  availableMetrics: number;
  maxPossible: number;
  dataQuality: 'full' | 'partial' | 'minimal' | 'none';
  usedPersonalBaseline: boolean;
  baselineByDriver: Partial<Record<ShineDriver, BaselineSource>>;
  penalties: ShinePenaltyBreakdown;
  spo2SafetyAdjustment: boolean;
  configVersion: number;
}

function populationMean(driver: ShineDriver, context: ShineContext, config: ShineConfig): Baseline {
  const age = context.age ?? 35;
  const female = context.gender === 'female';
  const pop = config.population;
  switch (driver) {
    case 'sleep':
      return { ...pop.sleep };
    case 'hrv': {
      const band = age < 30 ? pop.hrvYoung : age < 50 ? pop.hrvMid : pop.hrvSenior;
      return { mean: female ? band.female : band.male, sigma: pop.hrvSigma };
    }
    case 'restingHR':
      return { ...pop.restingHR };
    case 'activity':
      return { ...pop.activity };
    case 'respiratoryRate':
      return { ...pop.respiratoryRate };
    case 'temperature':
      return { ...pop.temperature };
  }
}

export function populationBaseline(
  driver: ShineDriver,
  context: ShineContext,
  config: ShineConfig = DEFAULT_SHINE_CONFIG,
): Baseline {
  return resolveBaseline(driver, context, config).baseline;
}

function resolveBaseline(
  driver: ShineDriver,
  context: ShineContext,
  config: ShineConfig,
): { baseline: Baseline; source: BaselineSource } {
  const pop = populationMean(driver, context, config);
  const aged = valuesWithAge(context.historyByMetric?.[driverMetric(driver)]);
  const result = dualBaseline(aged, pop, config.baseline);
  const phase = context.cyclePhase ?? phaseFromCycleDay(context.cycleDay, context.cycleLength ?? 28);
  const baseline = applyCycleAndPregnancy(
    driver,
    { mean: result.mean, sigma: result.sigma, lowerIsBetter: pop.lowerIsBetter },
    {
      cyclePhase: phase,
      pregnancyMode: context.pregnancyMode ?? false,
      pregnancyTrimester: context.pregnancyTrimester ?? null,
    },
    config,
  );
  return { baseline, source: result.source };
}

function sigmoidScore(value: number, baseline: Baseline, k: number): number {
  const z = (value - baseline.mean) / baseline.sigma;
  const normalized = 1 / (1 + Math.exp(-k * z));
  return Math.round(100 * (baseline.lowerIsBetter ? 1 - normalized : normalized));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bandScore(percent: number | null, min: number, max: number): number | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  if (percent >= min && percent <= max) return 100;
  const edge = percent < min ? min - percent : percent - max;
  // Линейный спад: ±10 п.п. от нормы = −40 очков, дальше пол.
  return clampScore(100 - edge * 4);
}

function driverSleepScore(
  metrics: HealthMetrics,
  context: ShineContext,
  config: ShineConfig,
  baselines: (driver: ShineDriver) => Baseline,
): { score: number; midpointStd: number | null; efficiency: number | null; debtHours: number } {
  const durationBase = baselines('sleep');
  const duration = metrics.sleepHours == null
    ? 50
    : sigmoidScore(metrics.sleepHours, durationBase, config.k);

  // Efficiency: реальное значение, иначе нейтраль = duration.
  const efficiency = metrics.sleepEfficiency == null
    ? duration
    : sigmoidScore(metrics.sleepEfficiency, { ...config.population.sleepEfficiency }, config.k);

  // Regularity: настоящий std midpoint по ночам; фолбэк — контекст/proxy.
  let midpointStd = context.sleepNights?.length
    ? midpointStdFromNights(context.sleepNights)
    : null;
  let regularity = duration;
  if (midpointStd != null) {
    regularity = clampScore(100 - midpointStd * 40);
  } else {
    const history = (context.historyByMetric?.sleepHours ?? [])
      .filter(point => point.status === 'available' && point.value !== null)
      .slice(-7)
      .map(point => point.value as number);
    if (history.length >= 4) {
      const avg = history.reduce((sum, value) => sum + value, 0) / history.length;
      midpointStd = Math.sqrt(history.reduce((sum, value) => sum + (value - avg) ** 2, 0) / history.length);
      regularity = clampScore(100 - midpointStd * 30);
    } else if (context.sleepMidpointHours != null || metrics.sleepMidpointHours != null) {
      const mid = context.sleepMidpointHours ?? metrics.sleepMidpointHours ?? 3;
      midpointStd = Math.abs(mid - 3) / 2;
      regularity = clampScore(100 - midpointStd * 40);
    }
  }

  // Architecture: deep 13–23% + rem 20–25%; нет стадий — нейтраль.
  const arch = config.sleepArchitecture;
  const deepScore = bandScore(metrics.deepSleepPercent ?? null, arch.deepMin, arch.deepMax);
  const remScore = bandScore(metrics.remSleepPercent ?? null, arch.remMin, arch.remMax);
  const present = [deepScore, remScore].filter((score): score is number => score != null);
  const architecture = present.length > 0
    ? Math.round(present.reduce((sum, score) => sum + score, 0) / present.length)
    : duration;

  // Continuity: WASO <20 мин = 100; пробуждения как запасной сигнал.
  let continuity = duration;
  if (metrics.wasoMinutes != null) {
    continuity = clampScore(100 - Math.max(0, metrics.wasoMinutes - 20) * 2);
  } else if (metrics.sleepLatencyMinutes != null) {
    continuity = sigmoidScore(
      metrics.sleepLatencyMinutes,
      { ...config.population.sleepLatency },
      config.k,
    );
  } else if (metrics.sleepInterruptions != null) {
    continuity = sigmoidScore(
      metrics.sleepInterruptions,
      { ...config.population.sleepInterruptions },
      config.k,
    );
  }

  const comp = config.sleepComposition;
  const score = clampScore(
    duration * comp.duration
    + efficiency * comp.efficiency
    + regularity * comp.regularity
    + architecture * comp.architecture
    + continuity * comp.continuity,
  );

  // Долг сна: из контекста (посчитан менеджером) или по ночам на месте.
  const debtHours = context.sleepDebtHours
    ?? (context.sleepNights?.length ? calcSleepDebt(context.sleepNights, durationBase.mean) : 0);

  return { score, midpointStd, efficiency: metrics.sleepEfficiency ?? null, debtHours };
}

function driverActivityScore(
  metrics: HealthMetrics,
  config: ShineConfig,
  baselines: (driver: ShineDriver) => Baseline,
): number {
  const stepsBase = baselines('activity');
  const stepsScore = metrics.steps == null ? 50 : sigmoidScore(metrics.steps, stepsBase, config.k);
  if (metrics.activeMinutes == null) return stepsScore;
  const activeScore = sigmoidScore(metrics.activeMinutes, { ...config.population.activeMinutes }, config.k);
  const comp = config.activityComposition;
  return clampScore(stepsScore * comp.steps + activeScore * comp.active);
}

function computePenalties(
  metrics: HealthMetrics,
  context: ShineContext,
  resolved: Record<ShineDriver, Baseline>,
  midpointStd: number | null,
  sleepDebtHours: number,
  config: ShineConfig,
): ShinePenaltyBreakdown {
  const p = config.penalties;
  let breath = 0;
  if (metrics.respiratoryRate != null) {
    const base = resolved.respiratoryRate;
    const dev = Math.abs(metrics.respiratoryRate - base.mean) / base.sigma;
    if (dev > p.breathSigmaFree) {
      breath = Math.min(p.breathMax, ((dev - p.breathSigmaFree) / (p.breathSigmaMax - p.breathSigmaFree)) * p.breathMax);
    }
  }
  let temperature = 0;
  if (metrics.temperature != null) {
    const dev = Math.abs(metrics.temperature - resolved.temperature.mean);
    if (dev > p.tempFree) {
      temperature = Math.min(p.tempMax, ((dev - p.tempFree) / (p.tempMaxDev - p.tempFree)) * p.tempMax);
    }
  }
  let circadian = 0;
  const std = midpointStd
    ?? (context.sleepMidpointHours != null ? Math.abs(context.sleepMidpointHours - 3) / 2 : null);
  if (std != null && std > p.circadianFreeStd) {
    circadian = Math.min(p.circadianMax, ((std - p.circadianFreeStd) / (p.circadianMaxStd - p.circadianFreeStd)) * p.circadianMax);
  }
  let spo2 = 0;
  if (metrics.spo2 != null) {
    if (metrics.spo2 < p.spo2LowThreshold) spo2 = p.spo2Low;
    else if (metrics.spo2 < p.spo2MidThreshold) spo2 = p.spo2Mid;
  }
  // Долг сна: недосып за неделю, линейно от free до max.
  let sleepDebt = 0;
  const debt = config.sleepDebt;
  if (sleepDebtHours > debt.freeHours) {
    sleepDebt = Math.min(
      debt.maxPenalty,
      ((sleepDebtHours - debt.freeHours) / (debt.maxHours - debt.freeHours)) * debt.maxPenalty,
    );
  }
  const raw = Math.round(breath + temperature + circadian + spo2 + sleepDebt);
  const total = Math.min(config.penaltiesCap, raw);
  return {
    breath: Math.round(breath),
    temperature: Math.round(temperature),
    circadian: Math.round(circadian),
    spo2,
    sleepDebt: Math.round(sleepDebt),
    sleepDebtHours: Math.round(sleepDebtHours * 10) / 10,
    total,
    capped: raw > config.penaltiesCap,
  };
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

function calculateTrend(
  driver: ShineDriver | null,
  context: ShineContext,
  resolved: Partial<Record<ShineDriver, Baseline>>,
  config: ShineConfig = DEFAULT_SHINE_CONFIG,
): ShineTrend {
  if (!driver) return 'unknown';
  const points = (context.historyByMetric?.[driverMetric(driver)] ?? [])
    .filter(point => point.status === 'available' && point.value !== null)
    .slice(-3)
    .map(point => point.value as number);
  if (points.length < 3) return 'unknown';
  const base = resolved[driver] ?? populationBaseline(driver, context, config);
  const normalized = points.map(value => (base.lowerIsBetter ? -value : value));
  if (normalized[0] < normalized[1] && normalized[1] < normalized[2]) return 'improving';
  if (normalized[0] > normalized[1] && normalized[1] > normalized[2]) return 'declining';
  return 'stable';
}

export function calculateShine(
  metrics: HealthMetrics,
  context: ShineContext | number = {},
  config: ShineConfig = DEFAULT_SHINE_CONFIG,
): ShineBreakdown {
  const resolvedContext: ShineContext = typeof context === 'number' ? {} : context;
  const drivers = Object.keys(config.weights) as ShineDriver[];
  const resolvedBaselines = {} as Record<ShineDriver, Baseline>;
  const baselineByDriver: Partial<Record<ShineDriver, BaselineSource>> = {};
  for (const driver of drivers) {
    const resolved = resolveBaseline(driver, resolvedContext, config);
    resolvedBaselines[driver] = resolved.baseline;
    baselineByDriver[driver] = resolved.source;
  }
  const baselinesOf = (driver: ShineDriver): Baseline => resolvedBaselines[driver];
  const scores: Partial<Record<ShineDriver, number>> = {};
  let usedPersonalBaseline = false;
  let sleepMidpointStd: number | null = null;
  let sleepDebtHours = 0;

  for (const driver of drivers) {
    const value = driverValue(driver, metrics);
    const source = baselineByDriver[driver];
    if (source && source !== 'population') usedPersonalBaseline = true;
    if (driver === 'sleep') {
      if (metrics.sleepHours == null && (resolvedContext.historyByMetric?.sleepHours ?? []).length === 0) continue;
      const sleep = driverSleepScore(metrics, resolvedContext, config, baselinesOf);
      scores.sleep = sleep.score;
      sleepMidpointStd = sleep.midpointStd;
      sleepDebtHours = sleep.debtHours;
      continue;
    }
    if (driver === 'activity') {
      if (metrics.steps == null && metrics.activeMinutes == null) continue;
      scores.activity = driverActivityScore(metrics, config, baselinesOf);
      continue;
    }
    if (value == null) continue;
    scores[driver] = sigmoidScore(value, resolvedBaselines[driver], config.k);
  }

  const penalties = computePenalties(metrics, resolvedContext, resolvedBaselines, sleepMidpointStd, sleepDebtHours, config);
  const entries = Object.entries(scores) as [ShineDriver, number][];
  const availableWeight = entries.reduce((sum, [driver]) => sum + config.weights[driver], 0);
  const canCalculate = metrics.hrv != null || metrics.restingHR != null;
  const baseScore = entries.length && canCalculate
    ? Math.round(entries.reduce((sum, [driver, score]) => sum + score * config.weights[driver], 0) / availableWeight)
    : 0;
  const total = entries.length && canCalculate ? Math.max(0, baseScore - penalties.total) : 0;
  const spo2SafetyAdjustment = penalties.spo2 > 0;

  const ranked = entries
    .map(([driver, score]) => ({ driver, deviation: Math.abs(score / 100 - 0.5), score }))
    .sort((a, b) => b.deviation - a.deviation);
  const primaryDriver = ranked[0]?.driver ?? null;
  const secondaryDriver = ranked[1] && ranked[0] && ranked[0].deviation - ranked[1].deviation <= 0.1
    ? ranked[1].driver
    : null;
  const tenseThreshold = resolvedContext.pregnancyMode
    ? config.thresholds.tense + config.pregnancy.stateSoftening
    : config.thresholds.tense;
  const state: ShineState = !entries.length || !canCalculate
    ? 'waiting'
    : total >= config.thresholds.shining
      ? 'shining'
      : total >= config.thresholds.balanced
        ? 'balanced'
        : total >= tenseThreshold
          ? 'tense'
          : 'overload';

  return {
    hrv: scores.hrv ?? 0,
    sleep: scores.sleep ?? 0,
    activity: scores.activity ?? 0,
    restingHR: scores.restingHR ?? 0,
    respiratoryRate: scores.respiratoryRate ?? 0,
    temperature: scores.temperature ?? 0,
    total,
    baseScore,
    state,
    scores,
    primaryDriver,
    secondaryDriver,
    trend: calculateTrend(primaryDriver, resolvedContext, resolvedBaselines, config),
    availableMetrics: entries.length,
    maxPossible: 100,
    dataQuality: entries.length >= 6 ? 'full' : entries.length >= 4 ? 'partial' : entries.length ? 'minimal' : 'none',
    usedPersonalBaseline,
    baselineByDriver,
    penalties,
    spo2SafetyAdjustment,
    configVersion: config.version,
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

const STATE_ACCENT: Record<ShineState, string> = {
  shining: '#74B6A0',
  balanced: '#7dd3fc',
  tense: '#C59A55',
  overload: '#C56855',
  waiting: '#94a3b8',
};

export function getShineAccentColor(
  state: ShineState | undefined,
  score: number,
  dataQuality: string,
): string {
  if (dataQuality === 'none') return STATE_ACCENT.waiting;
  if (state && state in STATE_ACCENT) return STATE_ACCENT[state];
  return getShineColor(score, dataQuality);
}
