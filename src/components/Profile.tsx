import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Shield, Heart, Bell, MessageSquare, LogOut, Trash2,
  Gift, Users, Edit3, Check, Moon, Sun, Bluetooth,
  RefreshCw, Battery, Cpu, AlertCircle, Activity, Sparkles, ShoppingBag, Clock
} from 'lucide-react';
import { bleRingService } from '../services/health/ring';
import { clearHealthCache } from '../services/health/manager';
import { connectHealthSource } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import { notificationService, rescheduleAll } from '../services/notifications';
import { STORAGE_KEYS } from '../services/notifications';
import SelectModal from './SelectModal';
import TimePickerModal, { normalizeTime } from './TimePickerModal';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';
import { getAuthDisplayName, getCurrentAuthUser, onAuthChanged, signOutAuth } from '../services/supabase/auth';

interface ProfileProps {
  onOpenSubscription: () => void;
  isSubscribed: boolean;
  onResetAll: () => void;
  onSignOut?: () => void;
  onSyncMetrics?: (metrics: { hrv: number; sleep: number; activity: number; pulse: number }) => void;
  stats?: any;
  healthSource?: 'none' | 'ring' | 'healthapp';
  onRefreshHealth?: () => void;
}

export default function Profile({ onOpenSubscription, isSubscribed, onResetAll, onSignOut, onSyncMetrics, stats, healthSource, onRefreshHealth }: ProfileProps) {
  const [userName, setUserName] = useState(() => localStorage.getItem('ritual_user_name') || 'Гость Ritual');
  const [authDisplayName, setAuthDisplayName] = useState('Гость Ritual');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const val = localStorage.getItem(STORAGE_KEYS.enabled);
    return val === null ? true : val === 'true';
  });
  const [reminderTime, setReminderTime] = useState(() => {
    return normalizeTime(localStorage.getItem(STORAGE_KEYS.reminderTime), '21:00');
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [userGender, setUserGender] = useState(() => localStorage.getItem('ritual_user_gender') || 'unspecified');

  const [isHealthKitConnected, setIsHealthKitConnected] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ritual_healthkit_connected') === 'true' : false
  );
  const [isHealthConnectConnected, setIsHealthConnectConnected] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ritual_healthconnect_connected') === 'true' : false
  );
  const [isBleRingConnected, setIsBleRingConnected] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ritual_ble_ring_connected') === 'true' : false
  );
  const [connectedRingName, setConnectedRingName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ritual_connected_ring_name') || '' : ''
  );

  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showBleScanner, setShowBleScanner] = useState(false);
  const [showHealthKitPermissions, setShowHealthKitPermissions] = useState(false);
  const [showHealthConnectPermissions, setShowHealthConnectPermissions] = useState(false);

  const [livePulse, setLivePulse] = useState(64);
  const [bleScanning, setBleScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<{name: string, mac: string, signal: number}[]>([]);
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStep, setSyncStep] = useState('');

  const isAnyModalOpen = showBleScanner || showHealthKitPermissions || showHealthConnectPermissions || isSyncing;
  const profilePlatform = healthService.getPlatform();
  const showAppleHealth = profilePlatform === 'ios';

  useEffect(() => {
    let mounted = true;

    const applyDisplayName = (displayName: string) => {
      setAuthDisplayName(displayName);
      if (!localStorage.getItem('ritual_user_name')) {
        setUserName(displayName);
        setTempName(displayName);
      }
    };

    getCurrentAuthUser()
      .then(user => {
        if (!mounted) return;
        applyDisplayName(getAuthDisplayName(user));
      })
      .catch(() => {});

    const unsubscribe = onAuthChanged(session => {
      if (!mounted) return;
      applyDisplayName(getAuthDisplayName(session?.user ?? null));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!isBleRingConnected) return;
    const interval = setInterval(() => {
      setLivePulse(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next < 55 ? 55 : next > 85 ? 85 : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isBleRingConnected]);

  const handleGenderChange = (newGender: string) => {
    setUserGender(newGender);
    localStorage.setItem('ritual_user_gender', newGender);
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setUserName(trimmed);
      localStorage.setItem('ritual_user_name', trimmed);
    }
    setIsEditingName(false);
  };

  const handleSignOut = async () => {
    try {
      await signOutAuth();
      localStorage.removeItem('ritual_user_name');
      setAuthDisplayName('Гость Ritual');
      setUserName('Гость Ritual');
      setTempName('Гость Ritual');
      onSignOut?.();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const handleRealBluetoothConnect = async () => {
    if (!bleRingService.isAvailable()) {
      setShowBleScanner(true);
      setBleScanning(true);
      setDiscoveredDevices([]);
      return;
    }
    try {
      setBleScanning(true);
      setConnectingDevice('Сканирование...');
      const devices = await bleRingService.scan();
      if (devices.length > 0) {
        setDiscoveredDevices(devices.map(d => ({ name: d.name, mac: d.address, signal: Math.min(100, Math.max(0, (d.rssi + 100)) * 2) })));
        setShowBleScanner(true);
      } else {
        setConnectingDevice('Устройства не найдены');
        setTimeout(() => setConnectingDevice(null), 2000);
      }
    } catch (err) {
      setBleScanning(false);
      setConnectingDevice(null);
    }
  };

  const connectSimulatedDevice = async (deviceAddress: string) => {
    setConnectingDevice(deviceAddress);
    if (bleRingService.isAvailable()) {
      const ok = await bleRingService.connect(deviceAddress);
      if (ok) {
        setIsBleRingConnected(true);
        setConnectedRingName(deviceAddress);
        if (onRefreshHealth) onRefreshHealth();
      }
    } else {
      await new Promise(r => setTimeout(r, 1800));
      setIsBleRingConnected(true);
      setConnectedRingName(deviceAddress);
      if (onRefreshHealth) onRefreshHealth();
    }
    clearHealthCache();
    setConnectingDevice(null);
    setBleScanning(false);
    setShowBleScanner(false);
  };

  const handleDisconnectRing = async () => {
    await bleRingService.disconnect();
    setIsBleRingConnected(false);
    setConnectedRingName('');
    clearHealthCache();
    if (onRefreshHealth) onRefreshHealth();
  };

  const startSyncSequence = async (type: 'healthkit' | 'healthconnect') => {
    const result = await connectHealthSource(type, {
      onRefresh: onRefreshHealth,
      onSyncing: setIsSyncing,
      onProgress: setSyncProgress,
      onStep: setSyncStep,
    });

    if (result.ok) {
      if (type === 'healthkit') setIsHealthKitConnected(true);
      else setIsHealthConnectConnected(true);
    }
  };

  const handleGrantHealthPermissions = async (type: 'healthkit' | 'healthconnect') => {
    if (type === 'healthkit') {
      setShowHealthKitPermissions(false);
    } else {
      setShowHealthConnectPermissions(false);
    }

    startSyncSequence(type);
  };

  const handleDisconnectHealth = (type: 'healthkit' | 'healthconnect') => {
    if (type === 'healthkit') {
      setIsHealthKitConnected(false);
    } else {
      setIsHealthConnectConnected(false);
    }
    clearHealthCache();
    if (onRefreshHealth) onRefreshHealth();
  };

  return (
    <div className="w-full flex flex-col gap-5 pb-28 select-none">

      {/* SECTION 1: Личность */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden flex flex-col items-center text-center p-6 relative">
        {/* Photo background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-[0.06]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#070709]/90" />
        </div>

        {/* Avatar */}
        <div className="relative mb-4 z-10">
          <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center border border-white/[0.08]">
            <User className="w-10 h-10 text-white/40" />
          </div>
          {isSubscribed && (
            <span className="absolute -bottom-1 -right-1 bg-white/[0.1] border border-white/[0.08] text-white/60 text-[8px] uppercase tracking-wider py-0.5 px-1.5 rounded-full">
              Plus
            </span>
          )}
        </div>

        {/* Edit Name */}
        <div className="flex items-center gap-2 mb-2 z-10">
          {isEditingName ? (
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="bg-transparent text-sm font-normal text-white/80 px-2 focus:outline-none w-32"
                maxLength={20}
              />
              <button
                onClick={handleSaveName}
                className="w-7 h-7 rounded-md bg-white/[0.08] flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-base font-semibold text-white/90">{userName}</h3>
              <button
                onClick={() => { setTempName(userName); setIsEditingName(true); }}
                className="text-white/60 p-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        {authDisplayName !== userName && (
          <p className="text-[10px] text-white/35 z-10 mb-2 max-w-[240px] truncate">
            Аккаунт: {authDisplayName}
          </p>
        )}

        {/* Subscription */}
        {isSubscribed ? (
          <div className="py-1 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] z-10">
            <span className="text-[10px] text-white/55 uppercase tracking-wider font-semibold">Ritual Plus</span>
          </div>
        ) : (
          <button
            onClick={onOpenSubscription}
            className="w-full mt-3 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2 text-[11px] text-white/75 font-semibold z-10"
          >
            <Shield className="w-3.5 h-3.5 text-white/40" />
            <span>Активировать Ritual Plus</span>
          </button>
        )}
      </div>

      {/* SECTION 2: Источники данных */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-white/80">Источники биометрии</span>
            <span className="text-[10px] text-white/60 font-medium">Синхронизация данных</span>
          </div>
        </div>

        {/* Status */}
        {healthSource !== 'none' ? (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-white/60 font-medium">Поток активен</span>
              <span className="text-[10px] text-white/60">
                {healthSource === 'ring' ? 'Кольцо Ritual' : 'Приложение здоровья'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-white/40" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-white/55 font-semibold">Не подключено</span>
              <span className="text-[10px] text-white/50 font-medium">Подключите источник для расчёта Сияния</span>
            </div>
          </div>
        )}

        {showAppleHealth && (
          <>
        {/* Apple HealthKit */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex justify-between items-center text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/60 text-xs">
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/60">Apple HealthKit</span>
              <span className="text-[10px] text-white/50">
                {healthSource === 'healthapp' ? 'Синхронизировано' : 'Данные здоровья iOS'}
              </span>
            </div>
          </div>
          {healthSource === 'healthapp' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startSyncSequence('healthkit')}
                className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50"
                title="Синхронизировать"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDisconnectHealth('healthkit')}
                className="py-1 px-2 rounded-lg bg-white/[0.04] text-[10px] text-white/40"
              >
                Откл.
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHealthKitPermissions(true)}
              className="py-1 px-3 rounded-lg bg-white/[0.04] text-[10px] text-white/50"
            >
              Связать
            </button>
          )}
        </div>

          </>
        )}

        {!showAppleHealth && (
          <>
        {/* Google Health Connect */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex justify-between items-center text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <Heart className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/60">Health Connect</span>
              <span className="text-[10px] text-white/50">
                {healthSource === 'healthapp' ? 'Синхронизировано' : 'Данные здоровья Android'}
              </span>
            </div>
          </div>
          {healthSource === 'healthapp' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startSyncSequence('healthconnect')}
                className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDisconnectHealth('healthconnect')}
                className="py-1 px-2 rounded-lg bg-white/[0.04] text-[10px] text-white/40"
              >
                Откл.
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHealthConnectPermissions(true)}
              className="py-1 px-3 rounded-lg bg-white/[0.04] text-[10px] text-white/50"
            >
              Связать
            </button>
          )}
        </div>

          </>
        )}

        {/* BLE Ring */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col gap-3 text-left">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Bluetooth className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white/60">Умное кольцо</span>
                <span className="text-[10px] text-white/50">
                  {isBleRingConnected ? connectedRingName : 'Bluetooth LE'}
                </span>
              </div>
            </div>
            {isBleRingConnected ? (
              <button
                onClick={handleDisconnectRing}
                className="py-1 px-2 rounded-lg bg-white/[0.04] text-[10px] text-white/40"
              >
                Отключить
              </button>
            ) : (
              <button
                onClick={handleRealBluetoothConnect}
                className="py-1 px-3 rounded-lg bg-white/[0.08] text-[10px] text-white/60 font-medium"
              >
                Поиск
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {isBleRingConnected && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 text-white/40">
                    <Battery className="w-3.5 h-3.5" />
                    <span>88%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Activity className="w-3 h-3" />
                    <span>{livePulse} уд/мин</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ring CTA Banner */}
      <AnimatePresence initial={false}>
        {healthSource === 'none' && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[#e8e0d4]/[0.12] bg-[#e8e0d4]/[0.04] p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e8e0d4]/[0.08] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-[#e8e0d4]/60" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-[#e8e0d4]/80">Для полного опыта</span>
                  <span className="text-[10px] text-white/60 leading-relaxed">
                    Кольцо Ritual измеряет ВСР, SpO₂, температуру и сон — автоматически, без телефонов.
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.open('https://ritual.store', '_blank')}
                className="w-full py-2.5 rounded-xl bg-[#e8e0d4]/[0.1] border border-[#e8e0d4]/[0.15] text-[11px] text-[#e8e0d4]/80 font-medium flex items-center justify-center gap-1.5 hover:bg-[#e8e0d4]/[0.15] transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Купить кольцо →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 3: Друзья и подарки */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Users className="w-4 h-4 text-white/40" />
          </div>
          <span className="text-xs font-semibold text-white/80">Друзья и подарки</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex flex-col items-start gap-1 text-left">
            <Gift className="w-4 h-4 text-white/60" />
            <span className="text-xs font-semibold text-white/80 mt-1">Подарочный код</span>
            <span className="text-[10px] text-white/55 font-medium">Активировать Plus</span>
          </button>
          <button className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex flex-col items-start gap-1 text-left">
            <Heart className="w-4 h-4 text-white/60" />
            <span className="text-xs font-semibold text-white/80 mt-1">Пригласить друга</span>
            <span className="text-[10px] text-white/55 font-medium">7 дней премиума</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: Настройки */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Bell className="w-4 h-4 text-white/40" />
          </div>
          <span className="text-xs font-semibold text-white/80">Настройки</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
          <span className="text-xs text-white/65 font-medium">Уведомления</span>
          <button
            onClick={async () => {
              const next = !notificationsEnabled;
              if (next) {
                const granted = await notificationService.requestNotificationAccess();
                if (!granted && notificationService.isNative()) return;
              }
              setNotificationsEnabled(next);
              localStorage.setItem(STORAGE_KEYS.enabled, next ? 'true' : 'false');
              requestPrivacySafeSync();
              if (next) {
                window.setTimeout(() => {
                  rescheduleAll().catch(e => console.warn('[Profile] Failed to reschedule notifications:', e));
                }, 250);
              } else {
                await notificationService.cancelAll();
              }
            }}
            className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-colors ${
              notificationsEnabled ? 'bg-white/[0.12]' : 'bg-white/[0.04]'
            }`}
          >
            <div className={`bg-white/60 w-4 h-4 rounded-full transition-transform ${
              notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {notificationsEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                <span className="text-xs text-white/65 font-medium">Напоминание в</span>
                <button
                  onClick={() => setShowTimePicker(true)}
                  className="flex items-center gap-1.5 bg-transparent text-xs text-white/50 focus:outline-none cursor-pointer hover:text-white/70 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  {reminderTime}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
          <span className="text-xs text-white/65 font-medium">Пол</span>
          <button
            onClick={() => setShowGenderModal(true)}
            className="bg-transparent text-xs text-white/50 focus:outline-none cursor-pointer hover:text-white/70 transition-colors"
          >
            {userGender === 'male' ? 'Мужчина' : userGender === 'female' ? 'Женщина' : 'Не указан'}
          </button>
        </div>

        <SelectModal
          isOpen={showGenderModal}
          onClose={() => setShowGenderModal(false)}
          title="Пол"
          options={[
            { value: 'male', label: 'Мужчина' },
            { value: 'female', label: 'Женщина' },
            { value: 'unspecified', label: 'Не указан' },
          ]}
          selectedValue={userGender}
          onSelect={(v) => handleGenderChange(v)}
        />

      </div>

      {/* SECTION 5: Обратная связь */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white/40" />
          </div>
          <span className="text-xs font-semibold text-white/80">Поддержка</span>
        </div>
        <button className="py-1.5 px-3 rounded-lg bg-white/[0.06] text-[11px] text-white/70 font-medium">
          Написать
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onResetAll}
          className="w-full h-11 rounded-xl bg-white/[0.02] border border-white/[0.04] text-white/55 hover:text-white/70 transition-all text-[11px] font-medium flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Сбросить прогресс</span>
        </button>
        <button
          onClick={() => void handleSignOut()}
          className="w-full h-11 rounded-xl bg-white/[0.02] border border-white/[0.04] text-white/70 hover:text-white/80 transition-all text-[11px] font-medium flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Выйти</span>
        </button>
      </div>

      {/* OVERLAYS & MODALS */}
      <AnimatePresence>
        <TimePickerModal
          isOpen={showTimePicker}
          title="Время напоминания"
          subtitle="Ежедневное напоминание о практике"
          value={reminderTime}
          defaultValue="21:00"
          minuteStep={5}
          onClose={() => setShowTimePicker(false)}
          onConfirm={(value) => {
            setReminderTime(value);
            localStorage.setItem(STORAGE_KEYS.reminderTime, value);
            setShowTimePicker(false);
            requestPrivacySafeSync();
            if (notificationsEnabled) {
              rescheduleAll().catch(e => console.warn('[Profile] Failed to reschedule reminder time:', e));
            }
          }}
        />

        {/* Time Picker Modal */}
        {false && showTimePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0e0e11] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 text-center"
            >
              <div className="flex gap-3 items-center border-b border-white/[0.04] pb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-white/70">Время напоминания</h3>
                  <span className="text-[10px] text-white/50">Ежедневное напоминание о практике</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {['08:00', '12:00', '18:00', '20:00', '21:00', '22:00'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setReminderTime(t);
                      localStorage.setItem(STORAGE_KEYS.reminderTime, t);
                      setShowTimePicker(false);
                      requestPrivacySafeSync();
                      if (notificationsEnabled) {
                        rescheduleAll().catch(e => console.warn('[Profile] Failed to reschedule reminder time:', e));
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-sm font-mono transition-all ${
                      reminderTime === t
                        ? 'bg-white/[0.08] border border-white/[0.15] text-white'
                        : 'bg-white/[0.02] border border-white/[0.04] text-white/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowTimePicker(false)}
                className="h-10 rounded-xl bg-white/[0.04] text-[11px] text-white/50"
              >
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* BLE Scanner Modal */}
        {showBleScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0e0e11] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 text-center"
            >
              <div className="relative h-20 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.8, 2.2], opacity: [0.4, 0.15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-10 h-10 rounded-full border border-white/[0.08]"
                />
                <div className="relative z-10 w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-white/40" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-white/70">Поиск BLE колец</h3>
                <p className="text-[11px] text-white/60 mt-1">
                  {connectingDevice ? `Подключение к ${connectingDevice}...` : 'Убедитесь, что кольцо заряжено'}
                </p>
              </div>

              {connectingDevice ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-white/60 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                  {discoveredDevices.map((device, i) => (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      onClick={() => connectSimulatedDevice(device.mac)}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex justify-between items-center"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-white/60">{device.name}</span>
                        <span className="text-[10px] text-white/50 mt-0.5">{device.mac}</span>
                      </div>
                      <span className="text-[10px] text-white/40 bg-white/[0.04] py-0.5 px-2 rounded-full">{device.signal}%</span>
                    </motion.button>
                  ))}
                  {discoveredDevices.length === 0 && (
                    <div className="py-6 text-white/40 text-[11px]">Сканирование...</div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setShowBleScanner(false); setBleScanning(false); }}
                className="h-10 rounded-xl bg-white/[0.04] text-[11px] text-white/50"
              >
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Apple HealthKit Permissions */}
        {showHealthKitPermissions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0e0e11] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 text-left"
            >
              <div className="flex gap-3 items-center border-b border-white/[0.04] pb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/60 text-sm">{'\uF8FF'}</div>
                <div>
                  <h3 className="text-sm font-medium text-white/70">Apple Health</h3>
                  <span className="text-[10px] text-white/50">Запрос разрешений</span>
                </div>
              </div>

              <p className="text-[11px] text-white/40 leading-relaxed font-normal">
                Разрешите Ritual читать данные здоровья для расчёта Индекса Сияния:
              </p>

              <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
                {['ВСР', 'Анализ сна', 'Шаги', 'Пульс покоя'].map((label, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-[11px] text-white/50">{label}</span>
                    <Check className="w-3.5 h-3.5 text-white/60" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowHealthKitPermissions(false)}
                  className="flex-1 h-10 rounded-xl bg-white/[0.04] text-[11px] text-white/40"
                >Отказать</button>
                <button
                  onClick={() => handleGrantHealthPermissions('healthkit')}
                  className="flex-1 h-10 rounded-xl bg-white/[0.08] text-[11px] text-white/70 font-medium"
                >Разрешить</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Google Health Connect Permissions */}
        {showHealthConnectPermissions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0e0e11] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4 text-left"
            >
              <div className="flex gap-3 items-center border-b border-white/[0.04] pb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                  <Heart className="w-4.5 h-4.5 text-white/60" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70">Health Connect</h3>
                  <span className="text-[10px] text-white/50">Запрос разрешений</span>
                </div>
              </div>

              <p className="text-[11px] text-white/40 leading-relaxed font-normal">
                Разрешите Ritual читать данные здоровья Android:
              </p>

              <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
                {['Активность', 'Сон', 'ЧСС и ВСР'].map((label, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-[11px] text-white/50">{label}</span>
                    <Check className="w-3.5 h-3.5 text-white/60" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowHealthConnectPermissions(false)}
                  className="flex-1 h-10 rounded-xl bg-white/[0.04] text-[11px] text-white/40"
                >Отказать</button>
                <button
                  onClick={() => handleGrantHealthPermissions('healthconnect')}
                  className="flex-1 h-10 rounded-xl bg-white/[0.08] text-[11px] text-white/70 font-medium"
                >Разрешить</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Sync Progress */}
        {isSyncing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#070709]/95 flex flex-col justify-center items-center p-6"
          >
            <div className="w-full max-w-xs flex flex-col items-center gap-5 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-white/[0.04] border-t-white/40"
                />
                <Activity className="w-5 h-5 text-white/60" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-white/60">Синхронизация</h3>
                <span className="text-[10px] text-white/60 animate-pulse">Импорт показателей...</span>
              </div>

              <div className="w-full flex flex-col gap-2">
                <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white/30"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-white/40">
                  <span>SYNC</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
              </div>

              <motion.span
                key={syncStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-white/40 font-normal bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-xl"
              >
                {syncStep}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
