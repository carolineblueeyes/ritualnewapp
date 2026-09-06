import type { RingDailySummary } from '../../services/health/x6RingPlugin';
import { APP_NAME, CORE_NAME } from '../../constants/brand';

export type SleepStageKey = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

export const SLEEP_STAGE_META: Record<SleepStageKey, { label: string; color: string }> = {
  awake: { label: 'Бодрствование', color: '#F59E6B' },
  light: { label: 'Лёгкий сон', color: '#8D4FFF' },
  deep: { label: 'Глубокий сон', color: '#6B46C1' },
  rem: { label: 'REM', color: '#38BDF8' },
  unknown: { label: 'Неизвестно', color: '#6B7280' },
};

export function stageMinutes(summary: RingDailySummary | null, stage: SleepStageKey): number {
  if (!summary?.sleepStages?.length) return 0;
  return summary.sleepStages
    .filter(item => item.stage === stage)
    .reduce((sum, item) => sum + item.minutes, 0);
}

export function totalSleepMinutes(summary: RingDailySummary | null): number {
  if (!summary) return 0;
  if (summary.sleepHours !== null && summary.sleepHours > 0) {
    return Math.round(summary.sleepHours * 60);
  }
  return ['light', 'deep', 'rem'].reduce((sum, stage) => sum + stageMinutes(summary, stage as SleepStageKey), 0);
}

export function timeInBedMinutes(summary: RingDailySummary | null): number {
  if (!summary?.sleepStart || !summary?.sleepEnd) return totalSleepMinutes(summary);
  const start = new Date(summary.sleepStart).getTime();
  const end = new Date(summary.sleepEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return totalSleepMinutes(summary);
  return Math.round((end - start) / 60_000);
}

export function sleepEfficiency(summary: RingDailySummary | null): number | null {
  const bed = timeInBedMinutes(summary);
  const asleep = totalSleepMinutes(summary);
  if (bed <= 0 || asleep <= 0) return null;
  return Math.min(100, Math.round((asleep / bed) * 100));
}

export function sleepLatencyMinutes(summary: RingDailySummary | null): number | null {
  if (!summary?.sleepIntervals?.length || !summary.sleepStart) return null;
  const firstAsleep = summary.sleepIntervals.find(item => item.stage !== 'awake');
  if (!firstAsleep) return null;
  const start = new Date(summary.sleepStart).getTime();
  const asleepAt = new Date(firstAsleep.start).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(asleepAt) || asleepAt <= start) return null;
  return Math.round((asleepAt - start) / 60_000);
}

/** Heuristic sleep score inspired by JCRing day view (duration + stages + efficiency). */
export function computeSleepScore(summary: RingDailySummary | null): number | null {
  const asleepMin = totalSleepMinutes(summary);
  if (asleepMin <= 0) return null;

  const hours = asleepMin / 60;
  let score = 55;

  if (hours >= 7 && hours <= 8.5) score += 18;
  else if (hours >= 6.5 && hours < 7) score += 10;
  else if (hours > 8.5 && hours <= 9.5) score += 8;
  else if (hours >= 5.5) score += 4;
  else score -= 8;

  const deep = stageMinutes(summary, 'deep');
  const rem = stageMinutes(summary, 'rem');
  const awake = stageMinutes(summary, 'awake');
  const deepPct = (deep / asleepMin) * 100;
  const remPct = (rem / asleepMin) * 100;
  const awakePct = (awake / Math.max(asleepMin + awake, 1)) * 100;

  if (deepPct >= 15 && deepPct <= 25) score += 12;
  else if (deepPct >= 10) score += 6;

  if (remPct >= 18 && remPct <= 28) score += 10;
  else if (remPct >= 12) score += 4;

  if (awakePct <= 8) score += 8;
  else if (awakePct <= 15) score += 2;
  else score -= 6;

  const efficiency = sleepEfficiency(summary);
  if (efficiency !== null) {
    if (efficiency >= 90) score += 8;
    else if (efficiency >= 80) score += 4;
    else if (efficiency < 70) score -= 6;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function sleepScoreLabel(score: number | null): string {
  if (score === null) return 'Нет данных';
  if (score >= 85) return 'Отличный сон';
  if (score >= 70) return 'Хороший сон';
  if (score >= 55) return 'Умеренный сон';
  return 'Сон ниже нормы';
}

export function sleepDurationLevel(hours: number | null): string {
  if (hours === null) return '—';
  if (hours >= 7 && hours <= 9) return 'Оптимально';
  if (hours >= 6) return 'Приемлемо';
  return 'Недостаточно';
}

export function sleepEfficiencyLevel(efficiency: number | null): string {
  if (efficiency === null) return '—';
  if (efficiency >= 90) return 'Отлично';
  if (efficiency >= 80) return 'Хорошо';
  if (efficiency >= 70) return 'Средне';
  return 'Низко';
}

export function sleepLatencyLevel(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes <= 15) return 'Быстро';
  if (minutes <= 30) return 'Норма';
  if (minutes <= 45) return 'Долго';
  return 'Очень долго';
}

export function avgHeartRateLevel(bpm: number | null): string {
  if (bpm === null) return '—';
  if (bpm <= 55) return 'Низкий';
  if (bpm <= 70) return 'Норма';
  if (bpm <= 85) return 'Повышен';
  return 'Высокий';
}

export function avgSpo2Level(spo2: number | null): string {
  if (spo2 === null) return '—';
  if (spo2 >= 97) return 'Отлично';
  if (spo2 >= 95) return 'Норма';
  return 'Снижено';
}

export function avgHrvLevel(ms: number | null): string {
  if (ms === null) return '—';
  if (ms >= 50) return 'Высокая';
  if (ms >= 35) return 'Норма';
  return 'Снижена';
}

export function sleepDescription(summary: RingDailySummary | null, score: number | null): string {
  const hours = summary?.sleepHours ?? (totalSleepMinutes(summary) / 60);
  if (hours === null || hours <= 0) {
    return `Подключите ${CORE_NAME} или Health Connect, чтобы ${APP_NAME} собрал ночной профиль с фазами и восстановлением.`;
  }
  if (score !== null && score >= 80) {
    return 'Ночь прошла в восстановительном режиме: длительность и структура сна поддерживают ресурс дня.';
  }
  if (score !== null && score >= 60) {
    return 'Сон в рабочей зоне. Следите за глубокими фазами и временем засыпания — они задают тон самочувствию.';
  }
  return 'Ночь была короче или прерывистее нормы. Сегодня лучше выбрать мягкий ритм и вечерний ритуал.';
}

export type NapSegment = { start: string; end: string; minutes: number };

const NIGHT_MERGE_GAP_MINUTES = 120;

type SleepInterval = {
  start: string;
  end: string;
  stage: SleepStageKey;
};

function intervalMs(item: SleepInterval): { start: number; end: number } | null {
  const start = new Date(item.start).getTime();
  const end = new Date(item.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

/** Stitch sleep fragments split by a short night waking (bathroom, rolling over). */
export function mergeNightSleepIntervals(
  intervals: SleepInterval[],
  maxGapMinutes = NIGHT_MERGE_GAP_MINUTES,
): SleepInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals]
    .map(item => {
      const span = intervalMs(item);
      if (!span) return null;
      return { ...item, startMs: span.start, endMs: span.end };
    })
    .filter((item): item is SleepInterval & { startMs: number; endMs: number } => item !== null)
    .sort((a, b) => a.startMs - b.startMs);

  const chained: Array<SleepInterval & { startMs: number; endMs: number }> = [];
  for (const item of sorted) {
    if (!chained.length) {
      chained.push({ ...item });
      continue;
    }
    const last = chained[chained.length - 1];
    const gapMinutes = (item.startMs - last.endMs) / 60_000;
    if (gapMinutes > maxGapMinutes) {
      chained.push({ ...item });
      continue;
    }
    if (gapMinutes > 0.5) {
      chained.push({
        start: last.end,
        end: item.start,
        stage: 'awake',
        startMs: last.endMs,
        endMs: item.startMs,
      });
    }
    chained.push({ ...item });
  }

  const clusters: Array<typeof chained> = [];
  let current: typeof chained = [];
  for (const item of chained) {
    if (!current.length) {
      current.push(item);
      continue;
    }
    const last = current[current.length - 1];
    if (item.startMs - last.endMs <= maxGapMinutes * 60_000) current.push(item);
    else {
      clusters.push(current);
      current = [item];
    }
  }
  if (current.length) clusters.push(current);

  const asleepOf = (cluster: typeof chained) =>
    cluster.reduce((sum, item) => sum + (item.stage === 'awake' ? 0 : (item.endMs - item.startMs) / 60_000), 0);
  const main = clusters.reduce((best, cluster) => (asleepOf(cluster) > asleepOf(best) ? cluster : best), clusters[0] ?? []);

  const collapsed: SleepInterval[] = [];
  for (const item of main) {
    const prev = collapsed[collapsed.length - 1];
    if (prev && prev.stage === item.stage && new Date(prev.end).getTime() >= item.startMs - 1000) {
      prev.end = item.end;
    } else {
      collapsed.push({ start: item.start, end: item.end, stage: item.stage });
    }
  }
  return collapsed;
}

export function withMergedNightSleep<T extends {
  sleepHours: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepStages: Array<{ stage: SleepStageKey; minutes: number }>;
  sleepIntervals: SleepInterval[];
}>(summary: T | null): T | null {
  if (!summary?.sleepIntervals?.length) return summary;
  const intervals = mergeNightSleepIntervals(summary.sleepIntervals);
  if (!intervals.length) return summary;

  const stages: Record<SleepStageKey, number> = { awake: 0, light: 0, deep: 0, rem: 0, unknown: 0 };
  for (const item of intervals) {
    const span = intervalMs(item);
    if (!span) continue;
    stages[item.stage] += Math.max(1, Math.round((span.end - span.start) / 60_000));
  }
  const asleep = stages.light + stages.deep + stages.rem + stages.unknown;
  return {
    ...summary,
    sleepIntervals: intervals,
    sleepStart: intervals[0].start,
    sleepEnd: intervals[intervals.length - 1].end,
    sleepHours: asleep > 0 ? asleep / 60 : summary.sleepHours,
    sleepStages: (Object.keys(stages) as SleepStageKey[]).map(stage => ({ stage, minutes: stages[stage] })),
  };
}

/** Short daytime/light segments treated as naps (JCRing lingxing). */
export function extractNapSegments(summary: RingDailySummary | null): NapSegment[] {
  if (!summary?.sleepIntervals?.length) return [];
  return summary.sleepIntervals
    .filter(item => item.stage === 'light' || item.stage === 'rem')
    .map(item => {
      const start = new Date(item.start).getTime();
      const end = new Date(item.end).getTime();
      const minutes = Math.round((end - start) / 60_000);
      return { start: item.start, end: item.end, minutes };
    })
    .filter(item => item.minutes >= 10 && item.minutes <= 120);
}
