import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { HealthMetrics, EMPTY_METRICS } from './types';

interface RingConfig {
  namePrefix: string;
  serviceUUID: string;
  hrvCharacteristic: string;
  pulseCharacteristic: string;
  spo2Characteristic: string;
  temperatureCharacteristic: string;
}

const DEFAULT_RING_CONFIGS: RingConfig[] = [
  {
    namePrefix: 'Ritual',
    serviceUUID: '0000180d-0000-1000-8000-00805f9b34fb',
    hrvCharacteristic: '00002a37-0000-1000-8000-00805f9b34fb',
    pulseCharacteristic: '00002a38-0000-1000-8000-00805f9b34fb',
    spo2Characteristic: '00002a5e-0000-1000-8000-00805f9b34fb',
    temperatureCharacteristic: '00002a1c-0000-1000-8000-00805f9b34fb',
  },
];

let currentDevice: string | null = null;

export const bleRingService = {
  isAvailable(): boolean {
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  },

  isConnected(): boolean {
    return currentDevice !== null;
  },

  getDeviceName(): string | null {
    return currentDevice;
  },

  async scan(): Promise<{ name: string; address: string; rssi: number }[]> {
    try {
      const enabled = await BluetoothSerial.isEnabled();
      if (!enabled.enabled) {
        await BluetoothSerial.enable();
      }
      const result = await BluetoothSerial.scan();
      return result.devices.map(d => ({
        name: d.name || 'Unknown Ring',
        address: d.address,
        rssi: d.rssi,
      }));
    } catch (err) {
      console.warn('[BleRing] Scan failed:', err);
      return [];
    }
  },

  async connect(address: string): Promise<boolean> {
    try {
      await BluetoothSerial.connect({ address });
      currentDevice = address;
      localStorage.setItem('ritual_ring_address', address);
      return true;
    } catch (err) {
      console.warn('[BleRing] Connect failed:', err);
      return false;
    }
  },

  async disconnect(): Promise<void> {
    const saved = localStorage.getItem('ritual_ring_address');
    if (saved) {
      try {
        await BluetoothSerial.disconnect({ address: saved });
      } catch {}
    }
    currentDevice = null;
    localStorage.removeItem('ritual_ring_address');
  },

  async reconnectIfRemembered(): Promise<boolean> {
    const saved = localStorage.getItem('ritual_ring_address');
    if (!saved) return false;
    try {
      const check = await BluetoothSerial.isConnected({ address: saved });
      if (check.connected) {
        currentDevice = saved;
        return true;
      }
    } catch {}
    return false;
  },

  async getMetrics(): Promise<HealthMetrics> {
    if (!currentDevice) {
      return { ...EMPTY_METRICS, source: 'ring' };
    }

    try {
      const readVal = async (charUUID: string): Promise<string | null> => {
        try {
          const result = await BluetoothSerial.read({ address: currentDevice! });
          return result.value;
        } catch {
          return null;
        }
      };

      const [hrvRaw, pulseRaw, spo2Raw, tempRaw] = await Promise.all([
        readVal(DEFAULT_RING_CONFIGS[0].hrvCharacteristic),
        readVal(DEFAULT_RING_CONFIGS[0].pulseCharacteristic),
        readVal(DEFAULT_RING_CONFIGS[0].spo2Characteristic),
        readVal(DEFAULT_RING_CONFIGS[0].temperatureCharacteristic),
      ]);

      return {
        hrv: hrvRaw ? parseInt(hrvRaw, 10) || null : null,
        sleepHours: null,
        steps: null,
        restingHR: pulseRaw ? parseInt(pulseRaw, 10) || null : null,
        spo2: spo2Raw ? parseInt(spo2Raw, 10) || null : null,
        temperature: tempRaw ? parseFloat(tempRaw) || null : null,
        respiratoryRate: null,
        source: 'ring',
        lastSync: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[BleRing] Read metrics failed:', err);
      return { ...EMPTY_METRICS, source: 'ring' };
    }
  },
};
