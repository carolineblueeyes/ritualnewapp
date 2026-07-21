import { healthService } from './health.service';
import { clearHealthCache, fetchHealthData } from './manager';
import { HEALTH_METRIC_KEYS } from './types';

export type HealthConnectSourceType = 'healthkit' | 'healthconnect';

interface ConnectHealthSourceOptions {
  onRefresh?: () => void | Promise<void>;
  onSyncing?: (syncing: boolean) => void;
  onProgress?: (progress: number) => void;
  onStep?: (step: string) => void;
}

export interface ConnectHealthSourceResult {
  ok: boolean;
  reason?: 'not_native' | 'permission_denied' | 'sync_failed';
}

const FIRST_SYNC_RETRY_DELAYS_MS = [0, 500, 1500, 3000, 5000];

const wait = (delayMs: number) => new Promise(resolve => window.setTimeout(resolve, delayMs));

async function syncHealthDataAfterPermission(): Promise<boolean> {
  let hasReadableHealthApp = false;

  for (const delayMs of FIRST_SYNC_RETRY_DELAYS_MS) {
    if (delayMs > 0) await wait(delayMs);
    clearHealthCache();

    const result = await fetchHealthData();
    const hasValue = HEALTH_METRIC_KEYS.some(metric => result.metrics[metric] !== null);
    const hasReadableMetric = HEALTH_METRIC_KEYS.some(metric => result.availabilityByMetric[metric] !== 'permission_denied');
    hasReadableHealthApp = result.hasHealthApp && hasReadableMetric;

    if (result.hasHealthApp && hasValue) {
      return true;
    }
  }

  return hasReadableHealthApp;
}

export async function connectHealthSource(
  type: HealthConnectSourceType,
  options: ConnectHealthSourceOptions = {},
): Promise<ConnectHealthSourceResult> {
  const { onRefresh, onSyncing, onProgress, onStep } = options;

  onSyncing?.(true);
  onProgress?.(0);
  onStep?.('Запрос разрешений...');

  if (!healthService.isNative()) {
    onStep?.('Подключение доступно только в мобильном приложении');
    window.setTimeout(() => onSyncing?.(false), 1500);
    return { ok: false, reason: 'not_native' };
  }

  try {
    const granted = await healthService.requestPermissions();
    if (!granted) {
      onStep?.('Разрешения не получены');
      window.setTimeout(() => onSyncing?.(false), 1500);
      return { ok: false, reason: 'permission_denied' };
    }

    localStorage.setItem('ritual_health_source', 'healthapp');
    localStorage.setItem(type === 'healthkit' ? 'ritual_healthkit_connected' : 'ritual_healthconnect_connected', 'true');

    onProgress?.(30);
    onStep?.('Чтение данных здоровья...');
    const synced = await syncHealthDataAfterPermission();
    if (!synced) {
      window.setTimeout(() => onSyncing?.(false), 1500);
      return { ok: false, reason: 'sync_failed' };
    }

    onProgress?.(70);
    onStep?.('Расчёт Индекса Сияния...');
    await onRefresh?.();

    onProgress?.(100);
    onStep?.('Данные импортированы');
    window.setTimeout(() => onSyncing?.(false), 1000);
    return { ok: true };
  } catch (err) {
    console.warn('[connectHealthSource] Sync failed:', err);
    onStep?.('Ошибка синхронизации');
    window.setTimeout(() => onSyncing?.(false), 1500);
    return { ok: false, reason: 'sync_failed' };
  }
}
