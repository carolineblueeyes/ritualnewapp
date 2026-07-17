import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface MovementPlayerProps {
  color: string;
  variant?: string;
  onFinish: () => void;
  onTick?: (elapsed: number) => void;
}

interface GroundingPhase {
  id: string;
  label: string;
  start: number;
  end: number;
  text: string;
  weightShift?: 'forward' | 'back' | 'left' | 'right' | 'center' | 'toes' | 'none';
}

const GROUNDING_PHASES: GroundingPhase[] = [
  { id: 'prologue', label: 'Пролог', start: 0, end: 10, text: 'Пять минут. Чтобы почувствовать опору.', weightShift: 'none' },
  { id: 'intro', label: 'Вступление', start: 10, end: 40, text: 'Встань. Ноги на ширине плеч. Стопы плотно на полу. Руки свободно вдоль тела. Закрой глаза. Глубокий вдох. Медленный выдох.', weightShift: 'center' },
  { id: 'feel', label: 'Телесная практика', start: 40, end: 55, text: 'Перенеси вес тела в стопы. Почувствуй пятки. Пальцы ног. Внешний край стопы. Внутренний. Подъём.', weightShift: 'center' },
  { id: 'fb', label: 'Телесная практика', start: 55, end: 80, text: 'Смести вес вперёд — на носки. Заметь, как меняется ощущение. Теперь назад — на пятки. Найди центр.', weightShift: 'forward' },
  { id: 'lr', label: 'Телесная практика', start: 80, end: 105, text: 'Смести вес влево — на внешний край стоп. Вправо — на внутренний. Вернись в центр.', weightShift: 'left' },
  { id: 'drain', label: 'Телесная практика', start: 105, end: 130, text: 'Почувствуй, как тяжесть уходит вниз. В стопы. В пол. В землю. Всё, что тревожит, стекает вниз.', weightShift: 'center' },
  { id: 'toes', label: 'Телесная практика', start: 130, end: 160, text: 'Медленно поднимись на носки. Совсем чуть-чуть. Задержись. И мягко опустись.', weightShift: 'toes' },
  { id: 'breathe', label: 'Телесная практика', start: 160, end: 195, text: 'Сделай глубокий вдох. Выдох. Ты стоишь. Устойчиво. Спокойно.', weightShift: 'center' },
  { id: 'check', label: 'Микро-чек', start: 195, end: 215, text: 'Заметь, что изменилось. Дыхание стало глубже. Плечи опустились. Ты чувствуешь опору.', weightShift: 'none' },
  { id: 'insight', label: 'Научный инсайт', start: 215, end: 235, text: 'Когда мы направляем внимание в стопы, активируется соматосенсорная кора. Это сигнал: «Опасности нет». Кортизол падает.', weightShift: 'none' },
  { id: 'phrase', label: 'Ключевая фраза', start: 235, end: 245, text: 'Ты вернул себе опору. Ты в паузе. Это твой инструмент.', weightShift: 'none' },
  { id: 'task', label: 'Задание', start: 245, end: 255, text: 'Сегодня — в очереди, на совещании — переведи внимание в стопы. Десять секунд.', weightShift: 'none' },
  { id: 'close', label: 'Закрытие', start: 255, end: 270, text: 'Глубокий вдох. Медленный выдох. Открой глаза. Ты стоишь. Ты устойчив.', weightShift: 'none' },
];

const MOVEMENT_STEPS: Record<string, string[]> = {
  'inner-heat': [
    'Напряги руки, держи 10 секунд', 'Расслабь руки, почувствуй тепло',
    'Напряги плечи, держи 10 секунд', 'Расслабь плечи — тепло стекает вниз',
    'Напряги бёдра, держи 10 секунд', 'Расслабь — тепло поднимается',
    'Напряги всё тело на 10 секунд', 'Полное расслабление — жар разливается',
  ],
  'five-moves': [
    'Движение 1: Вращение головой', 'Движение 2: Круговые движения плечами',
    'Движение 3: Наклоны корпуса', 'Движение 4: Круговые движения бёдрами',
    'Движение 5: Потряхивание всем телом',
  ],
  'energy-release': [
    'Начни мягко трясти кистями', 'Подключи предплечья',
    'Тряска переходит на плечи', 'Встряхни таз и бёдра',
    'Трясись всем телом', 'Резкий выдох — стоп', 'Почувствуй лёгкость',
  ],
};

export default function MovementPlayer({ color, variant = 'grounding-feet', onFinish, onTick }: MovementPlayerProps) {
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef<any>(null);
  const stepTimerRef = useRef<any>(null);
  const elapsedRef = useRef(0);

  const isGrounding = variant === 'grounding-feet';
  const steps = MOVEMENT_STEPS[variant] || [];

  const triggerHaptic = (type: 'light' | 'medium') => {
    try { if (navigator.vibrate) navigator.vibrate(type === 'light' ? 10 : 30); } catch {}
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setTimer(elapsedRef.current);
        onTick?.(elapsedRef.current);
      }, 1000);
    }
    return () => { clearInterval(timerRef.current); };
  }, [isPlaying]);

  useEffect(() => {
    if (isGrounding || !isPlaying || currentStep >= steps.length) return;
    stepTimerRef.current = setTimeout(() => {
      setCurrentStep(prev => prev < steps.length - 1 ? (triggerHaptic('light'), prev + 1) : prev);
    }, variant === 'five-moves' ? 80000 : variant === 'energy-release' ? 30000 : 60000);
    return () => { clearTimeout(stepTimerRef.current); };
  }, [currentStep, isPlaying, variant]);

  const currentPhase = isGrounding
    ? GROUNDING_PHASES.find(p => timer >= p.start && timer < p.end) || GROUNDING_PHASES[GROUNDING_PHASES.length - 1]
    : null;
  const phaseIndex = isGrounding && currentPhase ? GROUNDING_PHASES.indexOf(currentPhase) : 0;

  const renderFeetVisualization = () => {
    if (!isGrounding || !currentPhase) return null;
    const ws = currentPhase.weightShift || 'none';
    return (
      <div className="relative w-48 h-32 flex items-center justify-center gap-8">
        <motion.div animate={{
          x: ws === 'left' ? -8 : ws === 'forward' ? -4 : 0,
          y: ws === 'toes' ? -6 : 0,
          opacity: ws === 'left' || ws === 'center' ? 1 : 0.5,
          scale: ws === 'left' ? 1.1 : 1,
        }} transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="w-14 h-24 rounded-t-3xl"
          style={{ border: `2px solid ${color}60`, background: ws === 'left' || ws === 'center' ? `${color}20` : 'transparent' }} />
        <motion.div animate={{
          x: ws === 'right' ? 8 : ws === 'forward' ? 4 : 0,
          y: ws === 'toes' ? -6 : 0,
          opacity: ws === 'right' || ws === 'center' ? 1 : 0.5,
          scale: ws === 'right' ? 1.1 : 1,
        }} transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="w-14 h-24 rounded-t-3xl"
          style={{ border: `2px solid ${color}60`, background: ws === 'right' || ws === 'center' ? `${color}20` : 'transparent' }} />
        <motion.div animate={{ scaleX: ws === 'center' ? 1.1 : 1 }} transition={{ duration: 0.8 }}
          className="absolute bottom-0 w-full h-[2px] rounded-full" style={{ backgroundColor: `${color}40` }} />
      </div>
    );
  };

  const renderEnergyParticles = () => {
    if (variant !== 'energy-release') return null;
    return (
      <div className="relative w-48 h-48 flex items-center justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i}
            animate={{ x: [0, Math.cos(i * Math.PI / 4) * 80, 0], y: [0, Math.sin(i * Math.PI / 4) * 80, 0], opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.3, ease: 'easeOut', delay: i * 0.15 }}
            className="w-3 h-3 rounded-full absolute" style={{ backgroundColor: color }} />
        ))}
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="w-20 h-20 rounded-full blur-md" style={{ background: `radial-gradient(circle, ${color}40, transparent)` }} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full p-4 space-y-6">
      {/* Background glow */}
      {isGrounding && (
        <motion.div animate={{ opacity: [0.06, 0.15, 0.06] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="fixed inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 80%, ${color}20, transparent 70%)` }} />
      )}
      {variant === 'inner-heat' && (
        <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 4 }}
          className="fixed inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${color}20, transparent 70%)` }} />
      )}

      {/* Timer */}
      <div className="text-center">
        <span className="text-[28px] font-mono text-white tracking-wider">
          {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
        </span>
      </div>

      {/* Visual */}
      <div className="flex items-center justify-center min-h-[160px]">
        {renderFeetVisualization()}
        {renderEnergyParticles()}
        {!isGrounding && !renderEnergyParticles() && variant !== 'inner-heat' && (
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 3 }}
            className="w-32 h-32 rounded-full blur-xl pointer-events-none" style={{ backgroundColor: `${color}20` }} />
        )}
      </div>

      {/* Grounding phases */}
      {isGrounding && currentPhase ? (
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-2 justify-center">
            {GROUNDING_PHASES.map((p, i) => (
              <div key={p.id} className="h-1 rounded-full transition-all duration-500"
                style={{ width: i === phaseIndex ? '24px' : '6px', backgroundColor: i <= phaseIndex ? color : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${color}cc` }}>{currentPhase.label}</span>
          </div>
          <motion.div key={currentPhase.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="px-5 py-5 rounded-3xl backdrop-blur-md border"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}15`, minHeight: '100px' }}>
            <p className="text-[17px] text-white/90 leading-relaxed text-center">{currentPhase.text}</p>
          </motion.div>
          <div className="text-center">
            <span className="text-[10px] font-mono text-white/30">{Math.max(0, currentPhase.end - timer)} сек</span>
          </div>
        </div>
      ) : !isGrounding && steps.length > 0 ? (
        <div className="w-full overflow-x-auto scrollbar-none -mx-4 px-4">
          <div className="flex gap-3 min-w-max pb-2">
            {steps.map((step, i) => (
              <motion.div key={i} animate={{ scale: i === currentStep ? 1 : 0.95, opacity: i <= currentStep ? 1 : 0.3 }}
                className="shrink-0 w-64 p-4 rounded-3xl backdrop-blur-md border transition-colors"
                style={{ backgroundColor: i === currentStep ? `${color}15` : 'rgba(255,255,255,0.03)', borderColor: i === currentStep ? `${color}30` : 'rgba(255,255,255,0.05)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>Шаг {i + 1}</span>
                <p className="text-[17px] text-white/90 mt-1 leading-snug">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => setIsPlaying(!isPlaying)}
          className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs text-white/80 active:scale-95 transition">
          {isPlaying ? 'Пауза' : 'Продолжить'}
        </button>
        <button onClick={onFinish}
          className="flex-1 py-3 rounded-2xl text-xs font-semibold active:scale-95 transition text-white"
          style={{ backgroundColor: color }}>Завершить</button>
      </div>
    </div>
  );
}
