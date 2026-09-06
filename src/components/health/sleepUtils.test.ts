import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeNightSleepIntervals, withMergedNightSleep } from './sleepUtils';
import type { RingDailySummary } from '../../services/health/x6RingPlugin';

test('merges two sleep bouts split by a short night waking', () => {
  const intervals = mergeNightSleepIntervals([
    { start: '2026-09-06T23:00:00.000Z', end: '2026-09-07T03:00:00.000Z', stage: 'light' },
    { start: '2026-09-07T03:12:00.000Z', end: '2026-09-07T07:15:00.000Z', stage: 'deep' },
  ]);
  assert.equal(intervals[0].start, '2026-09-06T23:00:00.000Z');
  assert.equal(intervals[intervals.length - 1].end, '2026-09-07T07:15:00.000Z');
  assert.ok(intervals.some(item => item.stage === 'awake'));
  const asleepMin = intervals
    .filter(item => item.stage !== 'awake')
    .reduce((sum, item) => sum + (new Date(item.end).getTime() - new Date(item.start).getTime()) / 60000, 0);
  assert.equal(asleepMin, 240 + 243);
});

test('does not glue an afternoon nap onto the previous night', () => {
  const intervals = mergeNightSleepIntervals([
    { start: '2026-09-06T23:00:00.000Z', end: '2026-09-07T07:00:00.000Z', stage: 'light' },
    { start: '2026-09-07T14:00:00.000Z', end: '2026-09-07T14:40:00.000Z', stage: 'light' },
  ]);
  assert.equal(intervals[intervals.length - 1].end, '2026-09-07T07:00:00.000Z');
});

test('withMergedNightSleep updates duration and bounds', () => {
  const summary = withMergedNightSleep({
    sleepHours: 4,
    sleepStart: '2026-09-06T23:00:00.000Z',
    sleepEnd: '2026-09-07T03:00:00.000Z',
    sleepStages: [{ stage: 'light', minutes: 240 }],
    sleepIntervals: [
      { start: '2026-09-06T23:00:00.000Z', end: '2026-09-07T03:00:00.000Z', stage: 'light' },
      { start: '2026-09-07T03:10:00.000Z', end: '2026-09-07T07:10:00.000Z', stage: 'rem' },
    ],
  } as Pick<RingDailySummary, 'sleepHours' | 'sleepStart' | 'sleepEnd' | 'sleepStages' | 'sleepIntervals'>);
  assert.ok(summary);
  assert.equal(summary.sleepEnd, '2026-09-07T07:10:00.000Z');
  assert.ok((summary.sleepHours ?? 0) > 7.9);
});
