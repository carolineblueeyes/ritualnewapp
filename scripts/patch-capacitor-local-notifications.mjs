import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const pluginSource = resolve(
  process.cwd(),
  'node_modules/@capacitor/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications/TimedNotificationPublisher.java',
);

const original = `            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                Logger.warn(
                    "Capacitor/LocalNotification",
                    "Exact alarms not allowed in user settings.  Notification scheduled with non-exact alarm."
                );
                alarmManager.set(AlarmManager.RTC, trigger, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC, trigger, pendingIntent);
            }`;

const patched = `            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                Logger.warn(
                    "Capacitor/LocalNotification",
                    "Exact alarms not allowed in user settings.  Notification scheduled with non-exact alarm."
                );
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            }`;

const source = await readFile(pluginSource, 'utf8');

if (source.includes(patched)) {
  console.log('[local-notifications] Android repeating-alarm patch is already applied.');
} else if (source.includes(original)) {
  await writeFile(pluginSource, source.replace(original, patched));
  console.log('[local-notifications] Applied Android repeating-alarm patch.');
} else {
  throw new Error(
    '[local-notifications] The expected Capacitor alarm code was not found. Review the patch before updating this dependency.',
  );
}
