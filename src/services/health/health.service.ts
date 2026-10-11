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
      // Ночь ложится на дату пробуждения — сон 23:00→07:00 это утро 07:00.
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

export interface AggregatedSleepNight {
  date: string;
  sleepHours: number;
  deepPercent: number | null;
  remPercent: number | null;
  midpointHours: number | null;
  efficiency: number | null;
  wasoMinutes: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
}

/** Группировка сэмплов сна по ночам: стадии, midpoint, efficiency, WASO. */
export function aggregateSleepNights(samples: HealthSample[]): AggregatedSleepNight[] {
  const byNight = new Map<string, HealthSample[]>();
  for (const sample of samples) {
    const state = sample.sleepState;
    if (state !== 'asleep' && state !== 'deep' && state !== 'rem' && state !== 'light' && state !== 'awake') continue;
    const date = sample.endDate.slice(0, 10);
    byNight.set(date, [...(byNight.get(date) || []), sample]);
  }

  const nights: AggregatedSleepNight[] = [];
  for (const [date, items] of byNight) {
    const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate));
    let asleepMin = 0;
    let deepMin = 0;
    let remMin = 0;
    let awakeMin = 0;
    for (const item of sorted) {
      const span = (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 60000;
      if (!Number.isFinite(span) || span <= 0) continue;
      if (item.sleepState === 'awake') {
        awakeMin += span;
        continue;
      }
      asleepMin += span;
      if (item.sleepState === 'deep') deepMin += span;
      if (item.sleepState === 'rem') remMin += span;
    }
    if (asleepMin <= 0) continue;
    const start = sorted[0].startDate;
    const end = sorted[sorted.length - 1].endDate;
    const bedMin = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    const midMs = (new Date(start).getTime() + new Date(end).getTime()) / 2;
    const mid = new Date(midMs);
    nights.push({
      date,
      sleepHours: Math.round((asleepMin / 60) * 10) / 10,
      deepPercent: Math.round(((deepMin / asleepMin) * 100) * 10) / 10,
      remPercent: Math.round(((remMin / asleepMin) * 100) * 10) / 10,
      midpointHours: Number.isFinite(midMs)
        ? mid.getHours() + mid.getMinutes() / 60 + mid.getSeconds() / 3600
        : null,
      efficiency: bedMin > 0 ? Math.min(100, Math.round((asleepMin / bedMin) * 100)) : null,
      wasoMinutes: awakeMin > 0 ? Math.round(awakeMin) : null,
      sleepStart: start,
      sleepEnd: end,
    });
  }
  return nights.sort((a, b) => a.date.localeCompare(b.date));
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
    let sleepNights: AggregatedSleepNight[] = [];

    await Promise.all(HEALTH_METRIC_KEYS.map(async metric => {
      if (metric === 'sleepHours') {
        // Сон разбираем отдельно: нужны стадии/midpoint, а не только часы.
        try {
          const result = await Health.readSamples({
            dataType: CAPGO_MAP.sleepHours,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            limit: Math.max(500, days * 30),
            ascending: true,
          });
          sleepNights = aggregateSleepNights(result.samples || []);
          const byDate = new Map(sleepNights.map(night => [night.date, night.sleepHours]));
          historyByMetric.sleepHours = keys.map(date => {
            const value = byDate.get(date) ?? null;
            return dailyPoint(date, metric, value, value === null ? 'no_recent_data' : 'available', source, lastSync);
          });
        } catch {
          historyByMetric.sleepHours = keys.map(date => dailyPoint(date, metric, null, 'unavailable', source, lastSync));
        }
        return;
      }
      historyByMetric[metric] = AGGREGATED_METRICS.includes(metric)
        ? await readAggregatedMetric(metric, source, keys, start, end, lastSync, availabilityByMetric[metric])
        : await readSampleMetric(metric, source, keys, start, end, lastSync, availabilityByMetric[metric]);
    }));

    for (const metric of HEALTH_METRIC_KEYS) {
      availabilityByMetric[metric] = historyByMetric[metric].some(point => point.status === 'available')
        ? 'available'
        : historyByMetric[metric][0]?.status || availabilityByMetric[metric];
    }

    const latestNight = sleepNights.filter(night => night.sleepHours > 0).slice(-1)[0] ?? null;
    const metrics: HealthMetrics = {
      hrv: latestValue(historyByMetric.hrv),
      sleepHours: latestValue(historyByMetric.sleepHours),
      steps: latestValue(historyByMetric.steps),
      restingHR: latestValue(historyByMetric.restingHR),
      spo2: latestValue(historyByMetric.spo2),
      temperature: latestValue(historyByMetric.temperature),
      respiratoryRate: latestValue(historyByMetric.respiratoryRate),
      deepSleepPercent: latestNight?.deepPercent ?? null,
      remSleepPercent: latestNight?.remPercent ?? null,
      sleepMidpointHours: latestNight?.midpointHours ?? null,
      sleepEfficiency: latestNight?.efficiency ?? null,
      sleepStart: latestNight?.sleepStart ?? null,
      sleepEnd: latestNight?.sleepEnd ?? null,
      wasoMinutes: latestNight?.wasoMinutes ?? null,
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
