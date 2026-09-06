export type HealthSection = 'shine' | 'sleep' | 'recovery' | 'activity' | 'body' | 'cycle' | 'ring';

export type HealthPeriod = 'day' | 'week' | 'month';

export type HealthStack = 'hub' | 'category';

export const HEALTH_SECTION_LABELS: Record<HealthSection, string> = {
  shine: 'Сияние',
  sleep: 'Сон',
  recovery: 'Восстановление',
  activity: 'Активность',
  body: 'Тело',
  cycle: 'Цикл',
  ring: 'Кольцо',
};

export const CATEGORY_SECTIONS: HealthSection[] = ['sleep', 'recovery', 'activity', 'body'];
