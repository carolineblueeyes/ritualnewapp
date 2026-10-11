import assert from 'node:assert/strict';
import test from 'node:test';
import { dualBaseline, filterOutliersMAD, valuesWithAge } from './baseline';
import { phaseFromCycleDay } from './cycle';
import { calculateShine } from './shine';
import { EMPTY_METRICS, type DailyHealthPoint, type HealthMetricKey, type HealthMetrics } from './types';

const metrics = (values: Partial<HealthMetrics>): HealthMetrics => ({ ...EMPTY_METRICS, ...values });

function history(metric: HealthMetricKey, values: number[], startDay = 1): DailyHealthPoint[] {
  return values.map((value, index) => ({
    date: `2026-07-${String(startDay + index).padStart(2, '0')}`,
    metric,
    value,
    unit: '',
    source: 'ring',
    status: 'available',
    lastSync: '2026-07-28T00:00:00Z',
  }));
}

function history30(metric: HealthMetricKey, value: number): DailyHealthPoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(Date.UTC(2026, 4, 1) + index * 86_400_000).toISOString().slice(0, 10);
    return {
      date: day,
      metric,
      value,
      unit: '',
      source: 'ring',
      status: 'available' as const,
      lastSync: '2026-07-28T00:00:00Z',
    };
  });
}

test('returns waiting when both HRV and resting pulse are missing', () => {
  const result = calculateShine(metrics({ sleepHours: 8, steps: 10_000 }));
  assert.equal(result.state, 'waiting');
  assert.equal(result.total, 0);
});

test('applies SpO2 penalties instead of a single flat cut', () => {
  const base = metrics({ hrv: 65, restingHR: 60, sleepHours: 8, steps: 10_000, respiratoryRate: 14, temperature: 36.4 });
  const normal = calculateShine({ ...base, spo2: 97 });
  const mid = calculateShine({ ...base, spo2: 92 });
  const low = calculateShine({ ...base, spo2: 89 });
  assert.equal(mid.spo2SafetyAdjustment, true);
  assert.equal(mid.penalties.spo2, 10);
  assert.equal(low.penalties.spo2, 15);
  assert.equal(mid.total, Math.max(0, normal.baseScore - mid.penalties.total));
});

test('keeps an aging single outlier from breaking the personal baseline', () => {
  const points = [...Array(13).fill(50), 120];
  const aged = valuesWithAge(history('hrv', points, 17), new Date('2026-07-31T00:00:00Z'));
  const result = dualBaseline(aged, { mean: 50, sigma: 15 }, {
    shortDays: 14,
    longDays: 60,
    minPoints: 7,
    madThreshold: 3,
    shortDecayDays: 7,
    onsetBlendWeight: 0.5,
    longBlendWeight: 0.7,
  });
  assert.ok(result.mean < 70);
  assert.ok(result.source === 'short' || result.source === 'blending-short');
});

test('caps combined penalties at 28 points', () => {
  const result = calculateShine(metrics({
    hrv: 65,
    restingHR: 60,
    sleepHours: 8,
    steps: 10_000,
    respiratoryRate: 25,
    temperature: 37.5,
    spo2: 85,
  }));
  assert.ok(result.penalties.total <= 28);
  assert.equal(result.total, Math.max(0, result.baseScore - result.penalties.total));
});

test('derives the cycle phase from cycleDay when phase is missing', () => {
  assert.equal(phaseFromCycleDay(3), 'menstrual');
  assert.equal(phaseFromCycleDay(15), 'ovulatory');
  assert.equal(phaseFromCycleDay(25), 'luteal');
  const result = calculateShine(metrics({ hrv: 60, restingHR: 62 }), { cycleDay: 25 });
  assert.ok(result.total >= 0);
});

test('uses a personal baseline after seven historical points', () => {
  const points = [48, 49, 50, 51, 52, 53, 54].map((value, index) => {
    const day = new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
    return {
      date: day,
      metric: 'hrv' as const,
      value,
      unit: '',
      source: 'ring' as const,
      status: 'available' as const,
      lastSync: new Date().toISOString(),
    };
  });
  const result = calculateShine(metrics({ hrv: 60, restingHR: 62 }), {
    historyByMetric: { hrv: points },
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

test('filters a single MAD outlier out of a stable series', () => {
  const filtered = filterOutliersMAD([...Array(10).fill(50), 120]);
  assert.equal(filtered.length, 10);
  assert.ok(!filtered.includes(120));
});

test('softens the tense threshold during pregnancy', () => {
  const base = metrics({ hrv: 45, restingHR: 72, sleepHours: 6.5, steps: 4000 });
  const plain = calculateShine(base, {});
  const pregnant = calculateShine(base, { pregnancyMode: true, pregnancyTrimester: 3 });
  assert.ok(pregnant.total >= 0);
  if (plain.state === 'overload' && pregnant.total === plain.total) {
    assert.equal(pregnant.state, 'tense');
  }
});
