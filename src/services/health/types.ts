export type HealthSource = 'healthkit' | 'healthconnect' | 'ring' | 'none';

export interface HealthMetrics {
  hrv: number | null;
  sleepHours: number | null;
  steps: number | null;
  restingHR: number | null;
  spo2: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  source: HealthSource;
  lastSync: string | null;
}

export type HealthDataType =
  | 'hrv'
  | 'sleep'
  | 'steps'
  | 'restingHR'
  | 'spo2'
  | 'temperature'
  | 'respiratoryRate';

export const EMPTY_METRICS: HealthMetrics = {
  hrv: null,
  sleepHours: null,
  steps: null,
  restingHR: null,
  spo2: null,
  temperature: null,
  respiratoryRate: null,
  source: 'none',
  lastSync: null,
};

export const METRIC_META: Record<string, { label: string; unit: string; icon: string }> = {
  hrv: { label: 'ВСР (Покой)', unit: 'мс', icon: 'activity' },
  sleep: { label: 'Сон', unit: 'ч', icon: 'moon' },
  steps: { label: 'Активность', unit: 'шагов', icon: 'zap' },
  restingHR: { label: 'Пульс покоя', unit: 'уд/м', icon: 'heart' },
  spo2: { label: 'SpO₂', unit: '%', icon: 'eye' },
  temperature: { label: 'Температура', unit: '°C', icon: 'thermometer' },
  respiratoryRate: { label: 'Дыхание', unit: 'дых/мин', icon: 'wind' },
};
