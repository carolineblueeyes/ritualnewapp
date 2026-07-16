import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Play, Pause, Clock, AlertTriangle, Volume2, Shield, BarChart2, EyeOff, X, Sparkles, Share2 } from 'lucide-react';
import { notificationService } from '../services/notifications';
import Dnd from '../plugins/dnd';
import { audioEngine } from '../services/audioEngine';
import AnimatedTimer from './AnimatedTimer';

interface FocusToolProps {
  onClose: () => void;
  color?: string;
}

interface FocusSessionRecord {
  id: string;
  task: string;
  duration: number; // minutes
  distractions: number;
  purePercent: number;
  cheated: boolean;
  date: string;
}

export default function FocusTool({ onClose, color = '#60a5fa' }: FocusToolProps) {
  // Config state
  const [workTime, setWorkTime] = useState(25); // minutes
  const [breakTime, setBreakTime] = useState(5); // minutes
  const [cycles, setCycles] = useState(1);
  const [taskName, setTaskName] = useState('');
  const [blockNotifications, setBlockNotifications] = useState(true);

  // Soundscape state
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [selectedSoundscape, setSelectedSoundscape] = useState('focus'); // 'focus', 'flow', 'relax', 'ideas', 'candle'
  const [showSoundDropdown, setShowSoundDropdown] = useState(false);

  // Operational state
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);
  const [distractionsCount, setDistractionsCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  // Cheat detection state
  const [cheated, setCheated] = useState(false);
  const [showCheatAlert, setShowCheatAlert] = useState(false);

  // History & Analytics state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<FocusSessionRecord[]>(() => {
    const saved = localStorage.getItem('ritual_focus_history');
    return saved ? JSON.parse(saved) : [];
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialSeconds = (isBreak ? breakTime : workTime) * 60;

  // Haptic feedback support
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(type === 'light' ? 12 : type === 'medium' ? 35 : 65);
      }
    } catch {}
  };

  // VisibilityChange listener (Cheat Detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isActive && !isPaused && !isBreak) {
        setCheated(true);
        setShowCheatAlert(true);
        triggerHaptic('heavy');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isPaused, isBreak]);

  // Audio Engine triggers
  useEffect(() => {
    if (isActive && !isPaused) {
      if (isBreak) {
        // Break automatically plays alpha relaxation wave
        audioEngine.playSoundscape('relax');
      } else {
        audioEngine.playSoundscape(selectedSoundscape);
      }
      audioEngine.setMuted(!isSoundOn);
    } else {
      audioEngine.stopAll();
    }
  }, [isActive, isPaused, isBreak, selectedSoundscape]);

  // Handle Mute trigger
  useEffect(() => {
    audioEngine.setMuted(!isSoundOn);
  }, [isSoundOn]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // Main high fidelity interval loop
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        // Track accumulated pure active work duration (seconds)
        if (!isBreak) {
          setTotalWorkSeconds(prev => prev + 1);
        }

        setSecondsLeft(prev => {
          if (prev <= 1) {
            triggerHaptic('heavy');
            // Transition phases
            if (!isBreak) {
              if (currentCycle >= cycles) {
                // Completed full focus set
                completeSession();
                return 0;
              } else {
                // Transition to break
                setIsBreak(true);
                return breakTime * 60;
              }
            } else {
              // Transition back from break to work
              setIsBreak(false);
              setCurrentCycle(prevCycle => prevCycle + 1);
              return workTime * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, isBreak, workTime, breakTime, cycles, currentCycle]);

  const startSession = () => {
    triggerHaptic('medium');
    setIsActive(true);
    setIsPaused(false);
    setIsBreak(false);
    setCurrentCycle(1);
    setSecondsLeft(workTime * 60);
    setTotalWorkSeconds(0);
    setDistractionsCount(0);
    setCheated(false);
    setShowCheatAlert(false);
    setShowSummary(false);

    if (blockNotifications) {
      notificationService.enterDND();
    }
  };

  const completeSession = () => {
    setIsActive(false);
    setShowSummary(true);
    audioEngine.stopAll();
    audioEngine.playFinalChime();

    if (blockNotifications) {
      notificationService.exitDND();
    }

    // Compute metrics and write session to history
    const purePercentValue = calculatePurePercent(totalWorkSeconds, distractionsCount, cheated);
    const newRecord: FocusSessionRecord = {
      id: `session_${Date.now()}`,
      task: taskName.trim() || 'Глубокий фокус',
      duration: Math.ceil(totalWorkSeconds / 60),
      distractions: distractionsCount,
      purePercent: purePercentValue,
      cheated,
      date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    };

    const updatedHistory = [newRecord, ...history].slice(0, 30); // Keep last 30
    setHistory(updatedHistory);
    localStorage.setItem('ritual_focus_history', JSON.stringify(updatedHistory));
  };

  const calculatePurePercent = (workSecs: number, distractions: number, isCheated: boolean) => {
    if (workSecs === 0) return 100;
    
    // Each distraction subtracts 5% focus score
    let basePercent = 100 - distractions * 5;
    
    // Visibility state tab cheat penalty coefficient of 0.5
    if (isCheated) {
      basePercent *= 0.5;
    }
    
    return Math.max(0, Math.round(basePercent));
  };

  const skipBreak = () => {
    triggerHaptic('medium');
    setIsBreak(false);
    setCurrentCycle(prevCycle => prevCycle + 1);
    setSecondsLeft(workTime * 60);
  };

  const stopSessionManual = () => {
    triggerHaptic('medium');
    completeSession();
  };

  const handleDistraction = () => {
    triggerHaptic('light');
    setDistractionsCount(prev => prev + 1);
  };

  // formatTime removed — replaced by AnimatedTimer component

  const getProgressPercentage = () => {
    const total = (isBreak ? breakTime : workTime) * 60;
    if (total === 0) return 0;
    return ((total - secondsLeft) / total) * 100;
  };

  const shareResults = () => {
    triggerHaptic('medium');
    const text = `🧘 Мой фокус в Ritual:\nЗадача: ${taskName || 'Глубокий фокус'}\nВремя работы: ${Math.round(totalWorkSeconds / 60)} мин\nЧистая концентрация: ${calculatePurePercent(totalWorkSeconds, distractionsCount, cheated)}%\nОтвлечений: ${distractionsCount}`;
    if (navigator.share) {
      navigator.share({ title: 'Ritual Focus', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Результаты скопированы в буфер обмена!');
    }
  };

  const soundscapes = [
    { id: 'focus', title: 'Сосредоточиться', desc: '40 Гц + альфа-биения' },
    { id: 'flow', title: 'Поток', desc: '50 Гц + речной шум' },
    { id: 'relax', title: 'Релаксация', desc: 'Тёплая тишина' },
    { id: 'ideas', title: 'Поток идей', desc: '45 Гц креативность' },
    { id: 'candle', title: 'Свеча', desc: 'Мирный треск огня' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      
      {/* Dynamic backdrop reflection glow of Living Glass */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${isBreak ? '#10b981' : color}18 0%, transparent 70%)`
        }}
      />

      <AnimatePresence mode="wait">
        {!isActive && !showSummary ? (
          /* CONFIGURATION / PREPARATION SCREEN */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4 overflow-y-auto hide-scrollbar"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button 
                id="btn-focus-close"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>
              <h2 className="text-sm font-sans tracking-widest font-semibold uppercase text-white/40">ФОКУС</h2>
              <button 
                id="btn-focus-history"
                onClick={() => { triggerHaptic('light'); setShowHistory(true); }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
              >
                <BarChart2 className="w-5 h-5 text-amber-300" />
              </button>
            </div>

            {/* Title display */}
            <div className="text-center py-2">
              <h1 className="text-3xl font-light text-white leading-tight">Фокус внимания</h1>
              <p className="text-xs text-white/40 mt-1">Обуздай рассеянность, создай чистое рабочее пространство</p>
            </div>

            {/* Core parameters box */}
            <div className="flex-1 flex flex-col justify-center gap-4 py-4">
              
              {/* Task Title Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block px-1">ГЛАВНАЯ ЗАДАЧА</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Текущая задача"
                  className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all font-sans"
                />
              </div>

              {/* Work Segment Picker */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40 uppercase">ВРЕМЯ РАБОТЫ</span>
                  <span className="font-semibold text-sky-400">{workTime} МИНУТ</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[15, 25, 45, 60, 90].map((mins) => {
                    const isSelected = workTime === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => { triggerHaptic('light'); setWorkTime(mins); }}
                        className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                          isSelected 
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-bold'
                            : 'bg-white/5 border-white/5 text-white/60 hover:border-white/10'
                        }`}
                      >
                        {mins}м
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rest Segment Picker */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40 uppercase">ИНТЕРВАЛ ОТДЫХА</span>
                  <span className="font-semibold text-emerald-400">{breakTime} МИНУТ</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[3, 5, 10, 15, 20].map((mins) => {
                    const isSelected = breakTime === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => { triggerHaptic('light'); setBreakTime(mins); }}
                        className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                          isSelected 
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-white/5 border-white/5 text-white/60 hover:border-white/10'
                        }`}
                      >
                        {mins}м
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cycle picker */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">ЦИКЛЫ</span>
                  <div className="flex items-center justify-between bg-white/5 py-1 px-2.5 rounded-xl border border-white/5 mt-1">
                    <button onClick={() => { triggerHaptic('light'); setCycles(Math.max(1, cycles - 1)); }} className="text-white/50 hover:text-white font-bold text-sm px-1.5">-</button>
                    <span className="text-sm font-semibold font-mono text-white">{cycles}</span>
                    <button onClick={() => { triggerHaptic('light'); setCycles(Math.min(6, cycles + 1)); }} className="text-white/50 hover:text-white font-bold text-sm px-1.5">+</button>
                  </div>
                </div>

                {/* Do Not Disturb toggle */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">ТИХИЙ РЕЖИМ</span>
                  <button
                    onClick={async () => {
                      triggerHaptic('light');
                      if (!blockNotifications) {
                        // Enabling DND — check/request permission first
                        try {
                          const { granted } = await Dnd.checkPermission();
                          if (!granted) {
                            await Dnd.requestPermission();
                          }
                        } catch {}
                      }
                      setBlockNotifications(!blockNotifications);
                    }}
                    className={`flex items-center justify-between py-1.5 px-3 rounded-xl border transition-all mt-1 ${
                      blockNotifications 
                        ? 'bg-amber-300/10 border-amber-300/30 text-amber-300' 
                        : 'bg-white/5 border-white/5 text-white/40'
                    }`}
                  >
                    <span className="text-[10px] font-sans font-semibold">{blockNotifications ? 'БЛОК' : 'РАЗРЕШЕНО'}</span>
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Lower panel triggers and volume */}
            <div className="flex flex-col gap-4 pb-4">
              <div className="flex gap-3">
                {/* Sound selector button */}
                <div className="relative flex-1">
                  <button
                    onClick={() => { triggerHaptic('light'); setShowSoundDropdown(!showSoundDropdown); }}
                    className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between px-4 text-xs font-semibold text-white/80 active:scale-95 transition-transform"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className={`w-4 h-4 ${isSoundOn ? 'text-amber-300' : 'text-white/30'}`} />
                      <span className="truncate">{soundscapes.find(s => s.id === selectedSoundscape)?.title || 'Звук'}</span>
                    </div>
                    <span className="text-[9px] font-mono text-white/30">СМЕНИТЬ</span>
                  </button>

                  <AnimatePresence>
                    {showSoundDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-16 inset-x-0 bg-[#111115]/95 border border-white/10 rounded-2xl p-2 z-20 space-y-1 shadow-2xl backdrop-blur-md"
                      >
                        {soundscapes.map(sc => (
                          <button
                            key={sc.id}
                            onClick={() => {
                              triggerHaptic('light');
                              setSelectedSoundscape(sc.id);
                              setShowSoundDropdown(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl flex flex-col ${
                              selectedSoundscape === sc.id ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <span className="text-xs font-semibold text-white">{sc.title}</span>
                            <span className="text-[9px] text-white/40">{sc.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Primary Start trigger */}
                <button
                  id="btn-focus-start"
                  onClick={startSession}
                  className="flex-[2] h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Начать сессию</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : isActive ? (
          /* ACTIVE COUNTDOWN SESSION SCREEN */
          <motion.div 
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4"
          >
            {/* Upper state header */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">ФОКУС СЕССИЯ</span>
                <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">{taskName || 'Глубокий фокус'}</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 py-1 px-3.5 rounded-full text-[10px] font-mono text-white/80">
                <span>ЦИКЛ {currentCycle}/{cycles}</span>
                <span className="text-white/40">•</span>
                <span className={isBreak ? 'text-emerald-400 animate-pulse' : 'text-sky-400'}>
                  {isBreak ? 'ОТДЫХ' : 'РАБОТА'}
                </span>
              </div>
            </div>

            {/* DND shield banner indicator */}
            {blockNotifications && (
              <div className="mx-auto mt-4 py-1.5 px-4 bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-mono rounded-full flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                <span>РЕЖИМ НЕ БЕСПОКОИТЬ АКТИВЕН</span>
              </div>
            )}

            {/* Interactive Progress Ring container */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Visual Glassmorphism glowing inner circle */}
                <div 
                  className="absolute inset-4 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] backdrop-blur-md"
                  style={{
                    boxShadow: `0 0 50px -15px ${isBreak ? 'rgba(16,185,129,0.2)' : 'rgba(96,165,250,0.2)'}`
                  }}
                />

                {/* Progress Circle path */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2.5" />
                  <motion.circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke={isBreak ? '#10b981' : '#60a5fa'} 
                    strokeWidth="2.5"
                    strokeDasharray="283"
                    animate={{ strokeDashoffset: 283 - (getProgressPercentage() / 100) * 283 }}
                    transition={{ duration: 1, ease: 'linear' }}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="flex flex-col items-center justify-center z-10 text-center">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-2">
                    {isBreak ? 'ВРЕМЯ ОТДЫХА' : 'ВРЕМЯ РАБОТЫ'}
                  </span>
                  <h1 className="text-5xl font-light font-mono text-white tracking-tight leading-none mb-1">
                    <AnimatedTimer totalSeconds={secondsLeft} />
                  </h1>
                  <span className="text-[9px] font-mono text-white/30">осталось в цикле</span>
                </div>
              </div>

              {/* Distraction trigger button - only in work phase */}
              {!isBreak && (
                <div className="flex flex-col items-center gap-2 mt-6">
                  <button
                    id="btn-focus-distracted"
                    onClick={handleDistraction}
                    className="py-2 px-6 rounded-full bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wider active:scale-95 transition-all"
                  >
                    ⚠️ Я отвлёкся
                  </button>
                  <span className="text-[10px] font-mono text-white/50 uppercase">
                    Зафиксировано отвлечений: <span className="font-semibold text-rose-300">{distractionsCount}</span>
                  </span>
                </div>
              )}

              {/* Break action block */}
              {isBreak && (
                <div className="flex justify-center mt-6">
                  <button
                    id="btn-focus-skipbreak"
                    onClick={skipBreak}
                    className="py-2 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs font-mono uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Пропустить отдых ➔
                  </button>
                </div>
              )}
            </div>

            {/* Active Control Bar */}
            <div className="flex flex-col gap-4 pb-6">
              <div className="flex gap-3">
                <button
                  id="btn-focus-toggle"
                  onClick={() => { triggerHaptic('light'); setIsPaused(!isPaused); }}
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  {isPaused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white" />}
                  <span>{isPaused ? 'Возобновить' : 'Пауза'}</span>
                </button>

                <button
                  id="btn-focus-complete"
                  onClick={stopSessionManual}
                  className="px-6 h-14 rounded-2xl bg-white text-black hover:bg-white/95 active:scale-95 transition-all flex items-center justify-center font-semibold text-sm"
                >
                  Завершить
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* SUMMARY ANALYTICS SCREEN */
          <motion.div 
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4"
          >
            <div className="text-center pt-6 flex-1 flex flex-col justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 mx-auto mb-5 shadow-lg">
                <Sparkles className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">ФОКУС СЕССИЯ ЗАВЕРШЕНА</span>
              <h2 className="text-2xl font-light text-white">Выверенный фокус!</h2>
              <p className="text-xs text-white/50 mt-1.5 max-w-[280px] mx-auto px-4 leading-relaxed font-sans">
                Вы сфокусировали свое сознание на задаче: «{taskName || 'Глубокий фокус'}»
              </p>

              {/* Detailed scorecard statistics */}
              <div className="grid grid-cols-3 gap-2.5 mt-8 max-w-sm mx-auto w-full px-2">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Clock className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span className="text-[8px] font-mono text-white/40 uppercase">Время</span>
                  <span className="text-sm font-semibold font-mono text-white mt-0.5">
                    {Math.round(totalWorkSeconds / 60)} мин
                  </span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mb-1" />
                  <span className="text-[8px] font-mono text-white/40 uppercase">Отвлекся</span>
                  <span className="text-sm font-semibold font-mono text-white mt-0.5">
                    {distractionsCount} раз
                  </span>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 mb-1" />
                  <span className="text-[8px] font-mono text-white/40 uppercase">Фокус</span>
                  <span className="text-sm font-semibold font-mono text-white mt-0.5">
                    {calculatePurePercent(totalWorkSeconds, distractionsCount, cheated)}%
                  </span>
                </div>
              </div>

              {cheated && (
                <div className="mt-6 mx-auto max-w-xs p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-sans leading-normal rounded-xl text-left flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <span className="font-semibold uppercase block mb-0.5">Фокус был прерван!</span>
                    Вы выходили из приложения во время сессии, чистый процент эффективности снижен в два раза.
                  </div>
                </div>
              )}
            </div>

            {/* Back action buttons */}
            <div className="flex flex-col gap-3 pb-4">
              <div className="flex gap-3">
                <button
                  id="btn-focus-share"
                  onClick={shareResults}
                  className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Поделиться</span>
                </button>

                <button
                  id="btn-focus-summary-back"
                  onClick={() => {
                    setShowSummary(false);
                    onClose();
                  }}
                  className="flex-[2] h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center"
                >
                  На главную
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cheat Alert Notification Overlay */}
      <AnimatePresence>
        {showCheatAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 inset-x-6 z-50 bg-[#160b0c] border border-rose-500/30 rounded-2xl p-4 shadow-2xl flex items-start gap-3 max-w-sm mx-auto"
          >
            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-rose-300">Фокус прерван</h4>
              <p className="text-[10px] text-rose-200/70 leading-relaxed mt-0.5">
                Вы свернули или покинули приложение. Процент чистоты фокуса снижен на 50%.
              </p>
            </div>
            <button 
              id="btn-cheat-dismiss"
              onClick={() => setShowCheatAlert(false)}
              className="text-white/30 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History and Analytics Drawer overlay */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setShowHistory(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 200 }}
              className="bg-[#0b0b0f] border border-white/10 rounded-t-[32px] p-6 max-w-sm w-full z-10 shadow-2xl relative max-h-[80vh] flex flex-col justify-between"
            >
              <button 
                id="btn-history-close"
                onClick={() => setShowHistory(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4">
                <h3 className="text-md font-semibold text-white">История и аналитика</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Последние сессии удержания внимания</p>
              </div>

              {/* History list content */}
              <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2.5 my-4 pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-10 text-white/20 text-xs font-sans">
                    История пока пуста. Проведите первую сессию фокуса!
                  </div>
                ) : (
                  history.map(rec => (
                    <div key={rec.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[8px] font-mono text-[#60a5fa] uppercase tracking-wider">{rec.date}</span>
                        <h4 className="text-xs font-semibold text-white truncate mt-0.5">{rec.task}</h4>
                        <span className="text-[9px] text-white/40 font-sans block mt-0.5">
                          {rec.duration} мин • отвлекся {rec.distractions} раз
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold font-mono text-amber-300">{rec.purePercent}%</div>
                        <span className="text-[8px] font-mono text-white/30 uppercase">ФОКУС</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                id="btn-history-clear"
                onClick={() => {
                  triggerHaptic('medium');
                  setHistory([]);
                  localStorage.removeItem('ritual_focus_history');
                }}
                className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/15 text-rose-300 font-semibold text-xs active:scale-95 transition-all mt-2"
              >
                Очистить историю
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
