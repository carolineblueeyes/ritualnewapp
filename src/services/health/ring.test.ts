import test from 'node:test';
import assert from 'node:assert/strict';
import type { RingDailySummary } from './x6RingPlugin';
import { selectRecentSleepHours } from './ring';

function summary(overrides: Partial<RingDailySummary> = {}): RingDailySummary {
  return {
    date: '2026-07-28', hrv: null, sleepHours: null, steps: null, restingHR: null,
    spo2: null, temperature: null, distance: null, calories: null, activeMinutes: null,
    heartRateMin: null, heartRateMax: null, spo2Min: null, spo2Max: null,
    temperatureMin: null, temperatureMax: null, sleepStart: null, sleepEnd: null,
    sleepStages: [], sleepIntervals: [], workouts: [], batteryLevel: 80, lastSync: null,
    ...overrides,
  };
}

test('uses sleep recorded under the previous date when it ended recently', () => {
  const previous = summary({
    date: '2026-07-27',
    sleepHours: 7.5,
    sleepEnd: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  });
  assert.equal(selectRecentSleepHours(summary(), previous), 7.5);
});

test('does not replace today sleep with an older previous-day session', () => {
  const previous = summary({
    date: '2026-07-27',
    sleepHours: 8,
    sleepEnd: new Date(Date.now() - 40 * 3_600_000).toISOString(),
  });
  assert.equal(selectRecentSleepHours(summary(), previous), null);
  assert.equal(selectRecentSleepHours(summary({ sleepHours: 6.75 }), previous), 6.75);
});
