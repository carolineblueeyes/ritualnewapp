import { Health, HealthDataType as CapgoHealthType } from '@capgo/capacitor-health';
import { HealthMetrics, EMPTY_METRICS } from './types';

const CAPGO_MAP: Record<string, CapgoHealthType> = {
  hrv: 'heartRateVariability',
  sleep: 'sleep',
  steps: 'steps',
  restingHR: 'restingHeartRate',
  spo2: 'oxygenSaturation',
  temperature: 'bodyTemperature',
  respiratoryRate: 'respiratoryRate',
};

function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

function getPlatform(): 'ios' | 'android' | 'web' {
  if (!isNative()) return 'web';
  return (window as any).Capacitor?.Platform?.toLowerCase() || 'web';
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

async function ensurePermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const types = Object.values(CAPGO_MAP);
    const readTypes = types as CapgoHealthType[];
    const status = await Health.requestAuthorization({ read: readTypes });
    return status.readAuthorized.length > 0;
  } catch {
    return false;
  }
}

async function readMetric(type: string): Promise<number | null> {
  if (!isNative()) return null;
  const capgoType = CAPGO_MAP[type];
  if (!capgoType) return null;

  try {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);

    if (type === 'sleep') {
      const result = await Health.readSamples({
        dataType: capgoType,
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        limit: 100,
      });
      if (!result.samples || result.samples.length === 0) return null;

      let totalMinutes = 0;
      for (const sample of result.samples) {
        if (sample.sleepState === 'asleep' || sample.sleepState === 'deep' || sample.sleepState === 'rem' || sample.sleepState === 'light') {
          const duration = new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();
          totalMinutes += duration / 60000;
        }
      }
      return Math.round((totalMinutes / 60) * 10) / 10;
    }

    const result = await Health.readSamples({
      dataType: capgoType,
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      limit: 20,
      ascending: false,
    });

    if (!result.samples || result.samples.length === 0) return null;

    const latest = result.samples[0];
    const val = latest.value;

    if (type === 'hrv' || type === 'restingHR' || type === 'respiratoryRate') {
      return Math.round(val);
    }
    if (type === 'spo2') {
      return Math.round(val * 10) / 10;
    }
    if (type === 'temperature') {
      return Math.round(val * 10) / 10;
    }
    return Math.round(val);
  } catch (err) {
    console.warn(`[HealthService] Failed to read ${type}:`, err);
    return null;
  }
}

export const healthService = {
  isNative,

  getPlatform,

  isAvailable: checkAvailable,

  async getMetrics(): Promise<HealthMetrics> {
    if (!isNative()) {
      return { ...EMPTY_METRICS, source: 'none' };
    }

    const available = await checkAvailable();
    if (!available) {
      return { ...EMPTY_METRICS, source: 'none' };
    }

    const granted = await ensurePermissions();
    if (!granted) {
      return { ...EMPTY_METRICS, source: 'none' };
    }

    const platform = getPlatform();
    const source = platform === 'ios' ? 'healthkit' : 'healthconnect';

    const [hrv, sleepHours, steps, restingHR, spo2, temperature, respiratoryRate] =
      await Promise.all([
        readMetric('hrv'),
        readMetric('sleep'),
        readMetric('steps'),
        readMetric('restingHR'),
        readMetric('spo2'),
        readMetric('temperature'),
        readMetric('respiratoryRate'),
      ]);

    return {
      hrv,
      sleepHours,
      steps,
      restingHR,
      spo2,
      temperature,
      respiratoryRate,
      source,
      lastSync: new Date().toISOString(),
    };
  },

  async requestPermissions(): Promise<boolean> {
    return ensurePermissions();
  },
};
