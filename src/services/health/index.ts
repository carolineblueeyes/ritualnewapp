export type { HealthMetrics, HealthSource, HealthDataType } from './types';
export { EMPTY_METRICS, METRIC_META } from './types';
export { healthService } from './health.service';
export { bleRingService } from './ring';
export { X6Ring } from './x6RingPlugin';
export type { RingCandidate, RingConnectionState, RingDailySummary, RingDeviceInfo, RingPoint, RingDataType } from './x6RingPlugin';
export { fetchHealthData, getCachedHealthData, clearHealthCache } from './manager';
export type { CombinedHealthState, DataSource } from './manager';
export { connectHealthSource } from './connectFlow';
export type { ConnectHealthSourceResult, HealthConnectSourceType } from './connectFlow';
export { calculateShine, getShineLabel, getShineColor, getShineAccentColor, populationBaseline } from './shine';
export type { ShineBreakdown, ShinePenaltyBreakdown } from './shine';
export { DEFAULT_SHINE_CONFIG } from './shineConfig';
export type { ShineConfig, ShineDriver } from './shineConfig';
export { dualBaseline, filterOutliersMAD, madSigma, median } from './baseline';
export { applyCycleAndPregnancy, phaseFromCycleDay } from './cycle';
export {
  applySleepEnrichment,
  averageMidpoint,
  bedtimeWindow,
  enrichSleepFromSummary,
  midpointHours,
  midpointStd,
  sleepDebt,
} from './sleep';
export type { SleepEnrichment } from './sleep';
