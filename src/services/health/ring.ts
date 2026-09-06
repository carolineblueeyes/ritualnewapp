import { Capacitor } from '@capacitor/core';
import { EMPTY_METRICS, type HealthMetrics } from './types';
import { X6Ring, type RingCandidate, type RingDailySummary, type RingDeviceInfo, type RingPoint, type RingDataType } from './x6RingPlugin';
import { withMergedNightSleep } from '../../components/health/sleepUtils';

const ADDRESS_KEY = 'ritual_ring_address';
const CONNECTED_KEY = 'ritual_ble_ring_connected';
const NAME_KEY = 'ritual_connected_ring_name';
let connected = false;
let deviceInfo: RingDeviceInfo | null = null;

function ritualRingName(name?: string | null): string {
  if (!name || isRitualRingName(name)) return 'Ritual Ring';
  return name;
}

function isRitualRingName(name?: string | null): boolean {
  const value = (name ?? '').toLowerCase();
  if (!value) return false;
  if (/2301|x6|x5|ritual|\bring\b|nōw|\bnow\b|colmi|jcring|j-?style|\bcore\b/.test(value)) return true;
  return /\br\d{1,2}[a-z]?\b/.test(value) || /\bq\d{1,2}\b/.test(value) || /\bit\d{2,3}\b/.test(value);
}

function brandedInfo(info: RingDeviceInfo): RingDeviceInfo {
  return { ...info, name: ritualRingName(info.name) };
}

function today(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function selectRecentSleepHours(todaySummary: RingDailySummary, previousSummary: RingDailySummary | null): number | null {
  if (todaySummary.sleepHours !== null && todaySummary.sleepHours > 0) return todaySummary.sleepHours;
  if (!previousSummary || previousSummary.sleepHours === null || previousSummary.sleepHours <= 0) return null;
  if (!previousSummary.sleepEnd) return previousSummary.sleepHours;
  const endedAt = new Date(previousSummary.sleepEnd).getTime();
  const age = Date.now() - endedAt;
  return Number.isFinite(endedAt) && age >= -6 * 3_600_000 && age <= 30 * 3_600_000
    ? previousSummary.sleepHours
    : null;
}

function extractBpm(data: any): number {
  if (data == null) return 0;
  if (typeof data === 'number') return data;
  if (typeof data === 'string') {
    const parsed = Number(data);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof data === 'object') {
    const candidates = ['heartRate', 'onceHeartValue', 'HeartRateValue', 'heartRateValue', 'value'];
    for (const key of candidates) {
      const value = data[key];
      if (value != null) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    }
    // Рекурсивный поиск по вложенным объектам
    for (const key of Object.keys(data)) {
      const nested = data[key];
      if (nested && typeof nested === 'object') {
        const found = extractBpm(nested);
        if (found > 0) return found;
      }
    }
  }
  return 0;
}

function remember(info: RingDeviceInfo) {
  info = brandedInfo(info);
  connected = info.state === 'connected';
  deviceInfo = info;
  if (info.address) localStorage.setItem(ADDRESS_KEY, info.address);
  localStorage.setItem(CONNECTED_KEY, connected ? 'true' : 'false');
  localStorage.setItem(NAME_KEY, info.name || 'Ritual Ring');
}

export const bleRingService = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  isConnected(): boolean {
    return connected;
  },

  getDeviceName(): string | null {
    return deviceInfo?.name || localStorage.getItem(NAME_KEY);
  },

  async getPermissionState() {
    return X6Ring.getPermissionState();
  },

  async requestPermissions() {
    return X6Ring.requestPermissions();
  },

  async scan(): Promise<RingCandidate[]> {
    if (!this.isAvailable()) return [];
    const permission = await X6Ring.getPermissionState();
    if (permission.bluetooth !== 'granted') await X6Ring.requestPermissions();
    const result = await X6Ring.scan({ timeoutMs: 15_000 });
    return result.devices
      .filter(device => device.recognized || isRitualRingName(device.name))
      .map(device => ({ ...device, name: 'Ritual Ring', recognized: true }))
      .sort((a, b) => b.rssi - a.rssi);
  },

  async connect(address: string, name = 'Ritual Ring'): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const info = brandedInfo(await X6Ring.connect({ address, name }));
      remember(info);
      // Настройка мониторинга и синхронизация выполняются в фоне —
      // пользователь видит «Кольцо готово» сразу после GATT-подключения.
      void X6Ring.configureAutoMonitoring({ enabled: true, intervalMinutes: 30, startHour: 0, endHour: 23, weekMask: 127 })
        .catch(error => console.warn('[X6Ring] Auto-monitoring config failed:', error));
      void X6Ring.sync()
        .then(() => X6Ring.getDeviceInfo())
        .then(info => {
          deviceInfo = brandedInfo(info);
          remember(deviceInfo);
        })
        .catch(error => console.warn('[X6Ring] Background sync failed:', error));
      return true;
    } catch (error) {
      console.warn('[X6Ring] Connect failed:', error);
      connected = false;
      localStorage.setItem(CONNECTED_KEY, 'false');
      return false;
    }
  },

  async reconnectIfRemembered(): Promise<boolean> {
    const address = localStorage.getItem(ADDRESS_KEY);
    if (!this.isAvailable() || !address) return false;
    try {
      let state = await X6Ring.getConnectionState();
      // Если плагин уже сам подключается (load() → client.connect) — ждём
      // событие connectionStateChanged вместо активного polling.
      if (state.state === 'connecting') {
        const connected = await new Promise<boolean>(async resolve => {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          const handle = await X6Ring.addListener('connectionStateChanged', (event: { state: string }) => {
            if (event.state === 'connected') {
              if (timeout) clearTimeout(timeout);
              void handle.remove();
              resolve(true);
            } else if (event.state === 'error' || event.state === 'disconnected') {
              if (timeout) clearTimeout(timeout);
              void handle.remove();
              resolve(false);
            }
          });
          timeout = setTimeout(() => {
            void handle.remove();
            resolve(false);
          }, 5000);
        });
        if (!connected) return false;
        state = await X6Ring.getConnectionState();
      }
      if (state.state !== 'connected') {
        const info = brandedInfo(await X6Ring.connect({
          address,
          name: localStorage.getItem(NAME_KEY) || 'Ritual Ring',
        }));
        remember(info);
        return info.state === 'connected';
      }
      connected = true;
      if (connected) {
        deviceInfo = brandedInfo(await X6Ring.getDeviceInfo());
        remember(deviceInfo);
      }
      return connected;
    } catch {
      connected = false;
      localStorage.setItem(CONNECTED_KEY, 'false');
      return false;
    }
  },

  async disconnect(): Promise<void> {
    if (this.isAvailable()) await X6Ring.disconnect();
    connected = false;
    localStorage.setItem(CONNECTED_KEY, 'false');
  },

  async forget(): Promise<void> {
    if (this.isAvailable()) await X6Ring.forgetDevice();
    connected = false;
    deviceInfo = null;
    localStorage.removeItem(ADDRESS_KEY);
    localStorage.removeItem(CONNECTED_KEY);
    localStorage.removeItem(NAME_KEY);
  },

  async sync(): Promise<void> {
    if (!this.isAvailable() || !this.isConnected()) return;
    await X6Ring.sync();
    deviceInfo = brandedInfo(await X6Ring.getDeviceInfo());
    remember(deviceInfo);
  },

  async getDeviceInfo(): Promise<RingDeviceInfo | null> {
    if (!this.isAvailable()) return null;
    try {
      deviceInfo = brandedInfo(await X6Ring.getDeviceInfo());
      return deviceInfo;
    } catch {
      return deviceInfo;
    }
  },

  async getDailySummary(date = today()): Promise<RingDailySummary | null> {
    if (!this.isAvailable()) return null;
    try { return await X6Ring.getDailySummary({ date }); } catch { return null; }
  },

  async getSeries(type: RingDataType, days = 7, aggregation: 'raw' | 'hour' | 'day' = 'raw'): Promise<RingPoint[]> {
    if (!this.isAvailable()) return [];
    const to = Date.now();
    return (await X6Ring.getSeries({ type, from: to - days * 86_400_000, to, aggregation })).points;
  },

  async startLiveHeartRate(onReading: (bpm: number) => void): Promise<() => void> {
    if (!this.isAvailable() || !this.isConnected()) return () => {};
    const handle = await X6Ring.addListener('liveMeasurement', (event: { type: string; data: any }) => {
      if (event.type !== 'heartRate') return;
      const bpm = extractBpm(event.data);
      if (bpm > 0) onReading(bpm);
    });
    await X6Ring.startLiveMeasurement({ type: 'heartRate' });
    return () => {
      void handle.remove();
      void X6Ring.stopLiveMeasurement().catch(() => {});
    };
  },

  async stopLiveMeasurement() {
    if (this.isAvailable()) await X6Ring.stopLiveMeasurement();
  },

  async getMetrics(): Promise<HealthMetrics> {
    if (!this.isConnected()) return { ...EMPTY_METRICS, source: 'ring' };
    try {
      await this.sync();
      const [rawToday, rawPrevious] = await Promise.all([
        X6Ring.getDailySummary({ date: today() }),
        X6Ring.getDailySummary({ date: dateDaysAgo(1) }).catch(() => null),
      ]);
      const summary = withMergedNightSleep(rawToday) ?? rawToday;
      const previousSummary = rawPrevious ? withMergedNightSleep(rawPrevious) : null;
      return {
        hrv: summary.hrv,
        sleepHours: selectRecentSleepHours(summary, previousSummary),
        steps: summary.steps,
        restingHR: summary.restingHR,
        spo2: summary.spo2,
        temperature: summary.temperature,
        respiratoryRate: null,
        distance: summary.distance,
        calories: summary.calories,
        activeMinutes: summary.activeMinutes,
        batteryLevel: summary.batteryLevel,
        dataFreshness: summary.lastSync,
        source: 'ring',
        lastSync: summary.lastSync,
      };
    } catch (error) {
      console.warn('[X6Ring] Sync failed:', error);
      return { ...EMPTY_METRICS, source: 'ring' };
    }
  },
};