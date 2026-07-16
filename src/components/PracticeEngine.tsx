import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, Play } from 'lucide-react';
import { PracticeScript, PracticeStep, CrystalState } from '../data/practices/types';
import PracticeCrystal from './PracticeCrystal';
import PracticeInteractive from './PracticeInteractive';

interface PracticeEngineProps {
  script: PracticeScript;
  onComplete: () => void;
  onExit: () => void;
}

const CHAPTER_COLORS: Record<string, string> = {
  istok: '#fbbf24',
  tishina: '#60a5fa',
  energiya: '#f43f5e',
  yasnost: '#a855f7',
};

export default function PracticeEngine({ script, onComplete, onExit }: PracticeEngineProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [microcheckResponse, setMicrocheckResponse] = useState<boolean | null>(null);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'holdEmpty'>('inhale');
  const [breathTick, setBreathTick] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const color = CHAPTER_COLORS[script.chapterId] ?? '#fbbf24';

  // Find active step
  const activeStep = script.steps.reduce<PracticeStep | null>((latest, step) => {
    if (currentTime >= step.startTime) {
      return step;
    }
    return latest;
  }, null);

  // Crystal state from current step or default
  const crystalState: CrystalState = {
    fogPercent: 0,
    facets: 8,
    color,
    glowIntensity: 0.5,
    rotationSpeed: 20,
    ...script.gamification.crystalState,
    ...(activeStep?.crystalState ?? {}),
  };

  // Screen state from step
  const screenState = activeStep?.screenState;

  // Main timer
  useEffect(() => {
    if (isPaused || isComplete) return;

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      if (elapsed >= script.totalDuration) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsComplete(true);
        setTimeout(() => onComplete(), 1200);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isComplete, script.totalDuration, onComplete]);

  // Breathing pattern controller
  useEffect(() => {
    if (activeStep?.type !== 'breathing' || !activeStep.breathPattern || isPaused) {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      return;
    }

    const { inhale, hold, exhale, holdEmpty } = activeStep.breathPattern;
    const phases: { phase: typeof breathPhase; duration: number }[] = [
      { phase: 'inhale', duration: inhale },
      { phase: 'hold', duration: hold ?? 0 },
      { phase: 'exhale', duration: exhale },
      { phase: 'holdEmpty', duration: holdEmpty ?? 0 },
    ].filter((p) => p.duration > 0);

    let phaseIndex = 0;
    let elapsed = 0;
    setBreathPhase(phases[0].phase);
    setBreathTick(0);

    breathIntervalRef.current = setInterval(() => {
      elapsed += 100;
      const current = phases[phaseIndex];
      if (elapsed >= current.duration * 1000) {
        elapsed = 0;
        phaseIndex = (phaseIndex + 1) % phases.length;
        setBreathPhase(phases[phaseIndex].phase);
        setBreathTick((t) => t + 1);
      }
    }, 100);

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [activeStep, isPaused]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleResume = useCallback(() => {
    startTimeRef.current = Date.now() - currentTime * 1000;
    setIsPaused(false);
  }, [currentTime]);

  const handleInteractiveComplete = useCallback(
    (result?: any) => {
      // Advance timeline past this step
      if (activeStep?.duration) {
        setCurrentTime(activeStep.startTime + activeStep.duration);
        startTimeRef.current = Date.now() - (activeStep.startTime + activeStep.duration) * 1000;
      }
    },
    [activeStep]
  );

  const handleMicrocheck = useCallback((response: boolean) => {
    setMicrocheckResponse(response);
    setTimeout(() => setMicrocheckResponse(null), 1500);
  }, []);

  const progress = Math.min((currentTime / script.totalDuration) * 100, 100);

  const breathScale = (() => {
    switch (breathPhase) {
      case 'inhale':
        return 1.3;
      case 'hold':
        return 1.3;
      case 'exhale':
        return 0.85;
      case 'holdEmpty':
        return 0.85;
      default:
        return 1;
    }
  })();

  const breathLabel = (() => {
    switch (breathPhase) {
      case 'inhale':
        return 'Вдох';
      case 'hold':
        return 'Задержка';
      case 'exhale':
        return 'Выдох';
      case 'holdEmpty':
        return 'Пауза';
      default:
        return '';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-[#07070a] text-white flex flex-col select-none overflow-hidden pt-safe pb-safe">
      {/* Subtle bottom/ambient gradient, avoiding top bright yellow glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 60%, ${color}06, transparent 65%)`,
        }}
      />

      {/* Water overlay */}
      {screenState?.showWater && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${color}05, transparent 50%)`,
            opacity: (screenState.waterClarity ?? 0.3),
          }}
        />
      )}

      {/* Top bar with top safe area support */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2">
        <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase">
          {script.title}
        </span>
        <div className="flex gap-2">
          <button
            onClick={isPaused ? handleResume : handlePause}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-5">
        <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main content area split into stable layout zones */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] overflow-hidden">
        {/* Top zone: Stationary Crystal container */}
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key="crystal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex items-center justify-center"
            >
              <PracticeCrystal
                facets={crystalState.facets}
                color={crystalState.color}
                fogPercent={crystalState.fogPercent}
                glowIntensity={crystalState.glowIntensity}
                rotationSpeed={crystalState.rotationSpeed}
                isSubmerged={screenState?.showWater}
                hasBeam={screenState?.showBeam}
                hasSparks={screenState?.showFire}
                hasShadows={script.chapterId === 'istok' && script.levelIndex === 3}
                isPulsing={activeStep?.type === 'breathing'}
                pulseRate={activeStep?.breathPattern ? activeStep.breathPattern.inhale + activeStep.breathPattern.exhale : 4}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom zone: Stable height content area to completely prevent element jumping */}
        <div className="h-[240px] flex flex-col items-center justify-center relative w-full max-w-sm mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            {activeStep && (
              <motion.div
                key={activeStep.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full flex flex-col items-center justify-center text-center"
              >
                {/* Step type 1: Narration */}
                {activeStep.type === 'narration' && activeStep.text && (
                  <div className="space-y-3">
                    <p className="text-sm md:text-base font-normal text-white/90 leading-relaxed max-w-[280px] mx-auto">
                      {activeStep.text}
                    </p>
                    {activeStep.subtitle && (
                      <p className="text-xs text-white/40 italic">{activeStep.subtitle}</p>
                    )}
                  </div>
                )}

                {/* Step type 2: Breathing */}
                {activeStep.type === 'breathing' && (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ scale: breathScale }}
                      transition={{ duration: 1, ease: 'easeInOut' }}
                      className="w-20 h-20 rounded-full border flex items-center justify-center"
                      style={{
                        borderColor: `${color}40`,
                        backgroundColor: `${color}10`,
                        boxShadow: `0 0 35px -10px ${color}50`,
                      }}
                    >
                      <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color }}>
                        {breathLabel}
                      </span>
                    </motion.div>
                    {activeStep.text && (
                      <p className="text-xs text-white/70 max-w-[260px] leading-relaxed mx-auto">
                        {activeStep.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Step type 3: Interactive */}
                {activeStep.type === 'interactive' && activeStep.interaction && (
                  <PracticeInteractive
                    interaction={activeStep.interaction}
                    onComplete={handleInteractiveComplete}
                    crystalColor={color}
                  />
                )}

                {/* Step type 4: Microcheck */}
                {activeStep.type === 'microcheck' && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 max-w-sm w-full">
                    <p className="text-sm text-white/70 text-center mb-4">{activeStep.text ?? 'Как вы себя чувствуете?'}</p>
                    {microcheckResponse === null ? (
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleMicrocheck(true)}
                          className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Хорошо
                        </button>
                        <button
                          onClick={() => handleMicrocheck(false)}
                          className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Сложно
                        </button>
                      </div>
                    ) : (
                      <p
                        className="text-xs text-center font-medium"
                        style={{ color: microcheckResponse ? '#4ade80' : '#fbbf24' }}
                      >
                        {microcheckResponse
                          ? 'Отлично! Продолжайте в том же духе.'
                          : 'Это нормально. Каждый шаг — прогресс.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Step type 5: Insight */}
                {activeStep.type === 'insight' && activeStep.text && (
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-2 text-center">
                      Научный инсайт
                    </span>
                    <p className="text-xs text-white/75 leading-relaxed">{activeStep.text}</p>
                    {activeStep.subtitle && (
                      <p className="text-[10px] text-white/35 mt-2 italic">{activeStep.subtitle}</p>
                    )}
                  </div>
                )}

                {/* Step type 6: Closing / Final chord */}
                {(activeStep.type === 'closing' || activeStep.type === 'final_chord') && activeStep.text && (
                  <div className="space-y-4">
                    <p className="text-base md:text-lg font-normal text-white/90 leading-relaxed max-w-[280px] mx-auto">{activeStep.text}</p>
                    {activeStep.type === 'final_chord' && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                        transition={{ duration: 2 }}
                        className="w-12 h-12 mx-auto rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${color}40, transparent)`,
                          boxShadow: `0 0 40px 10px ${color}30`,
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Step type 7: Crystal reveal */}
                {activeStep.type === 'crystal_reveal' && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">{activeStep.text ?? 'Кристалл обновлен'}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#07070a]/95"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div
                className="w-20 h-20 mx-auto rounded-full mb-6"
                style={{
                  background: `radial-gradient(circle, ${color}30, transparent)`,
                  boxShadow: `0 0 60px 15px ${color}25`,
                }}
              />
              <span className="text-[10px] font-mono tracking-widest uppercase block mb-2" style={{ color }}>
                Практика завершена
              </span>
              <h2 className="text-xl font-normal text-white">{script.gamification.message}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit confirmation */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowExitConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216]/95 border border-white/10 rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl"
            >
              <h3 className="text-md font-semibold text-white mb-2">Завершить практику?</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-5">
                Прогресс текущего уровня не будет сохранён. Вы уверены?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 h-11 rounded-xl bg-white/5 border border-white/5 text-xs text-white hover:bg-white/10 font-mono uppercase tracking-widest"
                >
                  Продолжить
                </button>
                <button
                  onClick={onExit}
                  className="flex-1 h-11 rounded-xl bg-white/10 border border-white/10 text-xs text-white hover:bg-white/15 font-mono uppercase tracking-widest"
                >
                  Выйти
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
