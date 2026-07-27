import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type RingDataType = 'sleep' | 'activity' | 'heartRate' | 'hrv' | 'spo2' | 'temperature';
export type RingConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RingCandidate {
  name: string;
  address: string;
  rssi: number;
  nearby: boolean;
  recognized?: boolean;
}

export interface RingDeviceInfo {
  address: string | null;
  name: string;
  state: RingConnectionState;
  batteryLevel: number;
  firmwareVersion: string | null;
  lastSync: string | null;
  capabilities: RingDataType[];
}

export interface RingDailySummary {
  date: string;
  hrv: number | null;
  sleepHours: number | null;
  steps: number | null;
  restingHR: number | null;
  spo2: number | null;
  temperature: number | null;
  distance: number | null;
  calories: number | null;
  activeMinutes: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  spo2Min: number | null;
  spo2Max: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepStages: Array<{ stage: 'awake' | 'light' | 'deep' | 'rem' | 'unknown'; minutes: number }>;
  sleepIntervals: Array<{ start: string; end: string; stage: 'awake' | 'light' | 'deep' | 'rem' | 'unknown' }>;
  workouts: Array<{ start: string; type: string; durationMinutes: number; calories: number | null; heartRate: number | null }>;
  batteryLevel: number;
  lastSync: string | null;
}

export interface RingPoint {
  timestamp: string;
  value: number;
  quality: 'device' | 'invalid';
  source: 'ring:ritual';
}

interface X6RingPluginApi {
  getPermissionState(): Promise<{ bluetooth: 'granted' | 'prompt' | 'denied'; bluetoothEnabled: boolean }>;
  requestPermissions(): Promise<{ bluetooth: 'granted' | 'prompt' | 'denied'; bluetoothEnabled: boolean }>;
  scan(options?: { timeoutMs?: number }): Promise<{ devices: RingCandidate[] }>;
  connect(options: { address: string; name?: string }): Promise<RingDeviceInfo>;
  disconnect(): Promise<void>;
  forgetDevice(): Promise<void>;
  getConnectionState(): Promise<{ state: RingConnectionState; address: string | null; remembered: boolean }>;
  getDeviceInfo(): Promise<RingDeviceInfo>;
  configureAutoMonitoring(options: { enabled: boolean; intervalMinutes: number; startHour?: number; endHour?: number; weekMask?: number }): Promise<{ configured: boolean }>;
  sync(options?: { from?: string; types?: RingDataType[] }): Promise<{ lastSync: string; records: number }>;
  getDailySummary(options: { date: string }): Promise<RingDailySummary>;
  getSeries(options: { type: RingDataType; from: number; to: number; aggregation?: 'raw' | 'hour' | 'day' }): Promise<{ points: RingPoint[] }>;
  startLiveMeasurement(options: { type: 'heartRate' | 'hrv' | 'spo2' }): Promise<void>;
  stopLiveMeasurement(): Promise<void>;
  addListener(eventName: string, listener: (event: any) => void): Promise<PluginListenerHandle>;
}

export const X6Ring = registerPlugin<X6RingPluginApi>('X6Ring');
