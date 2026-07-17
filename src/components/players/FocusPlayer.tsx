import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FocusPlayerProps {
  color: string;
  variant?: string;
  onFinish: () => void;
  onTick?: (elapsed: number) => void;
}

const BODY_PARTS = [
  'Стопы (Опора и тяжесть)',
  'Голени (Расслабление мышц)',
  'Колени (Мягкость суставов)',
  'Бёдра (Освобождение напряжения)',
  'Живот (Глубокое свободное дыхание)',
  'Грудь (Биение сердца, покой)',
  'Спина (Сила и прямая осанка)',
  'Плечи (Сброс накопленной ноши)',
  'Шея (Свобода и гибкость)',
  'Лицо (Разглаживание мимики)',
  'Макушка (Ясность и расширение)'
];

const AFFIRMATIONS = [
  'Я позволяю себе быть таким, какой я есть',
  'Мои чувства важны и имеют значение',
  'Я достоин заботы и внимания',
  'Я могу дышать спокойно, даже когда трудно',
  'Каждая эмоция проходит, как волна',
  'Я выбираю доброту к себе',
  'Моё тело — мой дом, и я в безопасности',
];

export default function FocusPlayer({ color, variant = 'body-scan', onFinish, onTick }: FocusPlayerProps) {
  const [timer, setTimer] = useState(0);
  const [currentBodyPart, setCurrentBodyPart] = useState(0);
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const [showText, setShowText] = useState(true);
  const [countdownNumber, setCountdownNumber] = useState(5);
  const [phase, setPhase] = useState<'counting' | 'active' | 'done'>('active');
  const timerRef = useRef<any>(null);
  const elapsedRef = useRef(0);

  const triggerHaptic = (type: 'light' | 'medium') => {
    try { if (navigator.vibrate) navigator.vibrate(type === 'light' ? 10 : 30); } catch {}
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setTimer(elapsedRef.current);
      onTick?.(elapsedRef.current);
    }, 1000);
    return () => { clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (variant === 'body-scan' && timer > 0 && timer % 10 === 0) {
      setCurrentBodyPart(prev => {
        if (prev < BODY_PARTS.length - 1) {
          triggerHaptic('light');
          return prev + 1;
        }
        return prev;
      });
    }
  }, [timer, variant]);

  useEffect(() => {
    if (variant === 'self-compassion' && timer > 0 && timer % 12 === 0) {
      setAffirmationIndex(prev => {
        if (prev < AFFIRMATIONS.length - 1) {
          triggerHaptic('light');
          return prev + 1;
        }
        return prev;
      });
    }
  }, [timer, variant]);

  useEffect(() => {
    if (variant === '5-4-3-2-1') {
      setPhase('counting');
      setCountdownNumber(5);
      const interval = setInterval(() => {
        setCountdownNumber(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase('done');
            return 0;
          }
          triggerHaptic('medium');
          return prev - 1;
        });
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [variant]);

  useEffect(() => {
    if (variant === 'pause') {
      const t = setTimeout(() => setShowText(false), 4000);
      return () => clearTimeout(t);
    }
    if (variant === 'zero-point') {
      const t = setTimeout(() => setShowText(false), 5000);
      return () => clearTimeout(t);
    }
  }, [variant]);

  const get5SenseLabel = (num: number) => {
    switch (num) {
      case 5: return 'Найди 5 вещей, которые ты видишь вокруг себя';
      case 4: return 'Услышь 4 четких звука в пространстве';
      case 3: return 'Осознай 3 тактильных ощущения в теле';
      case 2: return 'Улови 2 тонких запаха';
      case 1: return 'Почувствуй 1 приятный вкус';
      default: return '';
    }
  };

  const renderBodyScanVisual = () => {
    if (variant !== 'body-scan' && variant !== 'tension-dissolution') return null;
    const activeIndex = variant === 'tension-dissolution'
      ? Math.floor((BODY_PARTS.length - 1) * (1 - timer / 120))
      : currentBodyPart;

    return (
      <div className="relative w-40 h-64 flex flex-col items-center justify-center">
        {/* Artistic minimalist energy line */}
        <div className="absolute w-[1px] h-48 bg-gradient-to-b from-white/20 via-white/5 to-white/20" />
        
        {/* Glowing energy centers */}
        {BODY_PARTS.map((_, idx) => {
          const isActive = idx === activeIndex;
          const posPercent = 10 + (idx / (BODY_PARTS.length - 1)) * 80;
          return (
            <div
              key={idx}
              className="absolute transition-all duration-700 flex items-center justify-center"
              style={{ top: `${posPercent}%` }}
            >
              {isActive ? (
                <>
                  <motion.div
                    layoutId="activeCenterGlow"
                    animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute w-5 h-5 rounded-full blur-[4px]"
                    style={{ backgroundColor: color }}
                  />
                  <motion.div
                    layoutId="activeCenterCore"
                    className="w-2.5 h-2.5 rounded-full bg-white z-10 shadow-lg"
                    style={{ boxShadow: `0 0 10px ${color}` }}
                  />
                </>
              ) : (
                <div className="w-1 h-1 rounded-full bg-white/20" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    switch (variant) {
      case '5-4-3-2-1':
        return (
          <div className="flex flex-col items-center justify-center space-y-10 min-h-[280px]">
            <AnimatePresence mode="wait">
              {countdownNumber > 0 ? (
                <motion.div
                  key={countdownNumber}
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  className="flex flex-col items-center text-center space-y-6"
                >
                  <span className="text-8xl font-extralight font-mono tracking-tighter" style={{ color }}>
                    {countdownNumber}
                  </span>
                  <p className="text-base font-light text-white/80 max-w-[280px] leading-relaxed px-4">
                    {get5SenseLabel(countdownNumber)}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1 }}
                  className="text-center space-y-3"
                >
                  <p className="text-lg font-light text-white/90">Все чувства воссоединены</p>
                  <p className="text-xs font-mono tracking-wider text-white/40 uppercase">Ты здесь и сейчас</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'body-scan':
      case 'tension-dissolution':
        const activeIdx = variant === 'tension-dissolution'
          ? Math.max(0, Math.floor((BODY_PARTS.length - 1) * (1 - timer / 120)))
          : currentBodyPart;
        return (
          <div className="flex flex-col items-center space-y-8 py-2 w-full">
            {renderBodyScanVisual()}
            <div className="text-center space-y-2 px-4 max-w-[300px]">
              <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">
                {variant === 'tension-dissolution' ? 'Растворение напряжения' : 'Фокус внимания'}
              </span>
              <AnimatePresence mode="wait">
                <motion.h4
                  key={activeIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-lg font-normal text-white/90 leading-snug"
                >
                  {BODY_PARTS[activeIdx] || 'Полное присутствие'}
                </motion.h4>
              </AnimatePresence>
            </div>
          </div>
        );

      case 'zero-point':
        return (
          <div className="flex flex-col items-center justify-center min-h-[240px]">
            <motion.div
              animate={{
                scale: [1, 2, 1],
                opacity: [0.2, 0.6, 0.2]
              }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `radial-gradient(circle, ${color}30, transparent 70%)` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: `0 0 10px ${color}` }} />
            </motion.div>
            <AnimatePresence>
              {showText && (
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 2, delay: 3 }}
                  className="text-xs text-white/30 mt-8 font-mono tracking-[0.2em] uppercase"
                >
                  Останься в этой точке
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );

      case 'calm-point':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 min-h-[240px] px-6 text-center">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
            />
            <p className="text-base font-light text-white/85 leading-relaxed max-w-[280px]">
              Найди неподвижную точку тишины в глубине груди. Мягко удерживай её вниманием.
            </p>
          </div>
        );

      case 'pause':
        return (
          <div className="flex flex-col items-center justify-center min-h-[220px] px-6 text-center">
            <AnimatePresence mode="wait">
              {showText ? (
                <motion.h3
                  key="text"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 1.5 }}
                  className="text-2xl font-light tracking-wide text-white/90"
                >
                  Просто остановись
                </motion.h3>
              ) : (
                <motion.span
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  className="text-xs text-white/30 font-mono tracking-widest uppercase"
                >
                  Осознай тишину вокруг себя
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );

      case 'micro-moments':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 min-h-[240px] text-center">
            <div className="max-w-[280px] space-y-2">
              <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">Момент контакта</span>
              <p className="text-base font-light text-white/90 leading-relaxed">
                Почувствуй опору под телом. Расслабь челюсть и плечи. Позволь себе быть.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extralight font-mono text-white tracking-wider">
                {Math.max(60 - timer, 0).toString().padStart(2, '0')}
              </span>
              <span className="text-[9px] text-white/40 font-mono tracking-widest uppercase mt-1">секунд</span>
            </div>
          </div>
        );

      case 'self-compassion':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 min-h-[260px] text-center w-full">
            <div className="min-h-[120px] flex items-center justify-center px-4 max-w-[320px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={affirmationIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.8 }}
                  className="text-lg font-light text-white/95 leading-relaxed"
                >
                  {AFFIRMATIONS[affirmationIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
              Проводник {affirmationIndex + 1} из {AFFIRMATIONS.length}
            </span>
          </div>
        );

      case 'focus-point':
      case 'world-seeing':
        return (
          <div className="flex flex-col items-center justify-center space-y-8 min-h-[240px] text-center px-6">
            <motion.div
              animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}
            />
            <p className="text-base font-light text-white/85 leading-relaxed max-w-[280px]">
              {variant === 'world-seeing'
                ? 'Рассей взгляд в пространстве. Сделай его мягким и панорамным.'
                : 'Направь всё внимание на физическую точку перед собой.'}
            </p>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[240px]">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.4, 0.15] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                className="w-40 h-40 rounded-full blur-[40px] absolute pointer-events-none"
                style={{ backgroundColor: `${color}25` }}
              />
              <span className="text-4xl font-extralight font-mono text-white tracking-widest z-10">
                {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[460px] relative select-none">
      
      {/* ─── CONCENTRIC ZEN RIPPLES (Replaces bar waves) ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] z-0">
        <svg className="w-80 h-80" viewBox="0 0 200 200">
          {[1, 2, 3].map(i => (
            <motion.circle
              key={i}
              cx="100"
              cy="100"
              r={30 + i * 20}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 4 + i * 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </svg>
      </div>

      {/* ─── DYNAMIC MEDITATION VIEW ─── */}
      <div className="flex-1 w-full flex flex-col items-center justify-center z-10">
        {renderContent()}
      </div>

      {/* ─── MINIMAL ELEGANT ACTION BUTTON ─── */}
      <div className="w-full max-w-sm px-6 z-10 mt-auto pt-6 pb-2">
        <button
          onClick={onFinish}
          className="w-full py-4 rounded-2xl text-xs font-semibold tracking-[0.2em] active:scale-95 transition-all text-white border border-white/5 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.06] shadow-2xl uppercase"
          style={{
            boxShadow: `0 4px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05)`
          }}
        >
          Завершить сессию
        </button>
      </div>

    </div>
  );
}
