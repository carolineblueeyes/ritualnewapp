import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ChevronRight, Check, Award, Flame } from 'lucide-react';
import { Practice } from '../types';
import AnimatedTimer from './AnimatedTimer';

interface BreathingSessionProps {
  practice: Practice;
  onClose: () => void;
  onComplete: () => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'holdEmpty';

const PHASE_TRANSLATIONS: Record<BreathPhase, { title: string; subtitle: string; action: string }> = {
  inhale: { title: 'Вдох', subtitle: 'Наполните легкие воздухом', action: 'Глубокий вдох...' },
  hold: { title: 'Задержка', subtitle: 'Удерживайте покой внутри', action: 'Пауза...' },
  exhale: { title: 'Выдох', subtitle: 'Освободите все напряжение', action: 'Медленный выдох...' },
  holdEmpty: { title: 'Задержка', subtitle: 'Ощутите абсолютную тишину', action: 'Пустота...' }
};

export default function BreathingSession({ practice, onClose, onComplete }: BreathingSessionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds for demo/test session to make it highly engaging and real
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(practice.breathingPattern.inhale);
  const [isFinished, setIsFinished] = useState(false);
  const [breathCount, setBreathCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manage the overall practice timer and the respiratory phases
  useEffect(() => {
    if (!isPlaying || isFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      // 1. Overall time decrease
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });

      // 2. Breathing phase seconds decrease
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          // Cycle to the next phase
          setPhase((currentPhase) => {
            let nextPhase: BreathPhase = 'inhale';
            let nextDuration = practice.breathingPattern.inhale;

            if (currentPhase === 'inhale') {
              if (practice.breathingPattern.hold > 0) {
                nextPhase = 'hold';
                nextDuration = practice.breathingPattern.hold;
              } else {
                nextPhase = 'exhale';
                nextDuration = practice.breathingPattern.exhale;
              }
            } else if (currentPhase === 'hold') {
              nextPhase = 'exhale';
              nextDuration = practice.breathingPattern.exhale;
            } else if (currentPhase === 'exhale') {
              if (practice.breathingPattern.holdEmpty > 0) {
                nextPhase = 'holdEmpty';
                nextDuration = practice.breathingPattern.holdEmpty;
              } else {
                nextPhase = 'inhale';
                nextDuration = practice.breathingPattern.inhale;
                setBreathCount((b) => b + 1);
              }
            } else if (currentPhase === 'holdEmpty') {
              nextPhase = 'inhale';
              nextDuration = practice.breathingPattern.inhale;
              setBreathCount((b) => b + 1);
            }

            // Schedule the duration for the next phase
            setTimeout(() => setPhaseSecondsLeft(nextDuration), 0);
            return nextPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, phase, isFinished, practice]);

  const handleFinish = () => {
    onComplete();
    setIsFinished(true);
  };

  const currentTranslation = PHASE_TRANSLATIONS[phase];

  // Map phase to scale of breathing sphere
  const getSphereScale = () => {
    if (!isPlaying) return 1.3;
    switch (phase) {
      case 'inhale':
        // Scale up from 1.0 to 2.1 depending on time left
        const inhaleTotal = practice.breathingPattern.inhale;
        const inhaleProgress = (inhaleTotal - phaseSecondsLeft) / inhaleTotal;
        return 1.0 + inhaleProgress * 1.1;
      case 'hold':
        return 2.1;
      case 'exhale':
        // Scale down from 2.1 to 1.0 depending on time left
        const exhaleTotal = practice.breathingPattern.exhale;
        const exhaleProgress = (exhaleTotal - phaseSecondsLeft) / exhaleTotal;
        return 2.1 - exhaleProgress * 1.1;
      case 'holdEmpty':
        return 1.0;
    }
  };

  const getSphereGlowOpacity = () => {
    switch (phase) {
      case 'inhale': return 0.4 + (0.4 * (practice.breathingPattern.inhale - phaseSecondsLeft) / practice.breathingPattern.inhale);
      case 'hold': return 0.8;
      case 'exhale': return 0.8 - (0.4 * (practice.breathingPattern.exhale - phaseSecondsLeft) / practice.breathingPattern.exhale);
      case 'holdEmpty': return 0.3;
    }
  };

  // formatTime removed — replaced by AnimatedTimer component

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#080808]/95 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-hidden select-none"
      >
        {/* Particle/Fluid background simulation */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 45%, ${practice.color}15, transparent 60%)`
          }}
        />

        {!isFinished ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center z-10 pt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-45">Текущий ритуал</span>
                <h3 className="text-lg font-medium text-white">{practice.title}</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Breathing Core Arena */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-12">
              
              {/* Outer Pulsating Ring */}
              <div className="absolute w-80 h-80 rounded-full border border-white/5 flex items-center justify-center pointer-events-none">
                <div className="absolute w-64 h-64 rounded-full border border-white/5" />
                <div className="absolute w-48 h-48 rounded-full border border-white/5" />
              </div>

              {/* Central Breathing Sphere */}
              <motion.div
                animate={{
                  scale: getSphereScale()
                }}
                transition={{
                  type: 'tween',
                  ease: 'easeInOut',
                  duration: 1
                }}
                className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
                style={{
                  background: `radial-gradient(circle, ${practice.color}cc 0%, ${practice.color}33 100%)`,
                  boxShadow: `0 0 80px 10px ${practice.color}${Math.round(getSphereGlowOpacity() * 100).toString(16).padStart(2, '0')}`
                }}
              >
                {/* Micro glass highlight */}
                <div className="absolute top-2 left-4 w-8 h-4 bg-white/20 rounded-full blur-[2px] opacity-70 rotate-[-15deg]" />
                
                {/* Core counter */}
                <motion.span 
                  key={phaseSecondsLeft}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-white text-3xl font-normal font-mono drop-shadow-md"
                >
                  {phaseSecondsLeft}
                </motion.span>
              </motion.div>

              {/* Status & Instructions */}
              <div className="text-center mt-16 max-w-xs flex flex-col items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center"
                  >
                    <span 
                      className="text-metadata tracking-widest uppercase font-semibold mb-2"
                      style={{ color: practice.color }}
                    >
                      {currentTranslation.title}
                    </span>
                    <h2 className="text-2xl font-normal text-white tracking-wide min-h-[36px]">
                      {currentTranslation.subtitle}
                    </h2>
                  </motion.div>
                </AnimatePresence>
                <p className="text-white/40 text-sm mt-3 font-mono">
                  Сделано дыханий: {breathCount}
                </p>
              </div>
            </div>

            {/* Footer Control Deck */}
            <div className="flex flex-col gap-6 z-10 pb-6 w-full max-w-md mx-auto">
              
              {/* Progress Slider Display */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-mono text-white/40">
                  <span>прогресс сессии</span>
                  <span className="text-white/70 font-semibold"><AnimatedTimer totalSeconds={timeLeft} /></span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: practice.color }}
                    animate={{ width: `${(timeLeft / 60) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Active controls */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center gap-2 font-medium"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 text-white" />
                      <span>Пауза</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 text-white" />
                      <span>Продолжить</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleFinish}
                  className="px-6 h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/95 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Завершить</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Completion Screen */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 z-10"
          >
            {/* Pulsating Reward badge */}
            <div className="relative mb-8">
              <motion.div 
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ backgroundColor: practice.color }}
              />
              <div 
                className="relative w-24 h-24 rounded-full border border-white/10 flex items-center justify-center shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${practice.color}50 0%, ${practice.color}15 100%)`
                }}
              >
                <Award className="w-12 h-12" style={{ color: practice.color }} />
              </div>
            </div>

            <span className="text-xs font-mono uppercase tracking-widest text-white/40 mb-2">Сессия завершена</span>
            <h2 className="text-3xl font-semibold text-white mb-3">Прекрасная работа</h2>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Вы посвятили время себе и восстановили внутренний ритм. Ваш показатель Сияния увеличился!
            </p>

            {/* Micro stats summary */}
            <div className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex justify-around gap-2 mb-8">
              <div className="flex flex-col items-center">
                <span className="text-white/40 text-[10px] font-mono tracking-wider uppercase">Осознанность</span>
                <span className="text-lg font-medium text-white mt-1 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  +15 баллов
                </span>
              </div>
              <div className="w-[1px] h-8 bg-white/10 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-white/40 text-[10px] font-mono tracking-wider uppercase">Дыхание</span>
                <span className="text-lg font-medium text-white mt-1">
                  {breathCount || 6} циклов
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Вернуться на панель</span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
