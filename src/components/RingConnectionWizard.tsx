import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Battery, Bluetooth, Check, ChevronRight, Lock, RefreshCw, Signal, X } from 'lucide-react';
import { bleRingService } from '../services/health/ring';
import type { RingCandidate, RingDeviceInfo } from '../services/health/x6RingPlugin';

interface RingConnectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (device: RingDeviceInfo) => void | Promise<void>;
}

type WizardStep = 'intro' | 'permission' | 'scanning' | 'devices' | 'connecting' | 'success' | 'error';

const connectionStages = [
  'Соединяемся с кольцом',
  'Проверяем модель и прошивку',
  'Настраиваем автоматические измерения',
  'Загружаем данные кольца',
];

export default function RingConnectionWizard({ isOpen, onClose, onConnected }: RingConnectionWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [devices, setDevices] = useState<RingCandidate[]>([]);
  const [selected, setSelected] = useState<RingCandidate | null>(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<RingDeviceInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('intro');
    setDevices([]);
    setSelected(null);
    setStage(0);
    setError('');
    setDeviceInfo(null);
  }, [isOpen]);

  useEffect(() => {
    if (step !== 'connecting') return;
    const timer = window.setInterval(() => setStage(value => Math.min(connectionStages.length - 1, value + 1)), 1700);
    return () => window.clearInterval(timer);
  }, [step]);

  const startScan = async () => {
    if (!bleRingService.isAvailable()) {
      setError('Подключение Ritual Ring доступно в Android-приложении Ritual.');
      setStep('error');
      return;
    }
    try {
      setStep('permission');
      const permission = await bleRingService.getPermissionState();
      const granted = permission.bluetooth === 'granted' ? permission : await bleRingService.requestPermissions();
      if (granted.bluetooth !== 'granted') throw new Error('Разрешите Ritual находить устройства поблизости в настройках Android.');
      if (!granted.bluetoothEnabled) throw new Error('Включите Bluetooth и повторите поиск.');
      setStep('scanning');
      const found = await bleRingService.scan();
      setDevices(found);
      setStep('devices');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStep('error');
    }
  };

  const connect = async (device: RingCandidate) => {
    setSelected(device);
    setStage(0);
    setError('');
    setStep('connecting');
    const ok = await bleRingService.connect(device.address, device.name);
    if (!ok) {
      setError('Кольцо не ответило. Поднесите его ближе, снимите с зарядки и повторите подключение.');
      setStep('error');
      return;
    }
    const info = await bleRingService.getDeviceInfo();
    if (!info) {
      setError('Кольцо подключено, но не передало сведения об устройстве. Повторите синхронизацию.');
      setStep('error');
      return;
    }
    setStage(connectionStages.length - 1);
    setDeviceInfo(info);
    setStep('success');
    await onConnected?.(info);
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-[#070709] text-white flex justify-center overflow-y-auto">
      <div className="relative w-full max-w-md min-h-full px-6 py-8 flex flex-col">
        <button onClick={onClose} className="absolute right-5 top-5 w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center z-10" aria-label="Закрыть">
          <X className="w-4 h-4 text-white/50" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center">
              <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
                <motion.div animate={{ scale: [1, 1.35, 1], opacity: [.25, .05, .25] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 rounded-full border border-emerald-200/20" />
                <div className="w-20 h-20 rounded-full border-[8px] border-emerald-100/70 shadow-[0_0_45px_rgba(167,243,208,.18)]" />
              </div>
              <p className="text-[10px] text-emerald-200/60 font-mono tracking-[.22em] uppercase text-center">Ritual Ring</p>
              <h2 className="text-3xl font-display text-center mt-3">Подключите кольцо</h2>
              <p className="text-sm text-white/50 text-center leading-relaxed mt-4">Сон, пульс, ВСР, кислород, температура и активность будут синхронизироваться напрямую с кольца.</p>
              <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 flex items-start gap-3">
                <Lock className="w-4 h-4 text-white/40 mt-0.5" />
                <p className="text-[11px] text-white/45 leading-relaxed">Подробные измерения остаются на телефоне. В облако отправляются только разрешённые дневные итоги.</p>
              </div>
              <button onClick={startScan} className="mt-7 h-14 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 active:scale-[.98]">
                <Bluetooth className="w-5 h-5" /> Найти моё кольцо
              </button>
            </motion.div>
          )}

          {(step === 'permission' || step === 'scanning') && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <motion.div animate={{ scale: [1, 2.2], opacity: [.35, 0] }} transition={{ duration: 1.8, repeat: Infinity }} className="absolute w-12 h-12 rounded-full border border-emerald-200/30" />
                <Bluetooth className="w-8 h-8 text-emerald-100/70" />
              </div>
              <h2 className="text-xl mt-6">{step === 'permission' ? 'Разрешение Bluetooth' : 'Ищем кольцо рядом'}</h2>
              <p className="text-xs text-white/45 mt-2">{step === 'permission' ? 'Android попросит доступ к ближайшим устройствам' : 'Поднесите кольцо к телефону на расстояние до одного метра'}</p>
            </motion.div>
          )}

          {step === 'devices' && (
            <motion.div key="devices" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex-1 pt-16">
              <p className="text-[10px] font-mono tracking-widest text-white/35 uppercase">Устройства поблизости</p>
              <h2 className="text-2xl mt-2">Выберите кольцо</h2>
              <p className="text-xs text-white/45 mt-2">Сначала показаны устройства с самым сильным сигналом.</p>
              <div className="mt-7 flex flex-col gap-3">
                {devices.map(device => (
                  <button key={device.address} onClick={() => connect(device)} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex items-center gap-4 text-left active:scale-[.99]">
                    <div className="w-11 h-11 rounded-full border-4 border-emerald-100/55" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/80 truncate">{device.name || 'BLE-кольцо'}</p>
                      <p className="text-[10px] text-white/35 font-mono mt-1">{device.recognized ? 'Ritual Ring распознано' : device.address}</p>
                    </div>
                    <div className="text-right"><Signal className="w-4 h-4 text-white/40 ml-auto" /><p className="text-[9px] text-white/35 mt-1">{device.nearby ? 'рядом' : 'далеко'}</p></div>
                    <ChevronRight className="w-4 h-4 text-white/25" />
                  </button>
                ))}
                {devices.length === 0 && <div className="rounded-2xl border border-white/[0.06] p-6 text-center text-xs text-white/45">Кольцо не найдено. Снимите его с зарядки и держите рядом с телефоном.</div>}
              </div>
              <button onClick={startScan} className="mt-5 w-full h-12 rounded-xl bg-white/[0.05] text-xs text-white/60 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Повторить поиск</button>
            </motion.div>
          )}

          {step === 'connecting' && (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center">
              <div className="w-20 h-20 rounded-full border-[7px] border-emerald-100/60 mx-auto relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} className="absolute -inset-3 rounded-full border border-transparent border-t-emerald-200/70" /></div>
              <h2 className="text-xl text-center mt-7">Подключаем {selected?.name}</h2>
              <div className="mt-8 flex flex-col gap-3">
                {connectionStages.map((label, index) => <div key={label} className={`flex items-center gap-3 text-xs ${index <= stage ? 'text-white/75' : 'text-white/25'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center ${index < stage ? 'bg-emerald-300/15' : 'bg-white/[0.04]'}`}>{index < stage ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : index === stage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>{index + 1}</span>}</div>{label}</div>)}
              </div>
            </motion.div>
          )}

          {step === 'success' && deviceInfo && (
            <motion.div key="success" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-300/10 mx-auto flex items-center justify-center"><Check className="w-9 h-9 text-emerald-200" /></div>
              <h2 className="text-2xl mt-6">Кольцо подключено</h2>
              <p className="text-xs text-white/45 mt-2">{deviceInfo.name} готово к ежедневной синхронизации</p>
              <div className="grid grid-cols-2 gap-3 mt-7 text-left">
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4"><Battery className="w-4 h-4 text-white/40" /><p className="text-lg mt-2">{deviceInfo.batteryLevel >= 0 ? `${deviceInfo.batteryLevel}%` : '—'}</p><p className="text-[10px] text-white/35">заряд</p></div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4"><Activity className="w-4 h-4 text-white/40" /><p className="text-sm mt-3 truncate">{deviceInfo.firmwareVersion || 'Определяется'}</p><p className="text-[10px] text-white/35">прошивка</p></div>
              </div>
              <button onClick={onClose} className="mt-7 h-14 rounded-2xl bg-white text-black font-semibold">Готово</button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-amber-300/10 mx-auto flex items-center justify-center"><Bluetooth className="w-7 h-7 text-amber-200/70" /></div>
              <h2 className="text-xl mt-6">Не удалось подключить</h2>
              <p className="text-xs text-white/50 leading-relaxed mt-3">{error}</p>
              <button onClick={startScan} className="mt-7 h-13 rounded-2xl bg-white text-black font-semibold">Попробовать снова</button>
              <button onClick={onClose} className="mt-3 h-11 text-xs text-white/40">Закрыть</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
