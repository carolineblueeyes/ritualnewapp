import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Battery, Bluetooth, Check, ChevronRight, Lock, RefreshCw, Signal, X } from 'lucide-react';
import { bleRingService } from '../services/health/ring';
import type { RingCandidate, RingDeviceInfo } from '../services/health/x6RingPlugin';
import Ring3DCanvas from './Ring3DCanvas';

interface RingConnectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (device: RingDeviceInfo) => void | Promise<void>;
}

type WizardStep = 'intro' | 'permission' | 'scanning' | 'devices' | 'connecting' | 'success' | 'error';

const connectionStages = [
  'Соединяемся по Bluetooth',
  'Читаем сведения о кольце',
  'Подготавливаем показатели',
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

  const startScan = async () => {
    setError('');
    setDevices([]);
    if (!bleRingService.isAvailable()) {
      setError('Подключение Ritual Ring доступно в Android-приложении Ritual.');
      setStep('error');
      return;
    }

    try {
      setStep('permission');
      const permission = await bleRingService.getPermissionState();
      const granted = permission.bluetooth === 'granted' ? permission : await bleRingService.requestPermissions();
      if (granted.bluetooth !== 'granted') {
        throw new Error('Разрешите Ritual находить устройства поблизости в настройках Android.');
      }
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

    try {
      const connected = await bleRingService.connect(device.address, device.name);
      if (!connected) throw new Error('Кольцо не ответило. Поднесите его ближе, снимите с зарядки и попробуйте снова.');

      setStage(1);
      const info = await bleRingService.getDeviceInfo();
      if (!info) throw new Error('Кольцо подключено, но сведения об устройстве пока недоступны. Повторите подключение.');

      setStage(2);
      setDeviceInfo(info);
      try {
        await onConnected?.(info);
      } catch (reason) {
        console.warn('Ring connected, but the first health refresh failed:', reason);
      }
      setStep('success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStep('error');
    }
  };

  if (!isOpen) return null;
  const isBusy = step === 'permission' || step === 'scanning' || step === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#050708] text-white"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-300/[0.09] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-6 py-7">
        <header className="z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Ritual Ring
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] disabled:opacity-25"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </header>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.main key="intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col justify-center py-6 text-center">
              <div className="h-[260px] w-full"><Ring3DCanvas speed={0.8} particleCount={130} /></div>
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-emerald-200/65">Биометрическое кольцо</p>
              <h2 className="mt-2 text-3xl font-display">Подключение кольца</h2>
              <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-white/48">Синхронизируйте сон, пульс, ВСР, кислород, температуру и активность напрямую с Ritual Ring.</p>
              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/40"><Lock className="h-3.5 w-3.5 text-amber-200/70" /> Подробные измерения остаются на телефоне</div>
              <button onClick={startScan} className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-white text-sm font-semibold text-black shadow-[0_0_36px_rgba(141,235,208,0.18)] active:scale-[0.98]"><Bluetooth className="h-4 w-4" /> Найти моё кольцо</button>
            </motion.main>
          )}

          {(step === 'permission' || step === 'scanning') && (
            <motion.main key="scan" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <div className="h-[300px] w-full"><Ring3DCanvas speed={2.2} particleCount={230} /></div>
              <h2 className="mt-2 text-2xl font-display">{step === 'permission' ? 'Разрешение Bluetooth' : 'Ищем кольцо рядом'}</h2>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/42">{step === 'permission' ? 'Android попросит доступ к устройствам поблизости' : 'Поднесите кольцо к телефону на расстояние до одного метра'}</p>
              <div className="mt-6 flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-emerald-100/70"><span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" /> Сканирование</div>
            </motion.main>
          )}

          {step === 'devices' && (
            <motion.main key="devices" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-1 flex-col justify-center py-8">
              <p className="text-center text-[9px] font-mono uppercase tracking-[0.28em] text-emerald-200/60">Устройства поблизости</p>
              <h2 className="mt-2 text-center text-2xl font-display">Выберите кольцо</h2>
              <div className="mt-8 flex flex-col gap-3">
                {devices.map((device, index) => (
                  <motion.button key={device.address} onClick={() => connect(device)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-left active:scale-[0.99]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-300/[0.09]"><Bluetooth className="h-4 w-4 text-emerald-100/75" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-white/85">{device.name || 'BLE-кольцо'}</p><p className="mt-1 truncate text-[9px] font-mono text-white/30">{device.address}</p></div>
                    <div className="text-right"><Signal className="ml-auto h-3.5 w-3.5 text-emerald-200/60" /><p className="mt-1 text-[8px] text-white/30">{device.rssi} dBm</p></div>
                    <ChevronRight className="h-4 w-4 text-white/20" />
                  </motion.button>
                ))}
                {devices.length === 0 && <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 text-center text-xs leading-relaxed text-white/45">Кольцо не найдено. Снимите его с зарядки и держите рядом с телефоном.</div>}
              </div>
              <button onClick={startScan} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-xs text-white/55"><RefreshCw className="h-4 w-4" /> Повторить поиск</button>
            </motion.main>
          )}

          {step === 'connecting' && (
            <motion.main key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col justify-center py-6 text-center">
              <div className="h-[260px] w-full"><Ring3DCanvas speed={2.8} particleCount={210} /></div>
              <h2 className="mt-2 text-2xl font-display">Подключаем {selected?.name || 'кольцо'}</h2>
              <div className="mx-auto mt-7 flex w-full max-w-xs flex-col gap-3 text-left">
                {connectionStages.map((label, index) => (
                  <div key={label} className={`flex items-center gap-3 text-xs transition-colors ${index <= stage ? 'text-white/80' : 'text-white/25'}`}>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${index < stage ? 'bg-emerald-300 text-black' : index === stage ? 'bg-emerald-200/15 text-emerald-100' : 'bg-white/[0.05]'}`}>{index < stage ? <Check className="h-3.5 w-3.5" /> : index === stage ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : index + 1}</div>
                    {label}
                  </div>
                ))}
              </div>
            </motion.main>
          )}

          {step === 'success' && deviceInfo && (
            <motion.main key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col justify-center py-6 text-center">
              <div className="h-[230px] w-full"><Ring3DCanvas speed={0.55} glowColor="#70e6b5" particleCount={80} /></div>
              <p className="text-[9px] font-mono uppercase tracking-[0.28em] text-emerald-300/75">Подключение выполнено</p>
              <h2 className="mt-2 text-3xl font-display">Кольцо готово</h2>
              <p className="mt-2 text-xs text-white/45">{deviceInfo.name}</p>
              <div className="mx-auto mt-7 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-left"><Battery className="h-4 w-4 text-white/40" /><div><p className="text-sm text-white/75">{deviceInfo.batteryLevel >= 0 ? `${deviceInfo.batteryLevel}%` : 'Заряд определяется'}</p><p className="text-[9px] text-white/30">заряд кольца</p></div></div>
              <button onClick={onClose} className="mt-8 h-14 w-full rounded-full bg-white text-sm font-semibold text-black active:scale-[0.98]">Готово</button>
            </motion.main>
          )}

          {step === 'error' && (
            <motion.main key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col justify-center py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-300/10"><Bluetooth className="h-7 w-7 text-amber-200/70" /></div>
              <h2 className="mt-6 text-xl font-display">Не удалось подключить</h2>
              <p className="mt-3 text-xs leading-relaxed text-white/50">{error}</p>
              <button onClick={startScan} className="mt-7 h-13 rounded-2xl bg-white font-semibold text-black">Попробовать снова</button>
              <button onClick={onClose} className="mt-3 h-11 text-xs text-white/40">Закрыть</button>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
