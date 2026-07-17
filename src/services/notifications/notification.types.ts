export enum NotificationType {
  PracticeReminder = 'practice_reminder',
  PracticeSoon = 'practice_soon',
  IntentionReminder = 'intention_reminder',
  StreakWarning = 'streak_warning',
  FocusBreak = 'focus_break',
  SessionComplete = 'session_complete',
  HealthInsight = 'health_insight',
  SocialInvite = 'social_invite',
  SubscriptionExpiring = 'subscription_expiring',
}

export interface ScheduledNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  scheduledDate: string;
  data?: Record<string, unknown>;
}

export interface NotificationPayload {
  id?: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const STORAGE_KEYS = {
  enabled: 'ritual_notifications_enabled',
  reminderTime: 'ritual_reminder_time',
  scheduled: 'ritual_scheduled_notifications',
  streakNotified: 'ritual_streak_notified_today',
  lastHealthPush: 'ritual_last_health_push_date',
} as const;
