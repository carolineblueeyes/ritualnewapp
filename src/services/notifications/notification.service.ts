import { NotificationPayload, STORAGE_KEYS } from './notification.types';
import Dnd from '../../plugins/dnd';

let initialized = false;
let PushNotifications: any = null;
let LocalNotifications: any = null;
let pluginsLoaded = false;
let dndActive = false;
let dndSavedNotifications: any[] = [];
let nativeDndAvailable = false;

async function loadPlugins(): Promise<boolean> {
  if (pluginsLoaded) return !!LocalNotifications;
  try {
    const localMod = await import('@capacitor/local-notifications');
    LocalNotifications = localMod.LocalNotifications;
    // We intentionally do not use @capacitor/push-notifications to avoid crashes on Android due to missing FCM google-services.json
    PushNotifications = null;
    pluginsLoaded = true;
    return true;
  } catch (e) {
    console.warn('[NotificationService] Failed to load plugins:', e);
    pluginsLoaded = true;
    return false;
  }
}

function isNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function isNotificationsEnabled(): boolean {
  try {
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
  } catch {
    return false;
  }
}

async function registerForPush(): Promise<void> {
  // Disabled to prevent native crash on Android when google-services.json is missing.
  return;
}

function addListeners(
  onNotificationReceived?: (data: Record<string, unknown>) => void,
  onNotificationOpened?: (data: Record<string, unknown>) => void,
): void {
  if (!isNative() || initialized) return;
  if (!LocalNotifications) return;
  initialized = true;

  try {
    if (LocalNotifications) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
        console.log('[NotificationService] Local opened:', action?.notification);
        onNotificationOpened?.(action?.notification?.data ?? {});
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

async function scheduleLocal(payload: NotificationPayload, delaySeconds: number): Promise<number | null> {
  if (dndActive) return null;
  if (!isNotificationsEnabled()) return null;
  if (!isNative()) return null;

  try {
    await loadPlugins();
    if (!LocalNotifications) return null;

    const id = Math.floor(Math.random() * 2147483646) + 1;
    const date = new Date(Date.now() + delaySeconds * 1000);

    const notificationConfig: any = {
      title: payload.title,
      body: payload.body,
      id,
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
      android: {
        channelId: 'ritual-reminders',
        importance: 4,
        pressAction: { id: 'default' },
      },
      extra: {
        type: String(payload.type),
        ...Object.fromEntries(
          Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)])
        ),
      },
    };

    try {
      // Attempt exact scheduling first
      await LocalNotifications.schedule({
        notifications: [
          {
            ...notificationConfig,
            schedule: { 
              at: date,
              allowWhileIdle: true,
              exact: true
            }
          }
        ]
      });
    } catch (exactError) {
      console.warn('[NotificationService] Failed to schedule exact target notification, trying inexact:', exactError);
      // Fallback to non-exact scheduling to prevent SecurityException crashes on Android 14+
      await LocalNotifications.schedule({
        notifications: [
          {
            ...notificationConfig,
            schedule: { 
              at: date,
              allowWhileIdle: true
            }
          }
        ]
      });
    }

    const scheduled = JSON.parse(localStorage.getItem(STORAGE_KEYS.scheduled) || '[]');
    scheduled.push({ id, type: payload.type, title: payload.title, body: payload.body, scheduledDate: date.toISOString(), data: payload.data });
    localStorage.setItem(STORAGE_KEYS.scheduled, JSON.stringify(scheduled));

    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleLocal failed:', e);
    return null;
  }
}

async function scheduleAtTime(
  payload: NotificationPayload,
  timeHHMM: string,
  repeats: boolean = false
): Promise<number | null> {
  if (dndActive) return null;
  if (!isNotificationsEnabled()) return null;
  if (!isNative()) return null;

  try {
    await loadPlugins();
    if (!LocalNotifications) return null;

    const [hours, minutes] = timeHHMM.split(':').map(Number);
    const id = Math.floor(Math.random() * 2147483646) + 1;

    const notificationConfig: any = {
      title: payload.title,
      body: payload.body,
      id,
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
      android: {
        channelId: 'ritual-reminders',
        importance: 4,
        pressAction: { id: 'default' },
      },
      extra: {
        type: String(payload.type),
        ...Object.fromEntries(
          Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)])
        ),
      },
    };

    const scheduleOpts: any = {
      allowWhileIdle: true,
      exact: true,
    };

    // Always compute the first occurrence time so Android knows when to fire
    const now = new Date();
    const firstTarget = new Date();
    firstTarget.setHours(hours, minutes, 0, 0);
    if (firstTarget <= now) {
      firstTarget.setDate(firstTarget.getDate() + 1);
    }
    scheduleOpts.at = firstTarget;

    if (repeats) {
      scheduleOpts.on = { hour: hours, minute: minutes };
      scheduleOpts.repeats = true;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            ...notificationConfig,
            schedule: scheduleOpts,
          },
        ],
      });
    } catch (exactError) {
      console.warn('[NotificationService] Failed to schedule exact target notification, trying inexact:', exactError);
      const fallbackSchedule = { ...scheduleOpts };
      delete fallbackSchedule.exact;
      
      await LocalNotifications.schedule({
        notifications: [
          {
            ...notificationConfig,
            schedule: fallbackSchedule,
          },
        ],
      });
    }

    const scheduled = JSON.parse(localStorage.getItem(STORAGE_KEYS.scheduled) || '[]');
    scheduled.push({
      id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      scheduledDate: repeats ? `Daily at ${timeHHMM}` : (scheduleOpts.at as Date).toISOString(),
      data: payload.data,
    });
    localStorage.setItem(STORAGE_KEYS.scheduled, JSON.stringify(scheduled));

    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleAtTime failed:', e);
    return null;
  }
}

async function cancelById(id: number): Promise<void> {
  try {
    await loadPlugins();
    if (!LocalNotifications) return;
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {}
}

async function enterDND(): Promise<void> {
  if (dndActive) return;
  dndActive = true;
  try {
    await loadPlugins();
    if (!LocalNotifications) return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      dndSavedNotifications = pending.notifications.map((n: any) => ({ ...n }));
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n: any) => ({ id: n.id })),
      });
    }
  } catch (e) {
    console.warn('[NotificationService] enterDND failed:', e);
  }
  // Enable native system DND to block notifications from ALL apps
  if (isNative()) {
    try {
      const perm = await Dnd.checkPermission();
      if (!perm.granted) {
        await Dnd.requestPermission();
      }
      const { granted } = await Dnd.checkPermission();
      if (granted) {
        await Dnd.enter();
        nativeDndAvailable = true;
      }
    } catch (e) {
      console.warn('[NotificationService] Native DND failed:', e);
    }
  }
}

async function exitDND(): Promise<void> {
  if (!dndActive) return;
  dndActive = false;
  dndSavedNotifications = [];
  // Disable native system DND
  if (isNative() && nativeDndAvailable) {
    try {
      await Dnd.exit();
    } catch (e) {
      console.warn('[NotificationService] Native DND exit failed:', e);
    }
    nativeDndAvailable = false;
  }
}

function isDNDActive(): boolean {
  return dndActive;
}

async function rescheduleAll(): Promise<void> {
  if (!isNotificationsEnabled()) return;
  await cancelAll();
  // Ensure channel exists before new notifications are scheduled
  if (isNative()) {
    try {
      await loadPlugins();
      if (LocalNotifications) {
        await LocalNotifications.createChannel({
          id: 'ritual-reminders',
          name: 'Напоминания Ritual',
          description: 'Уведомления о практиках и напоминаниях серии дней',
          importance: 4,
          visibility: 1,
          vibration: true,
        });
      }
    } catch {}
  }
}

async function init(
  onNotificationReceived?: (data: Record<string, unknown>) => void,
  onNotificationOpened?: (data: Record<string, unknown>) => void,
): Promise<void> {
  await loadPlugins();
  if (isNative() && LocalNotifications) {
    try {
      await LocalNotifications.createChannel({
        id: 'ritual-reminders',
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
  if (isNative()) {
    await registerForPush();
  }
}

export const notificationService = {
  init,
  requestPermission,
  registerForPush,
  cancelAll,
  scheduleLocal,
  scheduleAtTime,
  cancelById,
  rescheduleAll,
  enterDND,
  exitDND,
  isDNDActive,
  isNative,
  isNotificationsEnabled,
};
