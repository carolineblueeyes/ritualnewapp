import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Check, Heart, Shield } from 'lucide-react';

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
}

export default function SubscriptionModal({ onClose, onSubscribe }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('year');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md bg-[#0e0e16]/95 border-t border-white/10 rounded-t-[40px] px-6 pt-5 pb-8 shadow-2xl z-10 overflow-hidden"
      >
        {/* Decorative background glow blur */}
        <div className="absolute -top-24 -left-20 w-52 h-52 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -top-12 -right-20 w-44 h-44 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />

        {/* Grab bar */}
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Heading */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-400/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white tracking-tight mt-1">
            Включи все возможности Ritual Plus
          </h3>
          <p className="text-xs text-white/40 max-w-xs">
            Полный доступ ко всей библиотеке практик, расширенная персонализация ИИ и все главы «Пути внимания».
          </p>
        </div>

        {/* Value Propositions */}
        <div className="flex flex-col gap-3.5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm text-white/80">Все 4 группы практик и 30+ ритуалов</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm text-white/80">Голосовой ассистент и глубокий ИИ-анализ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm text-white/80">Кастомные ритуалы дыхания и виджеты</span>
          </div>

          {/* Charity Banner Row */}
          <div className="mt-2 py-2.5 px-4 rounded-2xl bg-amber-400/[0.03] border border-amber-300/10 flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-amber-300 fill-amber-300/20" />
            <span className="text-[11px] text-amber-200/80 font-mono tracking-wide uppercase">
              10% прибыли Ritual направляет на благотворительность
            </span>
          </div>
        </div>

        {/* Plan Toggles */}
        <div className="flex flex-col gap-3 mb-6">
          {/* 1 Month */}
          <button
            onClick={() => setSelectedPlan('month')}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
              selectedPlan === 'month'
                ? 'bg-amber-400/[0.04] border-amber-400 shadow-[0_0_15px_rgba(230,184,92,0.15)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-white">1 месяц</span>
              <span className="text-[11px] text-white/40">Полный доступ на 30 дней</span>
            </div>
            <span className="text-base font-semibold text-white font-mono">590 ₽</span>
          </button>

          {/* 1 Year */}
          <button
            onClick={() => setSelectedPlan('year')}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative ${
              selectedPlan === 'year'
                ? 'bg-amber-400/[0.04] border-amber-400 shadow-[0_0_15px_rgba(230,184,92,0.15)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}
          >
            {/* Sale Badge */}
            <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[9px] font-mono font-bold tracking-widest uppercase py-0.5 px-2.5 rounded-full shadow-md">
              скидка -30%
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-white">1 год</span>
              <span className="text-[11px] text-white/40">Лучшее предложение, 12 месяцев</span>
            </div>
            <div className="text-right">
              <span className="text-base font-semibold text-white font-mono block">4 990 ₽</span>
              <span className="text-[10px] text-white/40 font-mono">~415 ₽ / мес</span>
            </div>
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={onSubscribe}
          className="w-full h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex flex-col items-center justify-center shadow-lg shadow-amber-500/10"
        >
          <span className="text-sm">Начать бесплатно</span>
          <span className="text-[10px] opacity-80 font-normal">7 дней пробного периода</span>
        </button>

        {/* Fine-print / Restore Link */}
        <div className="flex flex-col items-center gap-1.5 mt-4">
          <p className="text-[10px] text-white/30 text-center leading-normal">
            Далее — {selectedPlan === 'year' ? '4 990 ₽ в год' : '590 ₽ в месяц'}. Отменить можно в любой момент.
          </p>
          <button className="text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white/60 transition-colors mt-1">
            восстановить покупки
          </button>
        </div>
      </motion.div>
    </div>
  );
}
