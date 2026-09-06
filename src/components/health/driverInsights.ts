import type { ShineDriver, ShineState, ShineTrend } from '../../services/health/shine';

const DRIVER_LABELS: Record<ShineDriver, string> = {
  sleep: 'Сон',
  hrv: 'ВСР',
  restingHR: 'Пульс покоя',
  activity: 'Активность',
  respiratoryRate: 'Дыхание',
  temperature: 'Температура',
};

function scoreTone(score: number | undefined, shineState: ShineState): 'positive' | 'neutral' | 'negative' {
  if (score === undefined) return 'neutral';
  if (shineState === 'shining' || score >= 65) return 'positive';
  if (shineState === 'overload' || score <= 35) return 'negative';
  return 'neutral';
}

function trendSuffix(trend: ShineTrend): string {
  if (trend === 'declining') return ' — тренд снижается';
  if (trend === 'improving') return ' — тренд улучшается';
  return '';
}

export function getDriverInsight(
  driver: ShineDriver,
  score: number | undefined,
  shineState: ShineState,
  trend: ShineTrend = 'unknown',
): string {
  const label = DRIVER_LABELS[driver];
  const tone = scoreTone(score, shineState);
  const suffix = trendSuffix(trend);

  if (tone === 'positive') {
    if (driver === 'sleep') return `Качественный сон усиливает Сияние${suffix}.`;
    if (driver === 'hrv') return `Высокая ${label} поддерживает восстановление${suffix}.`;
    if (driver === 'activity') return `Движение в норме — ресурс для дня${suffix}.`;
    return `${label} сейчас поддерживает баланс${suffix}.`;
  }

  if (tone === 'negative') {
    if (driver === 'sleep') return `Короткий сон снижает Сияние — добавь восстановление${suffix}.`;
    if (driver === 'hrv') return `Низкая ${label} — телу нужна пауза${suffix}.`;
    if (driver === 'restingHR') return `Пульс выше обычного — снизь нагрузку${suffix}.`;
    if (driver === 'activity') return `Мало движения — мягкая активность поможет${suffix}.`;
    return `${label} тянет Сияние вниз${suffix}.`;
  }

  return `${label} влияет на Сияние умеренно${suffix}.`;
}

export function driverBorderColor(shineState: ShineState | undefined, role: 'primary' | 'secondary' | null): string | undefined {
  if (role !== 'primary') return undefined;
  if (shineState === 'shining' || shineState === 'balanced') return '#E6B85C';
  if (shineState === 'tense' || shineState === 'overload') return '#fbbf24';
  return '#94a3b8';
}

export const SHINE_DRIVER_TO_UI_KEY: Record<ShineDriver, string> = {
  sleep: 'sleep',
  hrv: 'hrv',
  restingHR: 'hr',
  activity: 'activity',
  respiratoryRate: 'resp',
  temperature: 'temp',
};
