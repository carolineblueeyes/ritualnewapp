import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Volume2, Sparkles, Heart, ChevronRight, Check } from 'lucide-react';

interface PathMeditationProps {
  chapterId: string;
  levelIndex: number;
  levelTitle: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function PathMeditation({ chapterId, levelIndex, levelTitle, onClose, onComplete }: PathMeditationProps) {
  const [step, setStep] = useState<'intro' | 'taps' | 'breath' | 'voice' | 'done'>('intro');
  const [tapsCount, setTapsCount] = useState(0);
  const [timerLeft, setTimerLeft] = useState(30); // 30s session simulation for responsiveness
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');

  // Multi-step voice lines
  const [voiceIndex, setVoiceIndex] = useState(0);
  const voiceLines = [
    "Почувствуйте, как воздух соприкасается с кончиком носа.",
    "Каждый вдох приносит прохладу и ясность, каждый выдох уносит лишнее.",
    "Вы здесь. В этой точке пространства и времени.",
    "Позвольте уму расслабиться в чистом присутствии."
  ];

  // Breath controller
  useEffect(() => {
    if (step === 'breath') {
      const interval = setInterval(() => {
        setBreathPhase(p => p === 'inhale' ? 'exhale' : 'inhale');
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Voice controller
  useEffect(() => {
    if (step === 'voice') {
      const timer = setTimeout(() => {
        if (voiceIndex < voiceLines.length - 1) {
          setVoiceIndex(v => v + 1);
        } else {
          setStep('done');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, voiceIndex]);

  const handleTap = () => {
    if (tapsCount < 2) {
      setTapsCount(t => t + 1);
    } else {
      setTapsCount(3);
      setTimeout(() => {
        setStep('breath');
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07070a]/98 text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      
      {/* Background visual halo */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.12),transparent_70%)]" />

      {/* Close button */}
      <div className="flex justify-between items-center z-10">
        <span className="text-[10px] font-mono tracking-widest text-purple-300 uppercase">МЕДИТАЦИЯ ПУТИ</span>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col justify-between py-12 z-10"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 mb-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">УРОВЕНЬ {levelIndex + 1}</span>
              <h2 className="text-2xl font-normal tracking-tight">{levelTitle}</h2>
              <p className="text-xs text-white/50 max-w-[260px] leading-relaxed">
                Начало синхронизации сознания с пространством и ритмом вашего тела.
              </p>
            </div>

            <button
              onClick={() => setStep('taps')}
              className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Начать практику</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 'taps' && (
          <motion.div 
            key="taps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between py-12 z-10"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mb-4">РИТУАЛ СИНХРОНИЗАЦИИ</span>
              
              {/* Interactive tapping circle */}
              <motion.div 
                onClick={handleTap}
                whileTap={{ scale: 0.95 }}
                className="w-44 h-44 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] active:border-purple-500/30 flex flex-col items-center justify-center cursor-pointer relative shadow-inner mb-6 group"
              >
                <div className="absolute inset-0 rounded-full bg-purple-500/5 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <Heart className="w-8 h-8 text-rose-400 animate-pulse mb-2" />
                <span className="text-xs font-mono text-white/80 uppercase">ТАПНИТЕ {3 - tapsCount} РАЗА</span>
                <span className="text-[9px] text-white/60 font-mono mt-1">в ритме пульса</span>
              </motion.div>

              <h3 className="text-sm font-normal text-white/60 max-w-[220px] leading-relaxed">
                Сделайте три неторопливых тапа по сфере, настраивая ритм внимания на биение сердца.
              </h3>
            </div>

            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full border transition-all duration-300 ${
                    tapsCount > i ? 'bg-purple-400 border-purple-300' : 'border-white/15'
                  }`} 
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 'breath' && (
          <motion.div 
            key="breath"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between py-12 z-10"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mb-8">ДЫХАНИЕ</span>

              {/* Breathing circle container */}
              <motion.div 
                animate={{
                  scale: breathPhase === 'inhale' ? 1.25 : 0.95
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className="w-36 h-36 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative"
                style={{
                  boxShadow: '0 0 40px -10px rgba(168,85,247,0.4)'
                }}
              >
                <span className="text-xs font-mono font-semibold text-purple-200 uppercase tracking-widest">
                  {breathPhase === 'inhale' ? 'Вдох' : 'Выдох'}
                </span>
              </motion.div>

              <h3 className="text-lg font-normal text-white mt-12 max-w-xs">
                {breathPhase === 'inhale' ? 'Дышите свободно и спокойно' : 'Отпускайте мысли с выдохом'}
              </h3>
            </div>

            <button
              onClick={() => setStep('voice')}
              className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Перейти к погружению</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 'voice' && (
          <motion.div 
            key="voice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between py-12 z-10"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Volume2 className="w-6 h-6 text-purple-400 animate-pulse mb-8" />
              
              <AnimatePresence mode="wait">
                <motion.p 
                  key={voiceIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.8 }}
                  className="text-lg md:text-xl font-normal text-white max-w-xs leading-relaxed"
                >
                  {voiceLines[voiceIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex justify-center gap-1.5">
              {voiceLines.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                    voiceIndex === i ? 'bg-purple-400 w-4' : 'bg-white/20'
                  }`} 
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div 
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col justify-between py-12 z-10"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 mb-6 shadow-xl animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase mb-1">МЕДИТАЦИЯ ЗАВЕРШЕНА</span>
              <h2 className="text-2xl font-semibold text-white">Вы сотворили ритуал!</h2>
              <p className="text-xs text-white/50 max-w-[240px] mt-2 leading-relaxed">
                Ваш Кристалл Внимания окреп и очистился от сегодняшнего шума.
              </p>
            </div>

            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:opacity-95 active:scale-95 transition-all flex items-center justify-center"
            >
              Зафиксировать прогресс
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
