import type { ShineBreakdown } from '../../../services/health/shine';
import type { HealthMetrics } from '../../../services/health/types';
import type { RingDailySummary } from '../../../services/health/x6RingPlugin';
import {
  qualityHrv,
  qualityRestingHr,
  qualitySleepDurationRatio,
  qualitySleepEfficiency,
  qualitySleepLatency,
  qualitySpo2,
  qualitySteps,
  getQualityMeta,
  type QualityTier,
} from '../healthQuality';
import { sleepEfficiency, sleepLatencyMinutes, stageMinutes, totalSleepMinutes } from '../sleepUtils';
import type { HealthSection } from '../types';

export interface ShineDayCell {
  dateStr: string;
  shineScore: number | null;
  label: string;
  isToday: boolean;
}

export interface AttentionAlertItem {
  id: string;
  label: string;
  value: string;
  tier: QualityTier;
  section: HealthSection;
}

export interface SleepStripSegment {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  minutes: number;
  color: string;
  label: string;
}

const STAGE_COLORS: Record<SleepStripSegment['stage'], string> = {
  deep: '#6B46C1',
  light: '#8D4FFF',
  rem: '#38BDF8',
  awake: '#F59E6B',
};

const STAGE_LABELS: Record<SleepStripSegment['stage'], string> = {
  deep: 'Глубокий',
  light: 'Лёгкий',
  rem: 'REM',
  awake: 'Бодрств.',
};

export function shineCellColor(score: number | null): string {
  if (score === null) return 'rgba(242,239,232,0.08)';
  if (score >= 80) return 'rgba(123,198,126,0.85)';
  if (score >= 60) return 'rgba(230,184,92,0.85)';
  return 'rgba(232,104,90,0.85)';
}

export function buildSleepStripSegments(summary: RingDailySummary | null, fallbackHours: number | null): {
  totalMinutes: number;
  segments: SleepStripSegment[];
  goalMinutes: number;
} {
  const goalMinutes = 480;
  const segments: SleepStripSegment[] = [];

  if (summary) {
    (['deep', 'light', 'rem', 'awake'] as const).forEach(stage => {
      const minutes = stageMinutes(summary, stage);
      if (minutes > 0) {
        segments.push({
          stage,
          minutes,
          color: STAGE_COLORS[stage],
          label: STAGE_LABELS[stage],
        });
      }
    });
  }

  let totalMinutes = segments.filter(s => s.stage !== 'awake').reduce((sum, s) => sum + s.minutes, 0);
  if (totalMinutes <= 0 && fallbackHours !== null) {
    totalMinutes = Math.round(fallbackHours * 60);
  }
  if (totalMinutes <= 0 && summary?.sleepHours) {
    totalMinutes = Math.round(summary.sleepHours * 60);
  }

  return { totalMinutes, segments, goalMinutes };
}

export function buildRadarScores(shine?: ShineBreakdown): Array<{ key: string; label: string; score: number; section: HealthSection }> {
  return [
    { key: 'sleep', label: 'Сон', score: shine?.sleep ?? 0, section: 'sleep' },
    { key: 'hrv', label: 'ВСР', score: shine?.hrv ?? 0, section: 'recovery' },
    { key: 'activity', label: 'Активность', score: shine?.activity ?? 0, section: 'activity' },
    { key: 'hr', label: 'Пульс', score: shine?.restingHR ?? 0, section: 'recovery' },
  ];
}

export function buildAttentionAlerts(
  healthMetrics: HealthMetrics,
  sleepSummary: RingDailySummary | null,
): AttentionAlertItem[] {
  const alerts: AttentionAlertItem[] = [];

  const pushIfBad = (
    id: string,
    label: string,
    value: string,
    tier: QualityTier,
    section: HealthSection,
  ) => {
    if (tier >= 2) {
      alerts.push({ id, label, value, tier, section });
    }
  };

  if (healthMetrics.sleepHours !== null) {
    const ratio = healthMetrics.sleepHours / 8;
    pushIfBad(
      'sleep-duration',
      'Длительность сна',
      `${Math.floor(healthMetrics.sleepHours)}ч ${Math.round((healthMetrics.sleepHours % 1) * 60)}м`,
      qualitySleepDurationRatio(ratio),
      'sleep',
    );
  }

  if (sleepSummary) {
    const efficiency = sleepEfficiency(sleepSummary);
    if (efficiency !== null) {
      pushIfBad('sleep-efficiency', 'Эффективность сна', `${efficiency}%`, qualitySleepEfficiency(efficiency / 100), 'sleep');
    }
    const latency = sleepLatencyMinutes(sleepSummary);
    if (latency !== null) {
      pushIfBad('sleep-latency', 'Засыпание', `${latency} мин`, qualitySleepLatency(latency), 'sleep');
    }
  }

  if (healthMetrics.hrv !== null) {
    pushIfBad('hrv', 'ВСР', `${Math.round(healthMetrics.hrv)} мс`, qualityHrv(healthMetrics.hrv), 'recovery');
  }

  if (healthMetrics.restingHR !== null) {
    pushIfBad('hr', 'Пульс покоя', `${Math.round(healthMetrics.restingHR)} уд/м`, qualityRestingHr(healthMetrics.restingHR), 'recovery');
  }

  if (healthMetrics.steps !== null) {
    pushIfBad('steps', 'Шаги', healthMetrics.steps.toLocaleString('ru-RU'), qualitySteps(healthMetrics.steps), 'activity');
  }

  if (healthMetrics.spo2 !== null) {
    pushIfBad('spo2', 'SpO₂', `${Math.round(healthMetrics.spo2)}%`, qualitySpo2(healthMetrics.spo2), 'body');
  }

  return alerts.sort((a, b) => b.tier - a.tier);
}

export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
}

export function alertHeadline(alerts: AttentionAlertItem[]): { count: number; worstTier: QualityTier | null; label: string } {
  const bad = alerts.filter(a => a.tier === 3);
  const warn = alerts.filter(a => a.tier === 2);
  if (bad.length > 0) {
    return {
      count: bad.length,
      worstTier: 3,
      label: bad.length === 1 ? '1 показатель требует внимания' : `${bad.length} показателя требуют внимания`,
    };
  }
  if (warn.length > 0) {
    return {
      count: warn.length,
      worstTier: 2,
      label: warn.length === 1 ? '1 показатель приемлемый' : `${warn.length} показателя приемлемы`,
    };
  }
  return { count: 0, worstTier: 1, label: 'Все показатели в норме' };
}

export function tierAccent(tier: QualityTier | null): string {
  if (tier === null) return getQualityMeta(1).color;
  return getQualityMeta(tier).color;
}
