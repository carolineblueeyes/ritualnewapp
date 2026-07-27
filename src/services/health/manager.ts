import {
  DailyHealthPoint,
  EMPTY_AVAILABILITY_BY_METRIC,
  EMPTY_HISTORY_BY_METRIC,
  EMPTY_METRICS,
  HealthAvailabilityByMetric,
  HealthHistoryByMetric,
  HealthMetricKey,
  HealthMetrics,
  HealthSnapshot,
  HEALTH_METRIC_KEYS,
} from './types';
import { healthService } from './health.service';
import { bleRingService } from './ring';

export type DataSource = 'ring' | 'healthapp' | 'none';

export interface CombinedHealthState {
  snapshot: HealthSnapshot;
  metrics: HealthMetrics;
  historyByMetric: HealthHistoryByMetric;
  availabilityByMetric: HealthAvailabilityByMetric;
  source: DataSource;
  hasRing: boolean;
  hasHealthApp: boolean;
  loading: boolean;
}

const CACHE_KEY = 'ritual_health_cache_v2';
const HISTORY_KEY = 'ritual_health_history_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeDailyPoints(points: DailyHealthPoint[]): DailyHealthPoint[] {
  const byDate = new Map<string, DailyHealthPoint>();
  for (const point of points || []) {
    const existing = byDate.get(point.date);
    const shouldReplace = !existing
      || (point.source === 'ring' && existing.source !== 'ring')
      || (point.source === existing.source && (point.lastSync || '') >= (existing.lastSync || ''));
    if (shouldReplace) byDate.set(point.date, point);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}

function normalizeHistory(history: HealthHistoryByMetric): HealthHistoryByMetric {
  return Object.fromEntries(
    HEALTH_METRIC_KEYS.map(metric => [metric, normalizeDailyPoints(history?.[metric] || [])]),
  ) as HealthHistoryByMetric;
}

function emptySnapshot(source: HealthMetrics['source'] = 'none'): HealthSnapshot {
  return {
    metrics: { ...EMPTY_METRICS, source },
    historyByMetric: {
      hrv: [],
      sleepHours: [],
      steps: [],
      restingHR: [],
      spo2: [],
      temperature: [],
      respiratoryRate: [],
    },
    availabilityByMetric: { ...EMPTY_AVAILABILITY_BY_METRIC },
    source,
    lastSync: null,
  };
}

function loadCache(): HealthSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: HealthSnapshot = JSON.parse(raw);
    if (!cached.lastSync) return null;
    const age = Date.now() - new Date(cached.lastSync).getTime();
    if (age > CACHE_TTL_MS) return null;
    cached.historyByMetric = normalizeHistory(cached.historyByMetric);
    return cached;
  } catch {
    return null;
  }
}

function saveCache(snapshot: HealthSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...snapshot,
      historyByMetric: normalizeHistory(snapshot.historyByMetric),
    }));
  } catch {}
}

function saveHistory(historyByMetric: HealthHistoryByMetric) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(normalizeHistory(historyByMetric)));
  } catch {}
}

function loadHistory(): HealthHistoryByMetric {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { ...EMPTY_HISTORY_BY_METRIC };
    const normalized = normalizeHistory(JSON.parse(raw));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return { ...EMPTY_HISTORY_BY_METRIC };
  }
}

function latestValue(points: DailyHealthPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].status === 'available' && points[i].value !== null) return points[i].value;
  }
  return null;
}

function sourceToDataSource(source: HealthMetrics['source']): DataSource {
  if (source === 'ring') return 'ring';
  if (source === 'healthkit' || source === 'healthconnect') return 'healthapp';
  return 'none';
}

function pointForToday(metric: HealthMetricKey, value: number, source: HealthMetrics['source'], lastSync: string): DailyHealthPoint {
  const units: Record<HealthMetricKey, string> = {
    hrv: 'ms',
    sleepHours: 'h',
    steps: 'count',
    restingHR: 'bpm',
    spo2: '%',
    temperature: '°C',
    respiratoryRate: 'br/min',
  };
  return {
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10),
    metric,
    value,
    unit: units[metric],
    source,
    status: 'available',
    lastSync,
  };
}

function mergeRingSnapshot(base: HealthSnapshot, ringMetrics: HealthMetrics): HealthSnapshot {
  const lastSync = ringMetrics.lastSync || new Date().toISOString();
  const historyByMetric: HealthHistoryByMetric = {
    hrv: [...base.historyByMetric.hrv],
    sleepHours: [...base.historyByMetric.sleepHours],
    steps: [...base.historyByMetric.steps],
    restingHR: [...base.historyByMetric.restingHR],
    spo2: [...base.historyByMetric.spo2],
    temperature: [...base.historyByMetric.temperature],
    respiratoryRate: [...base.historyByMetric.respiratoryRate],
  };
  const availabilityByMetric = { ...base.availabilityByMetric };
  const metrics = { ...base.metrics };

  const ringValues: Partial<Record<HealthMetricKey, number | null>> = {
    hrv: ringMetrics.hrv,
    sleepHours: ringMetrics.sleepHours,
    steps: ringMetrics.steps,
    restingHR: ringMetrics.restingHR,
    spo2: ringMetrics.spo2,
    temperature: ringMetrics.temperature,
    respiratoryRate: ringMetrics.respiratoryRate,
  };

  for (const metric of HEALTH_METRIC_KEYS) {
    const value = ringValues[metric];
    if (value === null || value === undefined) continue;
    historyByMetric[metric] = normalizeDailyPoints([
      ...historyByMetric[metric],
      pointForToday(metric, value, 'ring', lastSync),
    ]);
    availabilityByMetric[metric] = 'available';
  }

  metrics.hrv = latestValue(historyByMetric.hrv);
  metrics.sleepHours = latestValue(historyByMetric.sleepHours);
  metrics.steps = latestValue(historyByMetric.steps);
  metrics.restingHR = latestValue(historyByMetric.restingHR);
  metrics.spo2 = latestValue(historyByMetric.spo2);
  metrics.temperature = latestValue(historyByMetric.temperature);
  metrics.respiratoryRate = latestValue(historyByMetric.respiratoryRate);
  // A connected Ritual Ring remains the active source even before the first
  // history packet arrives. Connection state must not depend on Health Connect.
  metrics.source = 'ring';
  metrics.lastSync = lastSync;
  metrics.distance = ringMetrics.distance ?? metrics.distance ?? null;
  metrics.calories = ringMetrics.calories ?? metrics.calories ?? null;
  metrics.activeMinutes = ringMetrics.activeMinutes ?? metrics.activeMinutes ?? null;
  metrics.batteryLevel = ringMetrics.batteryLevel ?? metrics.batteryLevel ?? null;
  metrics.dataFreshness = ringMetrics.dataFreshness ?? lastSync;

  return {
    metrics,
    historyByMetric,
    availabilityByMetric,
    source: metrics.source,
    lastSync,
  };
}

export function getPersistentMetrics(): HealthMetrics {
  return loadCache()?.metrics || { ...EMPTY_METRICS };
}

export function savePersistentMetrics(metrics: HealthMetrics) {
  const now = new Date().toISOString();
  const snapshot: HealthSnapshot = {
    ...emptySnapshot(metrics.source),
    metrics: { ...metrics, lastSync: metrics.lastSync || now },
    lastSync: metrics.lastSync || now,
  };
  saveCache(snapshot);
}

export function updateMetricsAfterPractice(_practiceId: string, _durationMinutes: number) {
  clearHealthCache();
}

export async function fetchHealthData(): Promise<CombinedHealthState> {
  const hasRing = bleRingService.isAvailable() && bleRingService.isConnected();
  const cached = loadCache();
  if (cached && (!hasRing || cached.source === 'ring')) {
    return {
      snapshot: cached,
      metrics: cached.metrics,
      historyByMetric: cached.historyByMetric,
      availabilityByMetric: cached.availabilityByMetric,
      source: sourceToDataSource(cached.source),
      hasRing: bleRingService.isConnected(),
      hasHealthApp: cached.source === 'healthkit' || cached.source === 'healthconnect',
      loading: false,
    };
  }

  const healthConnectionKey = healthService.getPlatform() === 'ios'
    ? 'ritual_healthkit_connected'
    : 'ritual_healthconnect_connected';
  const hasHealthApp = healthService.isNative()
    && localStorage.getItem(healthConnectionKey) === 'true'
    && await healthService.isAvailable();

  let snapshot = hasHealthApp ? await healthService.getSnapshot(7) : emptySnapshot('none');
  if (!hasHealthApp) {
    snapshot.historyByMetric = loadHistory();
  }

  if (hasRing) {
    const ringMetrics = await bleRingService.getMetrics();
    snapshot = mergeRingSnapshot(snapshot, ringMetrics);
  }

  if (!hasHealthApp && !hasRing) {
    snapshot = emptySnapshot('none');
  }

  saveHistory(snapshot.historyByMetric);
  saveCache(snapshot);

  return {
    snapshot,
    metrics: snapshot.metrics,
    historyByMetric: snapshot.historyByMetric,
    availabilityByMetric: snapshot.availabilityByMetric,
    source: sourceToDataSource(snapshot.source),
    hasRing,
    hasHealthApp,
    loading: false,
  };
}

export function getCachedHealthData(): HealthMetrics {
  return loadCache()?.metrics || { ...EMPTY_METRICS };
}

export function clearHealthCache() {
  localStorage.removeItem(CACHE_KEY);
}
