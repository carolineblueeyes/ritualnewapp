import { HealthMetrics, EMPTY_METRICS } from './types';
import { healthService } from './health.service';
import { bleRingService } from './ring';

export type DataSource = 'ring' | 'healthapp' | 'none';

export interface CombinedHealthState {
  metrics: HealthMetrics;
  source: DataSource;
  hasRing: boolean;
  hasHealthApp: boolean;
  loading: boolean;
}

const CACHE_KEY = 'ritual_health_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

function loadCache(): HealthMetrics | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: HealthMetrics = JSON.parse(raw);
    if (!cached.lastSync) return null;
    const age = Date.now() - new Date(cached.lastSync).getTime();
    if (age > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(m: HealthMetrics) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(m));
  } catch {}
}

function mergeMetrics(a: HealthMetrics, b: HealthMetrics): HealthMetrics {
  return {
    hrv: a.hrv ?? b.hrv,
    sleepHours: a.sleepHours ?? b.sleepHours,
    steps: a.steps ?? b.steps,
    restingHR: a.restingHR ?? b.restingHR,
    spo2: a.spo2 ?? b.spo2,
    temperature: a.temperature ?? b.temperature,
    respiratoryRate: a.respiratoryRate ?? b.respiratoryRate,
    source: a.source !== 'none' ? a.source : b.source,
    lastSync: a.lastSync || b.lastSync,
  };
}

export function getPersistentMetrics(): HealthMetrics {
  if (typeof window === 'undefined') return { ...EMPTY_METRICS };
  const raw = localStorage.getItem('ritual_user_health_metrics');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fallback
    }
  }
  const baseline: HealthMetrics = {
    hrv: 60,
    sleepHours: 7.2,
    steps: 6200,
    restingHR: 66,
    spo2: 97,
    temperature: 36.6,
    respiratoryRate: 15.0,
    source: 'none',
    lastSync: new Date().toISOString(),
  };
  localStorage.setItem('ritual_user_health_metrics', JSON.stringify(baseline));
  return baseline;
}

export function savePersistentMetrics(metrics: HealthMetrics) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ritual_user_health_metrics', JSON.stringify(metrics));
}

export function updateMetricsAfterPractice(practiceId: string, durationMinutes: number) {
  const current = getPersistentMetrics();
  const updated = { ...current };
  updated.lastSync = new Date().toISOString();

  // HRV usually increases with breathing practices (parasympathetic activation)
  const hrvIncr = practiceId === 'calm-down' ? 6
                : practiceId === 'restore' ? 4
                : practiceId === 'important-moment' ? 3
                : practiceId === 'focus' ? 3
                : practiceId === 'path-attention' ? 3
                : 2;
  updated.hrv = Math.min(115, (updated.hrv || 60) + hrvIncr);

  // Resting Heart Rate decreases (calmer state)
  const hrDecr = practiceId === 'calm-down' ? 4
               : practiceId === 'end-day' ? 3
               : practiceId === 'restore' ? 2
               : 1;
  updated.restingHR = Math.max(52, (updated.restingHR || 66) - hrDecr);

  // SpO2 increases with deeper breathing
  const spo2Incr = practiceId === 'restore' ? 1 : 0;
  updated.spo2 = Math.min(100, (updated.spo2 || 97) + spo2Incr);

  // Steps increase for morning activation
  if (practiceId === 'start-day') {
    updated.steps = (updated.steps || 6200) + 1200;
  } else {
    updated.steps = (updated.steps || 6200) + (durationMinutes * 50);
  }

  // Sleep hours improve slightly if end-day was performed
  if (practiceId === 'end-day') {
    updated.sleepHours = Math.min(9.5, (updated.sleepHours || 7.2) + 0.6);
  }

  savePersistentMetrics(updated);
  clearHealthCache();
}

export async function fetchHealthData(): Promise<CombinedHealthState> {
  const cached = loadCache();
  if (cached) {
    return {
      metrics: cached,
      source: cached.source as DataSource,
      hasRing: bleRingService.isConnected(),
      hasHealthApp: cached.source === 'healthkit' || cached.source === 'healthconnect',
      loading: false,
    };
  }

  const hasRing = bleRingService.isAvailable() && bleRingService.isConnected();
  const hasHealthApp = healthService.isNative() && await healthService.isAvailable();

  let ringMetrics: HealthMetrics = { ...EMPTY_METRICS, source: 'ring' };
  let healthAppMetrics: HealthMetrics = { ...EMPTY_METRICS, source: 'none' };

  const tasks: Promise<void>[] = [];

  if (hasRing) {
    tasks.push(bleRingService.getMetrics().then(m => { ringMetrics = m; }));
  }

  if (hasHealthApp) {
    tasks.push(healthService.getMetrics().then(m => { healthAppMetrics = m; }));
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  const baseMetrics = getPersistentMetrics();
  let merged = mergeMetrics(healthAppMetrics, ringMetrics);

  if (merged.hrv === null && merged.sleepHours === null) {
    merged = baseMetrics;
  } else {
    savePersistentMetrics(merged);
  }

  const source: DataSource = merged.source === 'none' ? 'none' : merged.source as DataSource;

  saveCache(merged);

  return {
    metrics: merged,
    source,
    hasRing,
    hasHealthApp,
    loading: false,
  };
}

export function getCachedHealthData(): HealthMetrics {
  return loadCache() || { ...EMPTY_METRICS };
}

export function clearHealthCache() {
  localStorage.removeItem(CACHE_KEY);
}
