import { Health, HealthDataType as CapgoHealthType, HealthSample } from '@capgo/capacitor-health';
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
  MetricAvailability,
} from './types';

const CAPGO_MAP: Record<HealthMetricKey, CapgoHealthType> = {
  hrv: 'heartRateVariability',
  sleepHours: 'sleep',
  steps: 'steps',
  restingHR: 'restingHeartRate',
  spo2: 'oxygenSaturation',
  temperature: 'bodyTemperature',
  respiratoryRate: 'respiratoryRate',
};

const UNIT_MAP: Record<HealthMetricKey, string> = {
  hrv: 'ms',
  sleepHours: 'h',
  steps: 'count',
  restingHR: 'bpm',
  spo2: '%',
  temperature: '°C',
  respiratoryRate: 'br/min',
};

const AGGREGATED_METRICS: HealthMetricKey[] = ['steps', 'restingHR'];

function cloneHistory(): HealthHistoryByMetric {
  return {
    hrv: [],
    sleepHours: [],
    steps: [],
    restingHR: [],
    spo2: [],
    temperature: [],
    respiratoryRate: [],
  };
}

function cloneAvailability(status: MetricAvailability = 'unavailable'): HealthAvailabilityByMetric {
  return HEALTH_METRIC_KEYS.reduce((acc, key) => {
    acc[key] = status;
    return acc;
  }, { ...EMPTY_AVAILABILITY_BY_METRIC });
}

function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

function getPlatform(): 'ios' | 'android' | 'web' {
  if (!isNative()) return 'web';
  return (window as any).Capacitor?.getPlatform?.() || (window as any).Capacitor?.Platform?.toLowerCase?.() || 'web';
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days = 7): { start: Date; end: Date; keys: string[] } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    keys.push(toDateKey(d));
  }

  return { start, end, keys };
}

function roundMetric(metric: HealthMetricKey, value: number): number {
  if (metric === 'sleepHours' || metric === 'spo2' || metric === 'temperature' || metric === 'respiratoryRate') {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

function latestValue(points: DailyHealthPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i].value;
    if (value !== null && points[i].status === 'available') return value;
  }
  return null;
}

function dailyPoint(
  date: string,
  metric: HealthMetricKey,
  value: number | null,
  status: MetricAvailability,
  source: HealthMetrics['source'],
  lastSync: string
): DailyHealthPoint {
  return {
    date,
    metric,
    value,
    unit: UNIT_MAP[metric],
    source,
    status,
    lastSync,
  };
}

async function checkAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const result = await Health.isAvailable();
    return result.available;
  } catch {
    return false;
  }
}

async function requestPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await Health.requestAuthorization({
      read: Object.values(CAPGO_MAP),
      requestHistoryAccess: getPlatform() === 'android',
    });
    return status.readAuthorized.length > 0;
  } catch {
    return false;
  }
}

async function getAuthorizationAvailability(): Promise<HealthAvailabilityByMetric> {
  if (!isNative()) return cloneAvailability('unsupported');
  try {
    const status = await Health.checkAuthorization({
      read: Object.values(CAPGO_MAP),
      requestHistoryAccess: getPlatform() === 'android',
    });
    const next = cloneAvailability('permission_denied');
    for (const key of HEALTH_METRIC_KEYS) {
      next[key] = status.readAuthorized.includes(CAPGO_MAP[key]) ? 'no_recent_data' : 'permission_denied';
    }
    return next;
  } catch {
    return cloneAvailability('unavailable');
  }
}

async function readAggregatedMetric(
  metric: HealthMetricKey,
  source: HealthMetrics['source'],
  dates: string[],
  start: Date,
  end: Date,
  lastSync: string,
  initialStatus: MetricAvailability
): Promise<DailyHealthPoint[]> {
  if (initialStatus === 'permission_denied' || initialStatus === 'unsupported') {
    return dates.map(date => dailyPoint(date, metric, null, initialStatus, source, lastSync));
  }

  try {
    const result = await Health.queryAggregated({
      dataType: CAPGO_MAP[metric],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: 'day',
      aggregation: metric === 'steps' ? 'sum' : 'average',
    });
    const values = new Map<string, number>();
    for (const sample of result.samples || []) {
      values.set(sample.startDate.slice(0, 10), roundMetric(metric, sample.value));
    }
    return dates.map(date => {
      const value = values.get(date) ?? null;
      return dailyPoint(date, metric, value, value === null ? 'no_recent_data' : 'available', source, lastSync);
    });
  } catch {
    return dates.map(date => dailyPoint(date, metric, null, 'unavailable', source, lastSync));
  }
}

function sampleBelongsToDate(sample: HealthSample): string {
  return sample.startDate.slice(0, 10);
}

function aggregateSamples(metric: HealthMetricKey, samples: HealthSample[]): Map<string, number> {
  const grouped = new Map<string, number[]>();

  for (const sample of samples) {
    if (metric === 'sleepHours') {
      const sleepState = sample.sleepState;
      const isAsleep = sleepState === 'asleep' || sleepState === 'deep' || sleepState === 'rem' || sleepState === 'light';
      if (!isAsleep) continue;
      const minutes = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / 60000;
      const date = sample.endDate.slice(0, 10);
      grouped.set(date, [...(grouped.get(date) || []), minutes / 60]);
      continue;
    }

    const value = sample.value;
    if (!Number.isFinite(value)) continue;
    const date = sampleBelongsToDate(sample);
    grouped.set(date, [...(grouped.get(date) || []), value]);
  }

  const daily = new Map<string, number>();
  for (const [date, values] of grouped) {
    const total = values.reduce((sum, value) => sum + value, 0);
    const value = metric === 'sleepHours' ? total : total / values.length;
    daily.set(date, roundMetric(metric, value));
  }
  return daily;
}

async function readSampleMetric(
  metric: HealthMetricKey,
  source: HealthMetrics['source'],
  dates: string[],
  start: Date,
  end: Date,
  lastSync: string,
  initialStatus: MetricAvailability
): Promise<DailyHealthPoint[]> {
  if (initialStatus === 'permission_denied' || initialStatus === 'unsupported') {
    return dates.map(date => dailyPoint(date, metric, null, initialStatus, source, lastSync));
  }

  try {
    const result = await Health.readSamples({
      dataType: CAPGO_MAP[metric],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 500,
      ascending: true,
    });
    const values = aggregateSamples(metric, result.samples || []);
    return dates.map(date => {
      const value = values.get(date) ?? null;
      return dailyPoint(date, metric, value, value === null ? 'no_recent_data' : 'available', source, lastSync);
    });
  } catch {
    return dates.map(date => dailyPoint(date, metric, null, 'unavailable', source, lastSync));
  }
}

export const healthService = {
  isNative,

  getPlatform,

  isAvailable: checkAvailable,

  async getSnapshot(days = 7): Promise<HealthSnapshot> {
    if (!isNative()) {
      return {
        metrics: { ...EMPTY_METRICS, source: 'none' },
        historyByMetric: { ...EMPTY_HISTORY_BY_METRIC },
        availabilityByMetric: cloneAvailability('unsupported'),
        source: 'none',
        lastSync: null,
      };
    }

    const available = await checkAvailable();
    if (!available) {
      return {
        metrics: { ...EMPTY_METRICS, source: 'none' },
        historyByMetric: { ...EMPTY_HISTORY_BY_METRIC },
        availabilityByMetric: cloneAvailability('unsupported'),
        source: 'none',
        lastSync: null,
      };
    }

    const source: HealthMetrics['source'] = getPlatform() === 'ios' ? 'healthkit' : 'healthconnect';
    const { start, end, keys } = getDateRange(days);
    const lastSync = new Date().toISOString();
    const availabilityByMetric = await getAuthorizationAvailability();
    const historyByMetric = cloneHistory();

    await Promise.all(HEALTH_METRIC_KEYS.map(async metric => {
      historyByMetric[metric] = AGGREGATED_METRICS.includes(metric)
        ? await readAggregatedMetric(metric, source, keys, start, end, lastSync, availabilityByMetric[metric])
        : await readSampleMetric(metric, source, keys, start, end, lastSync, availabilityByMetric[metric]);
    }));

    for (const metric of HEALTH_METRIC_KEYS) {
      availabilityByMetric[metric] = historyByMetric[metric].some(point => point.status === 'available')
        ? 'available'
        : historyByMetric[metric][0]?.status || availabilityByMetric[metric];
    }

    const metrics: HealthMetrics = {
      hrv: latestValue(historyByMetric.hrv),
      sleepHours: latestValue(historyByMetric.sleepHours),
      steps: latestValue(historyByMetric.steps),
      restingHR: latestValue(historyByMetric.restingHR),
      spo2: latestValue(historyByMetric.spo2),
      temperature: latestValue(historyByMetric.temperature),
      respiratoryRate: latestValue(historyByMetric.respiratoryRate),
      source,
      lastSync,
    };

    return {
      metrics,
      historyByMetric,
      availabilityByMetric,
      source,
      lastSync,
    };
  },

  async getMetrics(): Promise<HealthMetrics> {
    const snapshot = await this.getSnapshot();
    return snapshot.metrics;
  },

  async requestPermissions(): Promise<boolean> {
    return requestPermissions();
  },
};
