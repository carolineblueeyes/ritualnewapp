import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Smartphone, ShoppingBag, Apple, ExternalLink } from 'lucide-react';
import { healthService } from '../services/health/health.service';

interface ConnectHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectHealth?: () => Promise<void> | void;
  isConnecting?: boolean;
  status?: string;
}

export default function ConnectHealthModal({
  isOpen,
  onClose,
  onConnectHealth,
  isConnecting = false,
  status,
}: ConnectHealthModalProps) {
  const platform = useMemo(() => {
    const nativePlatform = healthService.getPlatform();
    if (nativePlatform === 'ios' || nativePlatform === 'android') return nativePlatform;

    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'web';
  }, []);

  if (!isOpen) return null;

  const sourceTitle = platform === 'ios' ? 'Apple HealthKit' : platform === 'android' ? 'Health Connect' : 'Мобильное приложение';
  const connectLabel = platform === 'ios' ? 'Открыть Apple HealthKit' : 'Подключить Health Connect';
  const canConnectInPlace = healthService.isNative() && !!onConnectHealth;

  const handleConnect = async () => {
    if (!onConnectHealth || isConnecting) return;
    await onConnectHealth();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#070709]/95 backdrop-blur-2xl flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-[#121215] border border-white/[0.06] rounded-3xl p-6 w-full max-w-sm flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Подключите здоровье</h3>
              <p className="text-[10px] text-white/60">{sourceTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-all">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/[0.04] pt-4">
          {platform === 'ios' && 'Ritual читает данные через Apple HealthKit в мобильном приложении. После разрешений мы синхронизируем только реальные дневные показатели.'}
          {platform === 'android' && 'Ritual читает Android-данные через Health Connect. Google Fit, Samsung Health и другие приложения могут писать туда данные, а Ritual забирает их из Health Connect.'}
          {platform === 'web' && 'Подключение Apple HealthKit и Health Connect доступно только в мобильном приложении Ritual.'}
        </p>

        <div className="flex flex-col gap-2.5">
          {canConnectInPlace ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-12 rounded-xl bg-white text-black text-[11px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {platform === 'ios' ? <Apple className="w-4 h-4 fill-current" /> : <Smartphone className="w-4 h-4" />}
              {isConnecting ? 'Подключение...' : connectLabel}
            </button>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-[11px] text-white/55 leading-relaxed">
              Откройте Ritual на телефоне, чтобы выдать системные разрешения и синхронизировать реальные данные.
            </div>
          )}

          {status && (
            <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/50">
              {status}
            </div>
          )}

          {platform === 'web' && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://apps.apple.com/app/ritual"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-semibold hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Apple className="w-4 h-4 fill-current" />
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.ritual.app"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-semibold hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Google Play
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.04] pt-4">
          <p className="text-[10px] text-white/60 leading-relaxed mb-3">
            Для полного набора статистики можно подключить кольцо Ritual: HRV, SpO2, сон и температура будут собираться автоматически.
          </p>
          <a
            href="https://ritual.store"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Купить кольцо Ritual
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
