import { NotificationPayload, STORAGE_KEYS } from './notification.types';

let initialized = false;
let PushNotifications: any = null;
let LocalNotifications: any = null;
let pluginsLoaded = false;

async function loadPlugins(): Promise<boolean> {
  if (pluginsLoaded) return !!LocalNotifications;
  try {
    const localMod = await import('@capacitor/local-notifications');
    LocalNotifications = localMod.LocalNotifications;
    
    try {
      const pushMod = await import('@capacitor/push-notifications');
      PushNotifications = pushMod.PushNotifications;
    } catch (e) {
      console.warn('[NotificationService] PushNotifications module is not available on this platform:', e);
      PushNotifications = null;
    }
    
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
    let localGranted = false;
    let pushGranted = false;
    
    if (LocalNotifications) {
      const result = await LocalNotifications.requestPermissions();
      localGranted = result.display === 'granted';
    }
    
    if (PushNotifications) {
      try {
        const result = await PushNotifications.requestPermissions();
        pushGranted = result.receive === 'granted';
      } catch (e) {
        console.warn('[NotificationService] Push requestPermissions failed:', e);
      }
    }
    
    return localGranted || pushGranted;
  } catch {
    return false;
  }
}

async function registerForPush(): Promise<void> {
  if (!isNative()) return;
  try {
    await loadPlugins();
    if (!PushNotifications) return;

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    } else {
      console.warn('[NotificationService] Push permissions not granted');
    }
  } catch (err) {
    console.error('[NotificationService] Failed to register push notifications:', err);
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
        const data = action?.notification?.extra || action?.notification?.data || {};
        onNotificationOpened?.(data);
      });
    }

    if (PushNotifications) {
      PushNotifications.addListener('registration', (token: any) => {
        console.log('[NotificationService] Push registration successful, token:', token.value);
        localStorage.setItem('ritual_push_token', token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[NotificationService] Push registration error:', error.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('[NotificationService] Push received:', notification);
        const quietMode = localStorage.getItem('ritual_quiet_mode_active');
        if (quietMode === 'true') {
          console.log('[NotificationService] Suppressing push notification since quiet mode is active');
          return;
        }
        onNotificationReceived?.(notification.data ?? {});
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('[NotificationService] Push action performed:', action);
        onNotificationOpened?.(action.notification?.data ?? {});
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

    if (repeats) {
      scheduleOpts.on = { hour: hours, minute: minutes };
      scheduleOpts.repeats = true;
      scheduleOpts.every = 'day';
    } else {
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      scheduleOpts.at = target;
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

async function rescheduleAll(): Promise<void> {
  if (!isNotificationsEnabled()) return;
  await cancelAll();
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
  isNative,
  isNotificationsEnabled,
};
