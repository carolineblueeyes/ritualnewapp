import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Practice } from '../../types';
import { StandalonePractice } from '../../data/practices/types';
import { STANDALONE_GROUP_COLORS } from '../../data/practices';
import AnimatedTimer from '../AnimatedTimer';

interface CompletionScreenProps {
  practice: Practice;
  standalone?: StandalonePractice;
  elapsed: number;
  breathCount: number;
  beforeHeartRate?: number | null;
  afterHeartRate?: number | null;
  isHealthConnected: boolean;
  onGoHome: () => void;
}

export default function CompletionScreen({
  practice,
  standalone,
  elapsed,
  breathCount,
  beforeHeartRate,
  afterHeartRate,
  isHealthConnected,
  onGoHome,
}: CompletionScreenProps) {
  const color = standalone
    ? STANDALONE_GROUP_COLORS[standalone.groupId]
    : practice.color;

  const hasPulse = isHealthConnected && beforeHeartRate != null && afterHeartRate != null;
  const pulseDiff = hasPulse ? Math.round(afterHeartRate! - beforeHeartRate!) : 0;
  const pulseDiffPercent = hasPulse && beforeHeartRate
    ? Math.round((pulseDiff / beforeHeartRate) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="flex flex-col items-center justify-between w-full min-h-[480px] p-6 text-center select-none relative"
    >
      
      {/* ─── ATMOSPHERIC BACKGROUND BLUR ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="w-72 h-72 rounded-full blur-[60px]"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* ─── CELESTIAL BREATHING HALO ─── */}
      <div className="z-10 flex flex-col items-center justify-center flex-1 w-full space-y-10 my-4">
        
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Constellation starry rings */}
          {[1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ 
                rotate: i % 2 === 0 ? 360 : -360,
                scale: [0.95, 1.05, 0.95]
              }}
              transition={{ 
                rotate: { duration: 15 + i * 5, repeat: Infinity, ease: 'linear' },
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
              }}
              className="absolute inset-0 rounded-full border border-dashed border-white/[0.04]"
              style={{ borderColor: `${color}18` }}
            />
          ))}
          
          {/* Core crystal star */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [`0 0 30px 2px ${color}30`, `0 0 50px 10px ${color}40`, `0 0 30px 2px ${color}30`]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center z-10"
            style={{ 
              background: `radial-gradient(circle, #fff 0%, ${color}aa 100%)`,
            }}
          >
            <span className="text-black text-xl font-light">✨</span>
          </motion.div>
        </div>

        {/* ─── POETIC TEXT ─── */}
        <div className="space-y-2 max-w-[280px]">
          <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase block">Ритуал Завершен</span>
          <h2 className="text-2xl font-light text-white/95 tracking-wide leading-snug">Ты вернулся в баланс</h2>
          <p className="text-xs text-white/45 font-mono tracking-wider">
            {standalone?.title || practice.title}
          </p>
        </div>

        {/* ─── FLOATING JOURNEY STATS ─── */}
        <div className="flex items-center justify-center gap-10 py-3 border-t border-b border-white/[0.04] w-full max-w-[260px]">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-white/35 uppercase tracking-widest font-mono">Время</span>
            <span className="text-xl font-extralight font-mono text-white/90 mt-1"><AnimatedTimer totalSeconds={elapsed} /></span>
          </div>
          <div className="w-[1px] h-8 bg-white/[0.05]" />
          {breathCount > 0 ? (
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-white/35 uppercase tracking-widest font-mono">Дыхание</span>
              <span className="text-xl font-extralight font-mono text-white/90 mt-1">{breathCount} ц.</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-white/35 uppercase tracking-widest font-mono">Сознание</span>
              <span className="text-xl font-extralight font-mono text-white/90 mt-1">100%</span>
            </div>
          )}
        </div>

        {/* ─── HEALTH REFLECTION ─── */}
        <AnimatePresence>
          {hasPulse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-[280px] space-y-1"
            >
              <span className="text-[9px] font-mono tracking-widest uppercase text-white/30 block">
                Вегетативный отклик
              </span>
              <p className="text-sm font-light text-white/75">
                Пульс снижен до {Math.round(afterHeartRate!)} уд/мин
              </p>
              <p className="text-[10px] font-mono text-white/35">
                Разница {pulseDiff > 0 ? '+' : ''}{pulseDiff} уд/мин ({pulseDiffPercent}%)
              </p>
            </motion.div>
          )}

          {!isHealthConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center max-w-[280px] py-1"
            >
              <p className="text-[10px] text-white/30 font-light leading-relaxed">
                Твоё тело запомнило это состояние спокойствия.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ─── ACTION BUTTON ─── */}
      <div className="w-full max-w-sm px-6 z-10 mt-auto pb-2">
        <button
          onClick={onGoHome}
          className="w-full py-4 rounded-2xl text-xs font-semibold tracking-[0.2em] active:scale-95 transition-all text-white border border-white/5 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.06] shadow-2xl uppercase"
          style={{
            boxShadow: `0 4px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05)`
          }}
        >
          Завершить ритуал
        </button>
      </div>

    </motion.div>
  );
}
