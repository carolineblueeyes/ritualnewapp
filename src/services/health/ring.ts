import { Capacitor } from '@capacitor/core';
import { EMPTY_METRICS, type HealthMetrics } from './types';
import { X6Ring, type RingCandidate, type RingDailySummary, type RingDeviceInfo, type RingPoint, type RingDataType } from './x6RingPlugin';

const ADDRESS_KEY = 'ritual_ring_address';
const CONNECTED_KEY = 'ritual_ble_ring_connected';
const NAME_KEY = 'ritual_connected_ring_name';
let connected = false;
let deviceInfo: RingDeviceInfo | null = null;

function ritualRingName(name?: string | null): string {
  if (!name || /x6|2301/i.test(name)) return 'Ritual Ring';
  return name;
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

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const result = await X6Ring.scan({ timeoutMs: 10_000 });
    return result.devices
      .map(device => ({ ...device, name: device.recognized ? 'Ritual Ring' : ritualRingName(device.name) }))
      .sort((a, b) => Number(b.recognized) - Number(a.recognized) || b.rssi - a.rssi);
  },

  async connect(address: string, name = 'Ritual Ring'): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const info = brandedInfo(await X6Ring.connect({ address, name }));
      remember(info);
      await X6Ring.configureAutoMonitoring({ enabled: true, intervalMinutes: 30, startHour: 0, endHour: 23, weekMask: 127 });
      await X6Ring.sync();
      deviceInfo = brandedInfo(await X6Ring.getDeviceInfo());
      remember(deviceInfo);
      return true;
    } catch (error) {
      console.warn('[X6Ring] Connect failed:', error);
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

  async reconnectIfRemembered(): Promise<boolean> {
    const address = localStorage.getItem(ADDRESS_KEY);
    if (!this.isAvailable() || !address) return false;
    try {
      let state = await X6Ring.getConnectionState();
      for (let attempt = 0; state.state === 'connecting' && attempt < 20; attempt += 1) {
        await wait(400);
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

  startLiveMeasurement(type: 'heartRate' | 'hrv' | 'spo2') {
    return X6Ring.startLiveMeasurement({ type });
  },

  stopLiveMeasurement() {
    return X6Ring.stopLiveMeasurement();
  },

  async getMetrics(): Promise<HealthMetrics> {
    if (!this.isConnected()) return { ...EMPTY_METRICS, source: 'ring' };
    try {
      await this.sync();
      const [summary, previousSummary] = await Promise.all([
        X6Ring.getDailySummary({ date: today() }),
        X6Ring.getDailySummary({ date: dateDaysAgo(1) }).catch(() => null),
      ]);
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
