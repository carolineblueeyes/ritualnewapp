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

export async function fetchHealthData(): Promise<CombinedHealthState> {
  const useDemo = typeof window !== 'undefined' ? localStorage.getItem('ritual_use_demo_metrics') !== 'false' : true;
  if (useDemo) {
    const demo: HealthMetrics = {
      hrv: 64,
      sleepHours: 7.8,
      steps: 10420,
      restingHR: 58,
      spo2: 98,
      temperature: 36.5,
      respiratoryRate: 13.5,
      source: 'ring',
      lastSync: new Date().toISOString(),
    };
    return {
      metrics: demo,
      source: 'ring',
      hasRing: true,
      hasHealthApp: false,
      loading: false,
    };
  }

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

  const merged = mergeMetrics(healthAppMetrics, ringMetrics);
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
