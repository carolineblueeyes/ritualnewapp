import { notificationService } from './notification.service';
import { NotificationType, STORAGE_KEYS } from './notification.types';

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getTimelineSlots(): { id: string; time: string; practiceId: string }[] {
  try {
    return JSON.parse(localStorage.getItem('ritual_day_slots') || '[]');
  } catch {
    return [];
  }
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
    if (!slot.practiceId) continue;

    const practiceName = getPracticeName(slot.practiceId);
    const isCompleted = !!completed[slot.id];

    // Compute delay in seconds for today's slot time
    const [sh, sm] = slot.time.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(sh, sm, 0, 0);
    const delaySec = Math.floor((slotDate.getTime() - now.getTime()) / 1000);

    if (delaySec > 0) {
      // Slot time is still ahead today — fire with relative delay (guaranteed on time)
      await notificationService.scheduleLocal(
        {
          type: NotificationType.PracticeReminder,
          title: 'Пора практиковаться',
          body: `Сегодня: ${practiceName}`,
          data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
        },
        delaySec,
      );

      // 7 minutes before practice (delaySec - 420), but never negative
      const soonDelay = delaySec - 420;
      if (soonDelay > 0) {
        await notificationService.scheduleLocal(
          {
            type: NotificationType.PracticeSoon,
            title: 'Скоро начало практики',
            body: `Через 7 минут начнется практика: ${practiceName}`,
            data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
          },
          soonDelay,
        );
      }
    } else if (!isCompleted) {
      // Slot time has passed today and not completed — schedule repeating for tomorrow+
      await notificationService.scheduleAtTime(
        {
          type: NotificationType.PracticeReminder,
          title: 'Пора практиковаться',
          body: `Сегодня: ${practiceName}`,
          data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
        },
        slot.time,
        true,
      );

      const soonTime = subtractMinutesFromTime(slot.time, 7);
      await notificationService.scheduleAtTime(
        {
          type: NotificationType.PracticeSoon,
          title: 'Скоро начало практики',
          body: `Через 7 минут начнется практика: ${practiceName}`,
          data: { practiceId: slot.practiceId, slotId: slot.id, screen: 'PracticePlayer' },
        },
        soonTime,
        true,
      );
    }
    // If completed and slot passed — skip (already done for today)
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

  // If already completed today, schedule a one-shot warning for tomorrow (repeats = false)
  // If not completed today, schedule a repeating daily warning starting today (repeats = true)
  await notificationService.scheduleAtTime(
    {
      type: NotificationType.StreakWarning,
      title: 'Не прерывайте серию!',
      body: 'Сегодня вы ещё не практиковались. Не теряйте свой прогресс!',
      data: { screen: 'Dashboard' },
    },
    reminderTime,
    !completedToday,
  );
}

export async function scheduleFocusBreak(workMinutes: number): Promise<number | null> {
  return notificationService.scheduleLocal(
    {
      type: NotificationType.FocusBreak,
      title: 'Время для перерыва',
      body: `Вы поработали ${workMinutes} минут. Отдохните!`,
      data: { screen: 'FocusTool' },
    },
    workMinutes * 60,
  );
}

export async function scheduleSessionComplete(type: string, durationMin: number): Promise<number | null> {
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
  await notificationService.scheduleAtTime(
    {
      type: NotificationType.IntentionReminder,
      title: 'Намерение на день',
      body: 'Пора выбрать намерение на день, чтобы настроить фокус и сохранить осознанность.',
      data: { screen: 'Dashboard' },
    },
    '07:00',
    true, // Repeating daily
  );
}

export async function rescheduleAll(): Promise<void> {
  await notificationService.rescheduleAll();
  if (!notificationService.isNotificationsEnabled()) return;

  await scheduleTimelineReminders();
  await scheduleStreakReminder();
  await scheduleIntentionReminder();
}
