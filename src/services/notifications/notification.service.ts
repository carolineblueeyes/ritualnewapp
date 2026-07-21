import { NotificationPayload, STORAGE_KEYS } from './notification.types';
import { supabase } from '../supabase/client';

let initialized = false;
let FirebaseMessaging: any = null;
let LocalNotifications: any = null;
let pluginsLoaded = false;
const CHANNEL_ID = 'ritual-reminders';
const PUSH_INSTALLATION_ID_KEY = 'ritual_push_installation_id';
const PUSH_TOKEN_KEY = 'ritual_push_token';

type PushPlatform = 'android' | 'ios' | 'web' | 'unknown';
type PushRegistrationStatus =
  | 'registered'
  | 'not_native'
  | 'messaging_unavailable'
  | 'unsupported'
  | 'permission_denied'
  | 'token_unavailable'
  | 'pushBackendUnavailable'
  | 'backend_error';

export interface PushRegistrationResult {
  ok: boolean;
  status: PushRegistrationStatus;
  token?: string;
}

function createNotificationId(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}

function normalizeNotificationData(data?: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data ?? {}).map(([k, v]) => [k, String(v)])
  );
}

async function canUseExactAlarm(): Promise<boolean> {
  if (!LocalNotifications?.checkExactNotificationSetting) return false;

  try {
    const result = await LocalNotifications.checkExactNotificationSetting();
    const granted = Object.values(result ?? {}).some((value) => value === 'granted');
    if (!granted) {
      console.warn('[NotificationService] Exact alarms are not granted; scheduling inexact notifications instead');
    }
    return granted;
  } catch (e) {
    console.warn('[NotificationService] Exact alarm setting check failed:', e);
    return false;
  }
}

async function scheduleWithFallback(notification: any, prefersExact = false): Promise<void> {
  const baseSchedule = notification.schedule ?? {};
  const shouldUseExact = prefersExact && await canUseExactAlarm();

  const schedule = {
    ...baseSchedule,
    ...(shouldUseExact ? { exact: true } : {}),
  };

  try {
    await LocalNotifications.schedule({
      notifications: [{ ...notification, schedule }],
    });
  } catch (exactError) {
    if (!schedule.exact) throw exactError;

    console.warn('[NotificationService] Failed to schedule exact notification, trying inexact:', exactError);
    const fallbackSchedule = { ...schedule };
    delete fallbackSchedule.exact;

    await LocalNotifications.schedule({
      notifications: [{ ...notification, schedule: fallbackSchedule }],
    });
  }
}

async function loadPlugins(): Promise<boolean> {
  if (pluginsLoaded) return !!LocalNotifications;
  try {
    const localMod = await import('@capacitor/local-notifications');
    LocalNotifications = localMod.LocalNotifications;
    
    try {
      const messagingMod = await import('@capacitor-firebase/messaging');
      FirebaseMessaging = messagingMod.FirebaseMessaging;
    } catch (e) {
      console.warn('[NotificationService] FirebaseMessaging module is not available on this platform:', e);
      FirebaseMessaging = null;
    }
    
    pluginsLoaded = true;
    return true;
  } catch (e) {
    console.warn('[NotificationService] Failed to load plugins:', e);
    pluginsLoaded = true;
    return false;
  }
}

async function ensureLocalNotificationsReady(request = false): Promise<boolean> {
  if (!isNotificationsEnabled()) return false;
  if (!isNative()) return false;

  await loadPlugins();
  if (!LocalNotifications) return false;

  if (request) {
    return requestPermission();
  }

  return checkPermission();
}

async function ensureReady(request = false): Promise<boolean> {
  return ensureLocalNotificationsReady(request);
}

function isNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function getPlatform(): PushPlatform {
  try {
    const platform = (window as any).Capacitor?.getPlatform?.();
    return ['android', 'ios', 'web'].includes(platform) ? platform : 'unknown';
  } catch {
    return 'unknown';
  }
}

function getInstallationId(): string {
  const existing = localStorage.getItem(PUSH_INSTALLATION_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(PUSH_INSTALLATION_ID_KEY, id);
  return id;
}

function normalizeNotificationPayload(data?: Record<string, unknown>): Record<string, string> {
  return normalizeNotificationData(data);
}

function extractNotificationData(notification: any): Record<string, string> {
  const data = notification?.extra || notification?.data;
  return data && typeof data === 'object' ? normalizeNotificationPayload(data as Record<string, unknown>) : {};
}

async function sendPushTokenToBackend(token: string): Promise<PushRegistrationResult> {
  const installationId = getInstallationId();
  const platform = getPlatform();

  localStorage.setItem(PUSH_TOKEN_KEY, token);

  if (!supabase) {
    return { ok: false, status: 'pushBackendUnavailable', token };
  }

  const { error } = await supabase.functions.invoke('register-push-token', {
    body: { installationId, token, platform },
  });

  if (error) {
    throw new Error(`Push token registration failed: ${error.message}`);
  }

  return { ok: true, status: 'registered', token };
}

function isNotificationsEnabled(): boolean {
  try {
    const quietMode = localStorage.getItem('ritual_quiet_mode_active');
    if (quietMode === 'true') {
      return false;
    }
    const val = localStorage.getItem(STORAGE_KEYS.enabled);
    return val === null ? true : val === 'true';
  } catch {
    return false;
  }
}

async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await loadPlugins();
    if (!LocalNotifications) return false;

    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.warn('[NotificationService] Local requestPermissions failed:', e);
    return false;
  }
}

async function requestNotificationAccess(): Promise<boolean> {
  const granted = await requestPermission();
  if (granted) {
    await promptExactAlarmSettingsIfNeeded();
    await registerForPush();
  }
  return granted;
}

async function checkPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await loadPlugins();
    if (!LocalNotifications?.checkPermissions) return false;

    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.warn('[NotificationService] Local checkPermissions failed:', e);
    return false;
  }
}

async function registerForPush(): Promise<PushRegistrationResult> {
  if (!isNative()) return { ok: false, status: 'not_native' };
  try {
    await loadPlugins();
    if (!FirebaseMessaging) return { ok: false, status: 'messaging_unavailable' };

    const support = await FirebaseMessaging.isSupported?.();
    if (support && support.isSupported === false) return { ok: false, status: 'unsupported' };

    let permStatus = await FirebaseMessaging.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await FirebaseMessaging.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        return await sendPushTokenToBackend(token);
      }
      return { ok: false, status: 'token_unavailable' };
    } else {
      console.warn('[NotificationService] Push permissions not granted');
      return { ok: false, status: 'permission_denied' };
    }
  } catch (err) {
    console.error('[NotificationService] Failed to register push notifications:', err);
    return { ok: false, status: 'backend_error' };
  }
}

function addListeners(
  onNotificationReceived?: (data: Record<string, unknown>) => void,
  onNotificationOpened?: (data: Record<string, unknown>) => void,
): void {
  if (!isNative() || initialized) return;
  initialized = true;

  try {
    if (LocalNotifications) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
        console.log('[NotificationService] Local opened:', action?.notification);
        onNotificationOpened?.(extractNotificationData(action?.notification));
      });
    }

    if (FirebaseMessaging) {
      FirebaseMessaging.addListener('tokenReceived', (event: any) => {
        console.log('[NotificationService] FCM token refreshed');
        sendPushTokenToBackend(event.token).then((result) => {
          if (!result.ok) {
            console.warn(`[NotificationService] Push token refresh not fully registered: ${result.status}`);
          }
        }).catch((e) => {
          console.warn('[NotificationService] Failed to sync refreshed push token:', e);
        });
      });

      FirebaseMessaging.addListener('notificationReceived', (event: any) => {
        console.log('[NotificationService] Push received:', event.notification);
        const quietMode = localStorage.getItem('ritual_quiet_mode_active');
        if (quietMode === 'true') {
          console.log('[NotificationService] Suppressing push notification since quiet mode is active');
          return;
        }
        onNotificationReceived?.(extractNotificationData(event.notification));
      });

      FirebaseMessaging.addListener('notificationActionPerformed', (event: any) => {
        console.log('[NotificationService] Push action performed:', event);
        onNotificationOpened?.(extractNotificationData(event.notification));
      });
    }
  } catch (e) {
    console.warn('[NotificationService] addListeners failed:', e);
  }
}

async function cancelAll(): Promise<void> {
  try {
    await loadPlugins();
    if (!LocalNotifications) return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n: any) => ({ id: n.id })),
      });
    }
    localStorage.removeItem(STORAGE_KEYS.scheduled);
  } catch (e) {
    console.warn('[NotificationService] cancelAll failed:', e);
  }
}

function readScheduledNotifications(): any[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.scheduled) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScheduledNotifications(notifications: any[]): void {
  localStorage.setItem(STORAGE_KEYS.scheduled, JSON.stringify(notifications));
}

function rememberScheduledNotification(notification: any): void {
  const scheduled = readScheduledNotifications().filter((item) => item.id !== notification.id);
  scheduled.push(notification);
  writeScheduledNotifications(scheduled);
}

async function cancelByIds(ids: number[]): Promise<void> {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  if (uniqueIds.length === 0) return;

  try {
    await loadPlugins();
    if (!LocalNotifications) return;
    await LocalNotifications.cancel({
      notifications: uniqueIds.map((id) => ({ id })),
    });

    const remaining = readScheduledNotifications().filter((item) => !uniqueIds.includes(item.id));
    if (remaining.length > 0) {
      writeScheduledNotifications(remaining);
    } else {
      localStorage.removeItem(STORAGE_KEYS.scheduled);
    }
  } catch (e) {
    console.warn('[NotificationService] cancelByIds failed:', e);
  }
}

async function scheduleLocal(payload: NotificationPayload, delaySeconds: number): Promise<number | null> {
  try {
    if (!await ensureReady()) return null;

    const id = payload.id ?? createNotificationId();
    const date = new Date(Date.now() + delaySeconds * 1000);

    const notificationConfig: any = {
      title: payload.title,
      body: payload.body,
      id,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_push_notification',
      largeIcon: 'ic_launcher',
      extra: {
        type: String(payload.type),
        ...normalizeNotificationPayload(payload.data),
      },
    };

    await scheduleWithFallback(
      {
        ...notificationConfig,
        schedule: {
          at: date,
          allowWhileIdle: true,
        },
      },
      true,
    );

    rememberScheduledNotification({
      id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      scheduledDate: date.toISOString(),
      data: normalizeNotificationPayload(payload.data),
    });

    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleLocal failed:', e);
    return null;
  }
}

async function scheduleAtDate(
  payload: NotificationPayload,
  at: Date,
  prefersExact = true,
): Promise<number | null> {
  try {
    if (!await ensureReady()) return null;
    if (at.getTime() <= Date.now() + 500) return null;

    const id = payload.id ?? createNotificationId();

    const notificationConfig: any = {
      title: payload.title,
      body: payload.body,
      id,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_push_notification',
      largeIcon: 'ic_launcher',
      extra: {
        type: String(payload.type),
        ...normalizeNotificationPayload(payload.data),
      },
    };

    await scheduleWithFallback(
      {
        ...notificationConfig,
        schedule: {
          at,
          allowWhileIdle: true,
        },
      },
      prefersExact,
    );

    rememberScheduledNotification({
      id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      scheduledDate: at.toISOString(),
      data: normalizeNotificationPayload(payload.data),
    });

    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleAtDate failed:', e);
    return null;
  }
}

async function scheduleAtTime(
  payload: NotificationPayload,
  timeHHMM: string,
  repeats: boolean = false
): Promise<number | null> {
  try {
    if (!await ensureReady()) return null;

    const [hours, minutes] = timeHHMM.split(':').map(Number);
    const id = payload.id ?? createNotificationId();

    const notificationConfig: any = {
      title: payload.title,
      body: payload.body,
      id,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_push_notification',
      largeIcon: 'ic_launcher',
      extra: {
        type: String(payload.type),
        ...normalizeNotificationPayload(payload.data),
      },
    };

    const scheduleOpts: any = {};

    if (repeats) {
      scheduleOpts.on = { hour: hours, minute: minutes };
      scheduleOpts.repeats = true;
      scheduleOpts.allowWhileIdle = true;
    } else {
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      scheduleOpts.at = target;
      scheduleOpts.allowWhileIdle = true;
    }

    await scheduleWithFallback(
      {
        ...notificationConfig,
        schedule: scheduleOpts,
      },
      !repeats,
    );

    rememberScheduledNotification({
      id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      scheduledDate: repeats ? `Daily at ${timeHHMM}` : (scheduleOpts.at as Date).toISOString(),
      data: normalizeNotificationPayload(payload.data),
    });

    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleAtTime failed:', e);
    return null;
  }
}

async function cancelById(id: number): Promise<void> {
  await cancelByIds([id]);
}

async function cancelPendingOnChannel(managedTypes: Set<string>): Promise<void> {
  try {
    await loadPlugins();
    if (!LocalNotifications) return;

    const pending = await LocalNotifications.getPending();
    const notifications = pending?.notifications ?? [];
    const idsToCancel = notifications
      .filter((notification: any) => {
        const channelId = notification?.channelId ?? notification?.channel_id;
        const type = String(notification?.extra?.type ?? '');
        return channelId === CHANNEL_ID || managedTypes.has(type);
      })
      .map((notification: any) => Number(notification.id))
      .filter(Number.isFinite);

    if (idsToCancel.length === 0) return;
    await cancelByIds(idsToCancel);
  } catch (e) {
    console.warn('[NotificationService] cancelPendingOnChannel failed:', e);
  }
}

async function promptExactAlarmSettingsIfNeeded(): Promise<void> {
  if (!LocalNotifications?.checkExactNotificationSetting) return;

  try {
    const result = await LocalNotifications.checkExactNotificationSetting();
    const granted = Object.values(result ?? {}).some((value) => value === 'granted');
    if (granted) return;

    if (LocalNotifications.changeExactNotificationSetting) {
      await LocalNotifications.changeExactNotificationSetting();
    }
  } catch (e) {
    console.warn('[NotificationService] Exact alarm settings prompt failed:', e);
  }
}

async function rescheduleAll(managedIds: number[], managedTypes: Set<string>): Promise<void> {
  await cancelPendingOnChannel(managedTypes);
  await cancelByIds(managedIds);
}

async function init(
  onNotificationReceived?: (data: Record<string, unknown>) => void,
  onNotificationOpened?: (data: Record<string, unknown>) => void,
): Promise<void> {
  await loadPlugins();
  if (isNative() && LocalNotifications) {
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Напоминания Ritual',
        description: 'Уведомления о практиках и напоминаниях серии дней',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    } catch (e) {
      console.warn('[NotificationService] Failed to create notification channel:', e);
    }
  }
  addListeners(onNotificationReceived, onNotificationOpened);
}

export const notificationService = {
  init,
  ensureLocalNotificationsReady,
  ensureReady,
  checkPermission,
  requestPermission,
  requestNotificationAccess,
  registerForPush,
  cancelAll,
  scheduleLocal,
  scheduleAtDate,
  scheduleAtTime,
  cancelById,
  cancelByIds,
  cancelPendingOnChannel,
  promptExactAlarmSettingsIfNeeded,
  rescheduleAll,
  isNative,
  isNotificationsEnabled,
};
