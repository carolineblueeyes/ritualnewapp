import assert from 'node:assert/strict';
import test from 'node:test';
import {
  averageMidpoint,
  bedtimeWindow,
  enrichSleepFromSummary,
  midpointHours,
  midpointStd,
  sleepDebt,
} from './sleep';
import { aggregateSleepNights } from './health.service';
import type { RingDailySummary } from './x6RingPlugin';

function summary(overrides: Partial<RingDailySummary> = {}): RingDailySummary {
  return {
    date: '2026-10-11',
    hrv: 55,
    sleepHours: 8,
    steps: 8000,
    restingHR: 60,
    spo2: 97,
    temperature: 36.5,
    distance: null,
    calories: null,
    activeMinutes: 30,
    heartRateMin: 48,
    heartRateMax: 110,
    spo2Min: null,
    spo2Max: null,
    temperatureMin: null,
    temperatureMax: null,
    sleepStart: '2026-10-10T23:00:00',
    sleepEnd: '2026-10-11T07:00:00',
    sleepStages: [
      { stage: 'light', minutes: 300 },
      { stage: 'deep', minutes: 96 },
      { stage: 'rem', minutes: 84 },
    ],
    sleepIntervals: [
      { start: '2026-10-10T23:00:00', end: '2026-10-11T02:00:00', stage: 'light' },
      { start: '2026-10-11T02:00:00', end: '2026-10-11T02:10:00', stage: 'awake' },
      { start: '2026-10-11T02:10:00', end: '2026-10-11T07:00:00', stage: 'deep' },
    ],
    workouts: [],
    batteryLevel: 80,
    lastSync: '2026-10-11T07:05:00',
    ...overrides,
  };
}

test('midpoint of a regular night is 3:00', () => {
  assert.equal(midpointHours('2026-10-10T23:00:00', '2026-10-11T07:00:00'), 3);
});

test('midpoint returns null on bad input', () => {
  assert.equal(midpointHours(null, '2026-10-11T07:00:00'), null);
  assert.equal(midpointHours('2026-10-11T07:00:00', '2026-10-10T23:00:00'), null);
});

test('enrichment pulls stages, midpoint and efficiency from the ring summary', () => {
  const enriched = enrichSleepFromSummary(summary());
  assert.equal(enriched.sleepMidpointHours, 3);
  assert.equal(enriched.deepSleepPercent, 20);
  assert.equal(enriched.remSleepPercent, 17.5);
  assert.equal(enriched.sleepInterruptions, 1);
  assert.equal(enriched.sleepStart, '2026-10-10T23:00:00');
  assert.ok((enriched.sleepEfficiency ?? 0) > 80);
});

test('sleep debt sums a week of short nights', () => {
  const nights = Array.from({ length: 7 }, () => ({ sleepHours: 6.5, midpointHours: 3 }));
  assert.equal(sleepDebt(nights, 7.5), 7);
  assert.equal(sleepDebt([], 7.5), 0);
});

test('bedtime window centers on midpoint minus half the need', () => {
  const window = bedtimeWindow(8, 3);
  assert.equal(window?.from, '22:30');
  assert.equal(window?.to, '23:30');
  assert.equal(bedtimeWindow(8, null), null);
});

test('average midpoint needs at least four nights', () => {
  const nights = [
    { sleepHours: 8, midpointHours: 3 },
    { sleepHours: 8, midpointHours: 3.2 },
    { sleepHours: 8, midpointHours: 2.8 },
  ];
  assert.equal(averageMidpoint(nights), null);
  const full = [...nights, { sleepHours: 8, midpointHours: 3.1 }];
  assert.ok(Math.abs((averageMidpoint(full) ?? 0) - 3.025) < 0.001);
  assert.ok((midpointStd(full) ?? 0) > 0);
});

test('healthkit samples group into a night with stages and midpoint', () => {
  const nights = aggregateSleepNights([
    { startDate: '2026-10-10T23:00:00', endDate: '2026-10-11T02:00:00', sleepState: 'light', value: 0, dataType: 'sleep', unit: 'minute' },
    { startDate: '2026-10-11T02:00:00', endDate: '2026-10-11T02:10:00', sleepState: 'awake', value: 0, dataType: 'sleep', unit: 'minute' },
    { startDate: '2026-10-11T02:10:00', endDate: '2026-10-11T05:00:00', sleepState: 'deep', value: 0, dataType: 'sleep', unit: 'minute' },
    { startDate: '2026-10-11T05:00:00', endDate: '2026-10-11T07:00:00', sleepState: 'rem', value: 0, dataType: 'sleep', unit: 'minute' },
  ]);
  assert.equal(nights.length, 1);
  assert.equal(nights[0].date, '2026-10-11');
  assert.ok(Math.abs(nights[0].sleepHours - 7.8) < 0.1);
  assert.equal(nights[0].midpointHours, 3);
  assert.ok((nights[0].efficiency ?? 0) > 90);
  assert.equal(nights[0].wasoMinutes, 10);
});
