import type { CyclePhase } from './types';

/**
 * EPIC 1 — единый конфиг математики «Сияния».
 *
 * Форма — JSON-совместимая (только данные, без функций), поэтому тот же объект
 * можно отдать с сервера (remote-config) и обновлять коэффициенты без релиза.
 * Пока лежит как TS-модуль: в tsconfig нет resolveJsonModule, а Vite/TS так
 * типобезопасно. Сигнатура calculateShine(metrics, ctx, config) уже принимает
 * конфиг третьим аргументом.
 */

export type ShineDriver =
  | 'sleep'
  | 'hrv'
  | 'restingHR'
  | 'activity'
  | 'respiratoryRate'
  | 'temperature';

/** Норма драйвера: среднее + сигма. lowerIsBetter — чем ниже значение, тем выше скор. */
export interface Baseline {
  mean: number;
  sigma: number;
  lowerIsBetter?: boolean;
}

/** Популяционная норма одного драйвера. */
export interface PopulationEntry {
  mean: number;
  sigma: number;
  lowerIsBetter?: boolean;
}

/** Точечная поправка: мультипликативная (muMult/sigmaMult) или аддитивная (muDelta). */
export interface CycleAdjustment {
  muMult?: number;
  muDelta?: number;
  sigmaMult?: number;
}

export type CycleTable = Record<
  ShineDriver,
  Partial<Record<Exclude<CyclePhase, null>, CycleAdjustment>>
>;

export interface PregnancyConfig {
  /** Индекс 0 — запасной no-op; 1/2/3 — триместры. Неизвестный триместр => T1. */
  restingHRDelta: [number, number, number, number];
  hrvMult: [number, number, number, number];
  temperatureDelta: [number, number, number, number];
  sleepDelta: [number, number, number, number];
  /** Расширение неопределённости норм при беременности. */
  sigmaMult: number;
  /** Смягчение порога tense (отрицательное число), чтобы не пугать. */
  stateSoftening: number;
}

export interface BaselineTuning {
  shortDays: number;
  longDays: number;
  minPoints: number;
  madThreshold: number;
  shortDecayDays: number;
  /** Вес short-базы в период становления (дни 7–13). */
  onsetBlendWeight: number;
  /** Вес long-базы в период 30–89 дней. */
  longBlendWeight: number;
}

export interface ShineConfig {
  version: number;
  /** Крутизна сигмоиды. */
  k: number;
  weights: Record<ShineDriver, number>;
  population: {
    sleep: PopulationEntry;
    hrvYoung: { female: number; male: number };
    hrvMid: { female: number; male: number };
    hrvSenior: { female: number; male: number };
    hrvSigma: number;
    restingHR: PopulationEntry;
    activity: PopulationEntry;
    activeMinutes: PopulationEntry;
    respiratoryRate: PopulationEntry;
    temperature: PopulationEntry;
    sleepInterruptions: PopulationEntry;
    sleepEfficiency: PopulationEntry;
    sleepLatency: PopulationEntry;
  };
  thresholds: { shining: number; balanced: number; tense: number };
  /** Потолок суммарных штрафов в пунктах. */
  penaltiesCap: number;
  penalties: {
    breathMax: number;
    tempMax: number;
    circadianMax: number;
    spo2Mid: number;
    spo2Low: number;
    spo2MidThreshold: number;
    spo2LowThreshold: number;
    breathSigmaFree: number;
    breathSigmaMax: number;
    tempFree: number;
    tempMaxDev: number;
    circadianFreeStd: number;
    circadianMaxStd: number;
  };
  baseline: BaselineTuning;
  sleepComposition: { duration: number; efficiency: number; regularity: number; architecture: number; continuity: number };
  sleepArchitecture: { deepMin: number; deepMax: number; remMin: number; remMax: number };
  sleepDebt: { freeHours: number; maxHours: number; maxPenalty: number };
  activityComposition: { steps: number; active: number };
  cycle: CycleTable;
  pregnancy: PregnancyConfig;
}

export const DEFAULT_SHINE_CONFIG: ShineConfig = {
  version: 4,
  k: 1.2,
  weights: {
    sleep: 0.3,
    hrv: 0.25,
    restingHR: 0.15,
    activity: 0.1,
    respiratoryRate: 0.1,
    temperature: 0.1,
  },
  population: {
    sleep: { mean: 7.5, sigma: 1.25 },
    hrvYoung: { female: 65, male: 60 },
    hrvMid: { female: 55, male: 50 },
    hrvSenior: { female: 45, male: 40 },
    hrvSigma: 15,
    restingHR: { mean: 65, sigma: 10, lowerIsBetter: true },
    activity: { mean: 8000, sigma: 3000 },
    activeMinutes: { mean: 30, sigma: 15 },
    respiratoryRate: { mean: 14, sigma: 2.5, lowerIsBetter: true },
    temperature: { mean: 36.4, sigma: 0.35, lowerIsBetter: true },
    sleepInterruptions: { mean: 2, sigma: 1.5, lowerIsBetter: true },
    sleepEfficiency: { mean: 87, sigma: 6 },
    sleepLatency: { mean: 15, sigma: 10, lowerIsBetter: true },
  },
  thresholds: { shining: 80, balanced: 60, tense: 40 },
  penaltiesCap: 28,
  penalties: {
    breathMax: 10,
    tempMax: 8,
    circadianMax: 8,
    spo2Mid: 10,
    spo2Low: 15,
    spo2MidThreshold: 93,
    spo2LowThreshold: 90,
    breathSigmaFree: 1,
    breathSigmaMax: 3,
    tempFree: 0.15,
    tempMaxDev: 0.6,
    circadianFreeStd: 0.75,
    circadianMaxStd: 2.5,
  },
  baseline: {
    shortDays: 14,
    longDays: 60,
    minPoints: 7,
    madThreshold: 3,
    shortDecayDays: 7,
    onsetBlendWeight: 0.5,
    longBlendWeight: 0.7,
  },
  sleepComposition: { duration: 0.35, efficiency: 0.2, regularity: 0.2, architecture: 0.15, continuity: 0.1 },
  sleepArchitecture: { deepMin: 13, deepMax: 23, remMin: 20, remMax: 25 },
  sleepDebt: { freeHours: 2, maxHours: 8, maxPenalty: 6 },
  activityComposition: { steps: 0.7, active: 0.3 },
  cycle: {
    sleep: {
      // Лютеиновая фаза и ПМС — физиологичная фрагментация сна.
      // Не штрафуем женщину за природу: расширяем допуск.
      luteal: { sigmaMult: 1.35 },
      menstrual: { sigmaMult: 1.15 },
    },
    hrv: {
      menstrual: { muMult: 0.95, sigmaMult: 1.1 },
      follicular: { muMult: 1.05 },
      ovulatory: { muMult: 1.08 },
      luteal: { muMult: 0.92, sigmaMult: 1.15 },
    },
    restingHR: {
      menstrual: { muDelta: 3 },
      follicular: { muDelta: -2 },
      ovulatory: { muDelta: -4 },
      luteal: { muDelta: 4 },
    },
    activity: {},
    respiratoryRate: {},
    temperature: {
      menstrual: { muDelta: -0.1 },
      ovulatory: { muDelta: 0.2 },
      luteal: { muDelta: 0.2 },
    },
  },
  pregnancy: {
    restingHRDelta: [0, 5, 10, 15],
    hrvMult: [1, 0.95, 0.9, 0.85],
    temperatureDelta: [0, 0.1, 0.2, 0.2],
    sleepDelta: [0, 0, -0.25, -0.5],
    sigmaMult: 1.2,
    stateSoftening: -5,
  },
};
