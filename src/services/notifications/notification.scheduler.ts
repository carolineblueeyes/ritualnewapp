import { notificationService } from './notification.service';
import { NotificationType, STORAGE_KEYS } from './notification.types';

let reschedulePromise: Promise<void> | null = null;

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function stableNotificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000000000) + 100000;
}

const MANAGED_REMINDER_TYPES = new Set<string>([
  NotificationType.PracticeReminder,
  NotificationType.PracticeSoon,
  NotificationType.StreakWarning,
  NotificationType.IntentionReminder,
  NotificationType.FocusBreak,
  NotificationType.SessionComplete,
  NotificationType.HealthInsight,
  NotificationType.SocialInvite,
  NotificationType.SubscriptionExpiring,
]);

function getTimelineSlots(): { id: string; time: string; practiceId: string }[] {
  try {
    return JSON.parse(localStorage.getItem('ritual_day_slots') || '[]');
  } catch {
    return [];
  }
}

function getStoredManagedReminderIds(): number[] {
  try {
    const scheduled = JSON.parse(localStorage.getItem(STORAGE_KEYS.scheduled) || '[]');
    if (!Array.isArray(scheduled)) return [];

    return scheduled
      .filter((notification: any) => MANAGED_REMINDER_TYPES.has(String(notification.type)))
      .map((notification: any) => Number(notification.id))
      .filter(Number.isFinite);
  } catch {
    return [];
  }
}

function getManagedReminderIds(): number[] {
  const slotIds = getTimelineSlots().flatMap((slot) => [
    stableNotificationId(`practice:${slot.id}`),
    stableNotificationId(`practice-soon:${slot.id}`),
  ]);

  return [
    ...getStoredManagedReminderIds(),
    ...slotIds,
    stableNotificationId('streak-warning'),
    stableNotificationId('intention-reminder'),
  ];
}

function getCompletedSlots(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(`ritual_completed_slots_${todayKey()}`);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.reduce((acc: Record<string, boolean>, id: string) => {
        acc[id] = true;
        return acc;
      }, {});
    }
    return parsed || {};
  } catch {
    return {};
  }
}

function getPracticeName(practiceId: string): string {
  if (!practiceId) return '';
  try {
    const practices = JSON.parse(localStorage.getItem('ritual_practices') || '[]');
    const found = practices.find((p: any) => p.id === practiceId);
    return found?.title || practiceId;
  } catch {
    return practiceId;
  }
}

function parseTodayTime(timeHHMM: string, now = new Date()): Date | null {
  const [hours, minutes] = timeHHMM.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function subtractMinutesFromTime(timeHHMM: string, minutesToSubtract: number): string {
  const [h, m] = timeHHMM.split(':').map(Number);
  let totalMinutes = h * 60 + m - minutesToSubtract;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export async function scheduleTimelineReminders(): Promise<void> {
  const slots = getTimelineSlots();
  const completed = getCompletedSlots();
  const now = new Date();

  for (const slot of slots) {
    if (!slot.practiceId || !slot.time) continue;

    const practiceName = getPracticeName(slot.practiceId);
    const isCompleted = !!completed[slot.id];

    // If already completed today, no reminders for this slot
    if (isCompleted) {
      continue;
    }

    const slotDateTime = parseTodayTime(slot.time, now);
    if (!slotDateTime || slotDateTime <= now) {
      continue;
    }

    const soonTime = subtractMinutesFromTime(slot.time, 7);
    const soonDateTime = parseTodayTime(soonTime, now);

    await notificationService.scheduleAtDate(
      {
        id: stableNotificationId(`practice:${slot.id}`),
        type: NotificationType.PracticeReminder,
        title: 'Пора практиковаться',
        body: `Сегодня: ${practiceName}`,
        data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
      },
      slotDateTime,
    );

    if (soonDateTime && soonDateTime > now) {
      await notificationService.scheduleAtDate(
        {
          id: stableNotificationId(`practice-soon:${slot.id}`),
          type: NotificationType.PracticeSoon,
          title: 'Скоро начало практики',
          body: `Через 7 минут начнется практика: ${practiceName}`,
          data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
        },
        soonDateTime,
      );
    }
  }
}

export async function scheduleStreakReminder(): Promise<void> {
  const streakStr = localStorage.getItem('ritual_stats');
  if (!streakStr) return;

  let stats: any;
  try {
    stats = JSON.parse(streakStr);
    if (!stats.streakDays || stats.streakDays <= 0) return;
  } catch {
    return;
  }

  const reminderTime = localStorage.getItem(STORAGE_KEYS.reminderTime) || '21:00';

  // Check if they completed any practice today
  const history = stats.history || [];
  const completedToday = history.some((h: any) => h.date && h.date.startsWith('Сегодня'));

  // If already completed today, schedule a one-shot warning for tomorrow
  if (completedToday) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetTime = new Date(`${tomorrow.toISOString().split('T')[0]}T${reminderTime}:00`);
    const delay = (targetTime.getTime() - new Date().getTime()) / 1000;
    if (delay > 0) {
      await notificationService.scheduleLocal(
        {
          id: stableNotificationId('streak-warning'),
          type: NotificationType.StreakWarning,
          title: 'Не прерывайте серию!',
          body: 'Сегодня вы ещё не практиковались. Не теряйте свой прогресс!',
          data: { screen: 'Dashboard' },
        },
        delay,
      );
    }
    return;
  }

  // If not completed today, schedule a daily repeating warning
  const now = new Date();
  const targetTime = new Date(`${now.toISOString().split('T')[0]}T${reminderTime}:00`);
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  const delay = (targetTime.getTime() - now.getTime()) / 1000;
  await notificationService.scheduleLocal(
    {
      id: stableNotificationId('streak-warning'),
      type: NotificationType.StreakWarning,
      title: 'Не прерывайте серию!',
      body: 'Сегодня вы ещё не практиковались. Не теряйте свой прогресс!',
      data: { screen: 'Dashboard' },
    },
    delay,
  );
}

export async function scheduleFocusBreak(workMinutes: number): Promise<number | null> {
  if (!Number.isFinite(workMinutes) || workMinutes <= 0) return null;

  const delay = workMinutes * 60;
  return notificationService.scheduleLocal(
    {
      type: NotificationType.FocusBreak,
      title: 'Время для перерыва',
      body: `Вы поработали ${workMinutes} минут. Отдохните!`,
      data: { screen: 'FocusTool' },
    },
    delay,
  );
}

export async function scheduleSessionComplete(type: string, durationMin: number): Promise<number | null> {
  if (!Number.isFinite(durationMin) || durationMin <= 0) return null;

  const label = type === 'breathing' ? 'Дыхание' : 'Атмосфера';
  return notificationService.scheduleLocal(
    {
      type: NotificationType.SessionComplete,
      title: 'Сессия завершена',
      body: `${label}: ${durationMin} минут. Отличная работа!`,
      data: { screen: type === 'breathing' ? 'BreathingTool' : 'AtmosphereTool' },
    },
    1,
  );
}

export async function scheduleHealthInsight(hrvChange: number): Promise<number | null> {
  if (!Number.isFinite(hrvChange) || hrvChange === 0) return null;

  const lastDate = localStorage.getItem(STORAGE_KEYS.lastHealthPush);
  if (lastDate === todayKey()) return null;

  const direction = hrvChange > 0 ? 'вырос' : 'снизился';
  const abs = Math.abs(hrvChange);
  const msg = abs > 10
    ? `Ваш HRV ${direction} на ${abs}% — ${hrvChange > 0 ? 'отличное восстановление' : 'стоит обратить внимание'}`
    : `Показатели стабильны. HRV ${direction} на ${abs}%`;

  localStorage.setItem(STORAGE_KEYS.lastHealthPush, todayKey());
  return notificationService.scheduleLocal(
    {
      type: NotificationType.HealthInsight,
      title: 'Данные здоровья обновлены',
      body: msg,
      data: { screen: 'Dashboard' },
    },
    5,
  );
}

export async function scheduleSocialInvite(): Promise<number | null> {
  return notificationService.scheduleLocal(
    {
      type: NotificationType.SocialInvite,
      title: 'Пригласите друга',
      body: 'Практиковаться вместе веселее. Получите 7 дней Plus!',
      data: { screen: 'Profile' },
    },
    3600,
  );
}

export async function scheduleSubscriptionWarning(daysLeft: number): Promise<number | null> {
  if (!Number.isFinite(daysLeft) || daysLeft <= 0) return null;

  return notificationService.scheduleLocal(
    {
      type: NotificationType.SubscriptionExpiring,
      title: 'Ritual Plus истекает',
      body: `Осталось ${daysLeft} дн. Продлите, чтобы не потерять доступ.`,
      data: { screen: 'Subscription' },
    },
    300,
  );
}

export async function scheduleIntentionReminder(): Promise<void> {
  const now = new Date();
  const targetTime = new Date(`${now.toISOString().split('T')[0]}T07:00:00`);
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  const delay = (targetTime.getTime() - now.getTime()) / 1000;
  await notificationService.scheduleLocal(
    {
      id: stableNotificationId('intention-reminder'),
      type: NotificationType.IntentionReminder,
      title: 'Намерение на день',
      body: 'Пора выбрать намерение на день, чтобы настроить фокус и сохранить осознанность.',
      data: { screen: 'Dashboard' },
    },
    delay,
  );
}

export async function rescheduleAll(): Promise<void> {
  if (reschedulePromise) return reschedulePromise;

  reschedulePromise = (async () => {
    await notificationService.rescheduleAll(getManagedReminderIds(), MANAGED_REMINDER_TYPES);
    if (!notificationService.isNotificationsEnabled()) return;
    if (!await notificationService.ensureReady()) return;

    await scheduleTimelineReminders();
    await scheduleStreakReminder();
    await scheduleIntentionReminder();
  })().finally(() => {
    reschedulePromise = null;
  });

  return reschedulePromise;
}
