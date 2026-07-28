import { useState, useEffect, useCallback, useMemo } from 'react';
import { App as CapApp } from '@capacitor/app';
import {
  EMPTY_AVAILABILITY_BY_METRIC,
  EMPTY_HISTORY_BY_METRIC,
  HealthAvailabilityByMetric,
  HealthHistoryByMetric,
  HealthMetrics,
  EMPTY_METRICS,
} from '../services/health/types';
import { fetchHealthData, DataSource, clearHealthCache } from '../services/health/manager';
import { healthService } from '../services/health/health.service';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { bleRingService } from '../services/health/ring';
import { calculateShine, ShineBreakdown } from '../services/health/shine';
import { scheduleHealthInsight } from '../services/notifications';

interface UseHealthDataReturn {
  metrics: HealthMetrics;
  historyByMetric: HealthHistoryByMetric;
  availabilityByMetric: HealthAvailabilityByMetric;
  source: DataSource;
  hasRing: boolean;
  hasHealthApp: boolean;
  loading: boolean;
  shine: ShineBreakdown;
  refresh: () => Promise<void>;
  connectHealthApp: () => Promise<boolean>;
  disconnectHealthApp: () => void;
  connectRing: (address: string) => Promise<boolean>;
  disconnectRing: () => Promise<void>;
  scanRings: () => Promise<{ name: string; address: string; rssi: number }[]>;
}

function getPracticesCompleted(): number {
  try {
    const stats = JSON.parse(localStorage.getItem('ritual_stats') || '{}');
    return stats.completedCount || 0;
  } catch {
    return 0;
  }
}

export function useHealthData(): UseHealthDataReturn {
  const [state, setState] = useState<HealthMetrics>({ ...EMPTY_METRICS });
  const [historyByMetric, setHistoryByMetric] = useState<HealthHistoryByMetric>({ ...EMPTY_HISTORY_BY_METRIC });
  const [availabilityByMetric, setAvailabilityByMetric] = useState<HealthAvailabilityByMetric>({ ...EMPTY_AVAILABILITY_BY_METRIC });
  const [source, setSource] = useState<DataSource>('none');
  const [hasRing, setHasRing] = useState(false);
  const [hasHealthApp, setHasHealthApp] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHealthData();
      setState(prevMetrics => {
        if (prevMetrics.hrv !== null && prevMetrics.hrv > 0 && result.metrics.hrv !== null && result.metrics.hrv > 0) {
          const change = Math.round(((result.metrics.hrv - prevMetrics.hrv) / prevMetrics.hrv) * 100);
          if (Math.abs(change) > 10) {
            scheduleHealthInsight(change);
          }
        }
        return result.metrics;
      });
      setHistoryByMetric(result.historyByMetric);
      setAvailabilityByMetric(result.availabilityByMetric);
      setSource(result.source);
      setHasRing(result.hasRing);
      setHasHealthApp(result.hasHealthApp);
    } catch (err) {
      console.warn('[useHealthData] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bleRingService.reconnectIfRemembered()
      .then(isConnected => {
        if (isConnected) clearHealthCache();
      })
      .finally(load);
  }, [load]);

  useEffect(() => {
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      bleRingService.reconnectIfRemembered()
        .then(isConnected => isConnected ? bleRingService.sync() : undefined)
        .then(() => {
          clearHealthCache();
          return load();
        })
        .catch(error => console.warn('[useHealthData] Ritual Ring foreground sync failed:', error));
    });
    return () => { listener.then(handle => handle.remove()); };
  }, [load]);

  const refresh = useCallback(async () => {
    clearHealthCache();
    await load();
  }, [load]);

  const connectHealthApp = useCallback(async (): Promise<boolean> => {
    const type: HealthConnectSourceType = healthService.getPlatform() === 'ios' ? 'healthkit' : 'healthconnect';
    const result = await connectHealthSource(type, { onRefresh: refresh });
    return result.ok;
  }, [refresh]);

  const disconnectHealthApp = useCallback(() => {
    clearHealthCache();
    setState({ ...EMPTY_METRICS });
    setHistoryByMetric({ ...EMPTY_HISTORY_BY_METRIC });
    setAvailabilityByMetric({ ...EMPTY_AVAILABILITY_BY_METRIC });
    setSource('none');
    setHasHealthApp(false);
  }, []);

  const connectRing = useCallback(async (address: string): Promise<boolean> => {
    const ok = await bleRingService.connect(address);
    if (ok) {
      setHasRing(true);
      await refresh();
    }
    return ok;
  }, [refresh]);

  const disconnectRing = useCallback(async () => {
    await bleRingService.disconnect();
    setHasRing(false);
    await refresh();
  }, [refresh]);

  const scanRings = useCallback(async () => {
    return bleRingService.scan();
  }, []);

  const shine = useMemo(() => {
    void getPracticesCompleted();
    const age = Number(localStorage.getItem('ritual_user_age'));
    return calculateShine(state, {
      historyByMetric,
      age: Number.isFinite(age) && age >= 18 ? age : null,
      gender: (localStorage.getItem('ritual_user_gender') as 'male' | 'female' | 'unspecified') || 'unspecified',
      cycleDay: Number(localStorage.getItem('ritual_cycle_day')) || null,
      cyclePhase: (localStorage.getItem('ritual_cycle_phase') as 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | null),
      pregnancyMode: localStorage.getItem('ritual_pregnancy_mode') === 'true',
    });
  }, [state, historyByMetric]);

  return {
    metrics: state,
    historyByMetric,
    availabilityByMetric,
    source,
    hasRing,
    hasHealthApp,
    loading,
    shine,
    refresh,
    connectHealthApp,
    disconnectHealthApp,
    connectRing,
    disconnectRing,
    scanRings,
  };
}
