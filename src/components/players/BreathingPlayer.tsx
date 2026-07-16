import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BreathingPlayerProps {
  color: string;
  variant?: string;
  onFinish: () => void;
  onTick?: (elapsed: number) => void;
}

const PHASE_COLORS: Record<string, string> = {
  inhale: '#2dd4bf',
  hold: '#fbbf24',
  exhale: '#60a5fa',
  hold_out: '#c084fc',
};

const PHASE_LABELS: Record<string, string> = {
  inhale: 'Вдох носом',
  hold: 'Задержка дыхания',
  exhale: 'Выдох ртом',
  hold_out: 'Задержка на выдохе',
  hold_in: 'Задержка на вдохе',
};

const PHASE_INSTRUCTIONS: Record<string, string> = {
  inhale: 'Наполняй легкие прохладным чистым воздухом',
  hold: 'Почувствуй тишину и покой внутри себя',
  exhale: 'Отпускай все мысли и напряжение с выдохом',
  hold_out: 'Побудь в абсолютной пустоте и ясности',
  hold_in: 'Ощути накопленную силу и устойчивость',
};

export default function BreathingPlayer({ color, variant = '4-7-8', onFinish, onTick }: BreathingPlayerProps) {
  const [phase, setPhase] = useState('inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const totalCycles = 4;
  const timerRef = useRef<any>(null);
  const elapsedRef = useRef(0);
  const elapsedTimerRef = useRef<any>(null);

  const getPhaseDurations = () => {
    switch (variant) {
      case 'square': return { inhale: 4, hold_in: 4, exhale: 4, hold_out: 4 };
      case 'fire': return { inhale: 1.5, exhale: 1.5 };
      case 'resistance': return { inhale: 4, hold: 2, exhale: 6, hold_out: 2 };
      case 'free': return { inhale: 4, exhale: 4 };
      case '4-7-8':
      default: return { inhale: 4, hold: 7, exhale: 8 };
    }
  };

  const durations = getPhaseDurations();
  const isSquare = variant === 'square';
  const isFire = variant === 'fire';
  const isFree = variant === 'free';
  const isResistance = variant === 'resistance';

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const triggerHaptic = (type: 'light' | 'medium') => {
    try { if (navigator.vibrate) navigator.vibrate(type === 'light' ? 10 : 30); } catch {}
  };

  useEffect(() => {
    const phaseSeq = isSquare
      ? ['inhale', 'hold_in', 'exhale', 'hold_out']
      : isFire || isFree
        ? ['inhale', 'exhale']
        : ['inhale', 'hold', 'exhale'];

    setPhase(phaseSeq[0]);
    setSecondsLeft(durations[phaseSeq[0] as keyof typeof durations] || 4);
    setCyclesCompleted(0);

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const currentIdx = phaseSeq.indexOf(phaseRef.current);
          const nextIdx = (currentIdx + 1) % phaseSeq.length;
          const nextPhase = phaseSeq[nextIdx];
          if (nextIdx === 0) {
            setCyclesCompleted(c => {
              const newCount = c + 1;
              if (newCount >= totalCycles) {
                clearInterval(timerRef.current);
                setTimeout(onFinish, 1000);
              }
              return newCount;
            });
          }
          setPhase(nextPhase);
          triggerHaptic('medium');
          return durations[nextPhase as keyof typeof durations] || 4;
        }
        return prev - 1;
      });
    }, 1000);

    elapsedTimerRef.current = setInterval(() => {
      elapsedRef.current++;
      onTick?.(elapsedRef.current);
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(elapsedTimerRef.current);
    };
  }, [variant]);

  // Determine scale for breathing sphere
  const getScale = () => {
    if (isFire) return phase === 'exhale' ? 0.85 : 1.25;
    if (phase === 'inhale') {
      const dur = durations.inhale;
      const progress = (dur - secondsLeft) / dur;
      return 0.9 + progress * 0.45; // 0.9 to 1.35
    }
    if (phase === 'hold' || phase === 'hold_in') {
      return 1.35;
    }
    if (phase === 'exhale') {
      const dur = durations.exhale;
      const progress = (dur - secondsLeft) / dur;
      return 1.35 - progress * 0.45; // 1.35 to 0.9
    }
    return 0.9; // hold_out or default
  };

  // Trailing dot path animation for square breathing
  const getSquareProgress = () => {
    if (!isSquare) return 0;
    const progress = (durations[phase as keyof typeof durations] - secondsLeft) / durations[phase as keyof typeof durations];
    return progress;
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[460px] py-2 relative select-none">
      
      {/* ─── AMBIENT ATMOSPHERE BACKGROUND ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: getScale() * 1.5,
            opacity: phase === 'hold' || phase === 'hold_in' ? 0.35 : 0.22,
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="w-80 h-80 rounded-full blur-[80px]"
          style={{ backgroundColor: color }}
        />
        {isFire && (
          <motion.div
            animate={{ opacity: [0.1, 0.25, 0.1], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute w-96 h-96 rounded-full blur-[100px]"
            style={{ backgroundColor: '#ff6b0015' }}
          />
        )}
      </div>

      {/* ─── DYNAMIC BREATHING ENGINE ─── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 my-4">
        
        {/* 1. SQUARE BREATHING VISUALIZER */}
        {isSquare ? (
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Elegant ultra-thin geometric box path */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
              <rect x="25" y="25" width="150" height="150" rx="20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <rect x="25" y="25" width="150" height="150" rx="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="10 15" />
              <rect 
                x="25" y="25" width="150" height="150" rx="20" 
                fill="none" stroke={color} strokeWidth="2.5"
                strokeDasharray="600" 
                strokeDashoffset={
                  phase === 'inhale' ? 600 - getSquareProgress() * 150 :
                  phase === 'hold_in' ? 450 - getSquareProgress() * 150 :
                  phase === 'exhale' ? 300 - getSquareProgress() * 150 :
                  phase === 'hold_out' ? 150 - getSquareProgress() * 150 : 0
                } 
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${color}80)` }}
                className="transition-all duration-1000 ease-linear"
              />
              <motion.circle 
                r="6" 
                fill={PHASE_COLORS[phase] || color}
                style={{ filter: `drop-shadow(0 0 12px ${PHASE_COLORS[phase] || color})` }}
                animate={{
                  cx: phase === 'inhale' ? 25 + getSquareProgress() * 150 : phase === 'hold_in' ? 175 : phase === 'exhale' ? 175 - getSquareProgress() * 150 : 25,
                  cy: phase === 'inhale' ? 25 : phase === 'hold_in' ? 25 + getSquareProgress() * 150 : phase === 'exhale' ? 175 : 175 - getSquareProgress() * 150,
                }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            
            {/* Elegant glassmorphic center */}
            <motion.div
              animate={{ scale: phase === 'inhale' || phase === 'hold_in' ? 1.08 : 0.95 }}
              className="w-28 h-28 rounded-full bg-white/[0.02] backdrop-blur-[20px] border border-white/10 flex flex-col items-center justify-center z-10 shadow-2xl"
            >
              <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">сек</span>
              <h3 className="text-4xl font-extralight font-mono text-white mt-1">{secondsLeft}</h3>
            </motion.div>
          </div>

        /* 2. ACTIVE FIRE BREATHING (Sparks & Warm ember) */
        ) : isFire ? (
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Warm core */}
            <motion.div
              animate={{ 
                scale: getScale(), 
                opacity: phase === 'exhale' ? [0.4, 0.8, 0.4] : [0.8, 0.4, 0.8]
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="w-32 h-32 rounded-full relative z-10 flex items-center justify-center overflow-hidden"
              style={{ 
                background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, 
                border: `1px solid ${color}30` 
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-16 h-16 rounded-full blur-[6px]"
                style={{ background: `radial-gradient(circle, ${color}, #ff7b00)` }}
              />
            </motion.div>
            
            {/* Rising sparks */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [120, -40],
                    x: [(i % 2 === 0 ? 1 : -1) * (15 + i * 2), (i % 2 === 0 ? -1 : 1) * (30 + i * 3)],
                    opacity: [0, 0.8, 0],
                    scale: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5 + (i % 3) * 0.4,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeOut',
                  }}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: color,
                    top: '50%',
                    left: '50%',
                    boxShadow: `0 0 6px 1px ${color}`,
                  }}
                />
              ))}
            </div>
          </div>

        /* 3. RESONANCE WAVE BREATHING */
        ) : isResistance ? (
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Nested concentric glass waves */}
            {[1, 2, 3, 4].map(i => (
              <motion.div 
                key={i}
                animate={{
                  scale: phase === 'inhale' ? [0.6 + i * 0.1, 1.1 + i * 0.15, 1.1 + i * 0.15] : [1.1 + i * 0.15, 0.6 + i * 0.1, 0.6 + i * 0.1],
                  opacity: phase === 'inhale' ? [0.08, 0.2, 0.08] : [0.2, 0.08, 0.08],
                }}
                transition={{ duration: 4, ease: 'easeInOut', delay: i * 0.12 }}
                className="absolute rounded-full border border-white/5"
                style={{ 
                  width: `${160 + i * 24}px`, 
                  height: `${160 + i * 24}px`, 
                  borderColor: `${color}${25 - i * 4}`, 
                  borderWidth: '1px' 
                }}
              />
            ))}
            
            <motion.div
              animate={{ scale: getScale() }}
              className="w-24 h-24 rounded-full bg-white/[0.01] backdrop-blur-[15px] border border-white/5 flex flex-col items-center justify-center z-10 shadow-2xl"
            >
              <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">сек</span>
              <h3 className="text-3xl font-extralight font-mono text-white">{secondsLeft}</h3>
            </motion.div>
          </div>

        /* 4. CHRONOS CINEMATIC LAYER (Normal & 4-7-8) */
        ) : (
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Outer space waves */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border border-white/[0.02] flex items-center justify-center">
                <div className="w-52 h-52 rounded-full border border-white/[0.02]" />
              </div>
            </div>

            {/* Glowing, breathing lung aura */}
            <motion.div
              animate={{ scale: getScale() }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.03)]"
              style={{
                background: `radial-gradient(circle, ${color}1c 0%, ${color}05 100%)`,
                border: `1px solid ${color}15`,
              }}
            >
              {/* Inner ultra-glowing core */}
              <motion.div
                animate={{
                  opacity: phase === 'inhale' ? [0.3, 0.8] : phase === 'exhale' ? [0.8, 0.3] : 0.8
                }}
                transition={{ duration: 1 }}
                className="absolute inset-2 rounded-full blur-[8px]"
                style={{
                  background: `radial-gradient(circle, ${color}20 0%, transparent 80%)`,
                }}
              />

              {/* Core numbers */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={secondsLeft}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center z-10"
                >
                  <span className="text-5xl font-extralight font-mono text-white tracking-tighter">
                    {secondsLeft}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>

      {/* ─── POETIC LABELS & CYCLE INDICATORS ─── */}
      <div className="w-full max-w-sm px-6 text-center flex flex-col items-center z-10 mb-8 space-y-4">
        
        {/* Phase details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-1"
          >
            <span
              className="text-xs font-semibold tracking-[0.25em] uppercase font-mono block"
              style={{ color }}
            >
              {PHASE_LABELS[phase] || phase}
            </span>
            <p className="text-[15px] font-light text-white/70 max-w-[280px] leading-relaxed mx-auto">
              {PHASE_INSTRUCTIONS[phase] || ''}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Elegant mini cycle bar */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex gap-1.5 items-center justify-center">
            {[...Array(totalCycles)].map((_, idx) => (
              <div 
                key={idx} 
                className="h-[3px] rounded-full transition-all duration-700"
                style={{
                  width: idx === cyclesCompleted ? '18px' : '5px',
                  backgroundColor: idx < cyclesCompleted ? color : idx === cyclesCompleted ? `${color}dd` : 'rgba(255,255,255,0.06)'
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-white/35 font-mono tracking-widest uppercase">
            Цикл {Math.min(cyclesCompleted + 1, totalCycles)} из {totalCycles}
          </span>
        </div>
      </div>

    </div>
  );
}
