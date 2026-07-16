import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Smartphone, X, ChevronRight, Sparkles } from 'lucide-react';
import { useHealthData } from '../hooks/useHealthData';

interface RingPurchaseBannerProps {
  source: 'none' | 'ring' | 'healthapp';
  onConnect?: () => void;
  onBuyRing?: () => void;
  onDismiss?: () => void;
}

export default function RingPurchaseBanner({ source, onConnect, onBuyRing, onDismiss }: RingPurchaseBannerProps) {
  const { isDemoMode, setDemoMode } = useHealthData();

  if (source !== 'none') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#e8e0d4]/[0.12] bg-[#e8e0d4]/[0.04] p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#e8e0d4]/[0.08] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-[#e8e0d4]/60" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#e8e0d4]/80 block">Полный опыт с кольцом Ritual</span>
            <span className="text-[10px] text-[#e8e0d4]/40">HRV, SpO₂, температура, сон — всё автоматически</span>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="p-1">
            <X className="w-3 h-3 text-[#e8e0d4]/30" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {onConnect && (
            <button
              onClick={onConnect}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.06] text-[11px] text-white/60 hover:bg-white/[0.08] transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Подключить
            </button>
          )}
          {onBuyRing && (
            <button
              onClick={onBuyRing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#e8e0d4]/[0.1] border border-[#e8e0d4]/[0.15] text-[11px] text-[#e8e0d4]/80 font-medium hover:bg-[#e8e0d4]/[0.15] transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Купить кольцо
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => setDemoMode(!isDemoMode)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] font-medium text-purple-300 hover:bg-purple-500/15 transition-all active:scale-98"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          {isDemoMode ? 'Выключить демо-показатели' : 'Включить демо-показатели'}
        </button>
      </div>
    </motion.div>
  );
}
