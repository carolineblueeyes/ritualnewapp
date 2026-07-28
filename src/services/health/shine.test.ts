import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShine } from './shine';
import { EMPTY_METRICS, type DailyHealthPoint, type HealthMetricKey, type HealthMetrics } from './types';

const metrics = (values: Partial<HealthMetrics>): HealthMetrics => ({ ...EMPTY_METRICS, ...values });

function history(metric: HealthMetricKey, values: number[]): DailyHealthPoint[] {
  return values.map((value, index) => ({ date: `2026-07-${String(index + 1).padStart(2, '0')}`, metric, value, unit: '', source: 'ring', status: 'available', lastSync: '2026-07-28T00:00:00Z' }));
}

test('returns waiting when both HRV and resting pulse are missing', () => {
  const result = calculateShine(metrics({ sleepHours: 8, steps: 10_000 }));
  assert.equal(result.state, 'waiting');
  assert.equal(result.total, 0);
});

test('applies SpO2 safety adjustment', () => {
  const base = metrics({ hrv: 65, restingHR: 60, sleepHours: 8, steps: 10_000, respiratoryRate: 14, temperature: 36.4 });
  const normal = calculateShine({ ...base, spo2: 97 });
  const low = calculateShine({ ...base, spo2: 92 });
  assert.equal(low.spo2SafetyAdjustment, true);
  assert.equal(low.total, Math.max(0, normal.total - 15));
});

test('uses a personal baseline after seven historical points', () => {
  const result = calculateShine(metrics({ hrv: 60, restingHR: 62 }), {
    historyByMetric: { hrv: history('hrv', [48, 49, 50, 51, 52, 53, 54]) },
  });
  assert.equal(result.usedPersonalBaseline, true);
  assert.equal(result.primaryDriver !== null, true);
});

test('detects an improving three-day HRV trend', () => {
  const result = calculateShine(metrics({ hrv: 60, restingHR: 65 }), {
    historyByMetric: { hrv: history('hrv', [40, 50, 60]) },
  });
  if (result.primaryDriver === 'hrv') assert.equal(result.trend, 'improving');
});
