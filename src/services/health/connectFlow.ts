import { healthService } from './health.service';
import { clearHealthCache } from './manager';

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

export async function connectHealthSource(
  type: HealthConnectSourceType,
  options: ConnectHealthSourceOptions = {},
): Promise<ConnectHealthSourceResult> {
  const { onRefresh, onSyncing, onProgress, onStep } = options;

  onSyncing?.(true);
  onProgress?.(0);
  onStep?.('Запрос разрешений...');

  if (!healthService.isNative()) {
    onStep?.('Подключение доступно в мобильном приложении');
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
    await healthService.getMetrics();

    onProgress?.(70);
    onStep?.('Расчёт Индекса Сияния...');
    clearHealthCache();
    await onRefresh?.();

    onProgress?.(100);
    onStep?.('Данные импортированы!');
    window.setTimeout(() => onSyncing?.(false), 1000);
    return { ok: true };
  } catch (err) {
    console.warn('[connectHealthSource] Sync failed:', err);
    onStep?.('Ошибка синхронизации');
    window.setTimeout(() => onSyncing?.(false), 1500);
    return { ok: false, reason: 'sync_failed' };
  }
}
