import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, HelpCircle, Play, Pause, Volume2, Sun, Clock, Heart, Sparkles, X } from 'lucide-react';
import { scheduleSessionComplete } from '../services/notifications';
import { audioEngine } from '../services/audioEngine';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

interface AtmosphereToolProps {
  onClose: () => void;
  color?: string;
  onAddMinutes?: (mins: number, practiceId: string, title: string) => void;
  onSessionComplete?: (practiceType: string, duration: number) => void;
}

interface Soundscape {
  id: string;
  title: string;
  color: string; // fallback color
  description: string;
  citation: string;
  heartRate: number; // BPM for light pulses
}

const SOUNDSCAPES: Soundscape[] = [
  { 
    id: 'focus', 
    title: 'Сосредоточиться', 
    color: '#60a5fa', 
    description: 'Гул 40 Гц + изохронные тоны 14 Гц + бинауральные биения 14 Гц', 
    citation: 'Повышает бета-ритмы (14 Гц) для высокой концентрации внимания, снижая рассеянность и блуждание мыслей.',
    heartRate: 64 
  },
  { 
    id: 'flow', 
    title: 'Поток', 
    color: '#34d399', 
    description: 'Гул 50 Гц + изохронные тоны 18 Гц + бинауральные биения 16 Гц', 
    citation: 'Активирует низкие бета-ритмы для творческого погружения и чувства слияния с действием.',
    heartRate: 60 
  },
  { 
    id: 'relax', 
    title: 'Снять напряжение', 
    color: '#fb7185', 
    description: 'Гул 40 Гц + изохронные тоны 10 Гц + бинауральные биения 8 Гц', 
    citation: 'Альфа-волны (8-10 Гц) стимулируют парасимпатическую нервную систему, эффективно снижая мышечные зажимы.',
    heartRate: 54 
  },
  { 
    id: 'sleep_prep', 
    title: 'Подготовка ко сну', 
    color: '#c084fc', 
    description: 'Гул 30 Гц + изохронные тоны 6 Гц + бинауральные биения 4 Гц', 
    citation: 'Тета- и дельта-частоты (4-6 Гц) способствуют выработке мелатонина и облегчают переход к восстановительному сну.',
    heartRate: 48 
  },
  { 
    id: 'candle', 
    title: 'Свеча', 
    color: '#fb923c', 
    description: 'Мягкий хаотичный треск пламени и потрескивание свечи', 
    citation: 'Хаотичный ритм треска пламени действует как розовый шум, успокаивая перегруженный слуховой анализатор.',
    heartRate: 50 
  },
  { 
    id: 'wakeup', 
    title: 'Пробуждение', 
    color: '#fbbf24', 
    description: 'Гул 50 Гц + изохронные тоны 18 Гц + бинауральные биения 16 Гц', 
    citation: 'Быстрые бета-частоты (16-18 Гц) стимулируют выработку утреннего кортизола и плавно повышают тонус сосудов.',
    heartRate: 72 
  },
  { 
    id: 'recover', 
    title: 'Восстановиться', 
    color: '#2dd4bf', 
    description: 'Гул 35 Гц + изохронные тоны 6 Гц + бинауральные биения 5 Гц', 
    citation: 'Успокаивающие низкие частоты ускоряют детоксикацию мозга во время глубокого пассивного отдыха.',
    heartRate: 52 
  },
  { 
    id: 'ideas', 
    title: 'Поток идей', 
    color: '#f43f5e', 
    description: 'Гул 45 Гц + изохронные тоны 10 Гц + бинауральные биения 10 Гц', 
    citation: 'Альфа-тета переходная зона стимулирует свободные ассоциации для инсайтов и креативности.',
    heartRate: 66 
  },
  { 
    id: 'whitenoise', 
    title: 'Белый шум', 
    color: '#9ca3af', 
    description: 'Монотонный аналоговый тихий белый шум', 
    citation: 'Монотонный спектр маскирует внешние резкие раздражители, создавая стабильный купол тишины.',
    heartRate: 58 
  },
  { 
    id: 'nature', 
    title: 'Природный покой', 
    color: '#a3e635', 
    description: 'Процедурный шелест листвы и звуки далёкого ручья', 
    citation: 'Паттерны фрактального шума (ветер, листва) снижают уровень стресса на глубинном физиологическом уровне.',
    heartRate: 50 
  }
];

// Recovery Zones as defined in design document
interface RecoveryZone {
  id: string;
  title: string;
  range: string;
  glowColor: string;
  description: string;
}

const RECOVERY_ZONES: RecoveryZone[] = [
  { id: 'shining', title: 'Сияешь', range: '80-100', glowColor: '#E6B85C', description: 'Солнечно-янтарное свечение с живыми искрами' },
  { id: 'balance', title: 'Баланс', range: '60-79', glowColor: '#D4AF37', description: 'Мягкое медовое ровное свечение' },
  { id: 'tension', title: 'Напряжение', range: '40-59', glowColor: '#E67E22', description: 'Глубокий тёплый янтарный с лёгкой тревожной неровностью' },
  { id: 'overload', title: 'Перегруз', range: '0-39', glowColor: '#C0392B', description: 'Тусклое красное свечение, едва заметная пульсация' },
  { id: 'nodata', title: 'Нет данных', range: '--', glowColor: '#7A9BBA', description: 'Холодное голубое статичное свечение' }
];

export default function AtmosphereTool({ onClose, color = '#fb7185' }: AtmosphereToolProps) {
  const [selectedId, setSelectedId] = useState('relax');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 mins default (1200 seconds)
  const [brightness, setBrightness] = useState(80); // 0-100%
  const [volume, setVolume] = useState(70); // 0-100%
  const [showHelp, setShowHelp] = useState(false);
  const [showFirstRunHint, setShowFirstRunHint] = useState(false);

  // Recovery Zone Selection
  const [activeZoneId, setActiveZoneId] = useState('balance');

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('ritual_atmosphere_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Completion state
  const [isFinished, setIsFinished] = useState(false);

  // Ref tracking for double tap and long presses
  const lastTapRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedScape = SOUNDSCAPES.find(s => s.id === selectedId) || SOUNDSCAPES[0];
  const activeZone = RECOVERY_ZONES.find(z => z.id === activeZoneId) || RECOVERY_ZONES[1];

  // Haptic feedbacks
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(type === 'light' ? 10 : type === 'medium' ? 30 : 65);
      }
    } catch {}
  };

  // Show first run tips on mount
  useEffect(() => {
    const runKey = 'ritual_atmosphere_not_first_run';
    if (!localStorage.getItem(runKey)) {
      setShowFirstRunHint(true);
      localStorage.setItem(runKey, 'true');
      const timer = setTimeout(() => {
        setShowFirstRunHint(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync sound volume directly with Web Audio Engine
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Audio playing and stopping state synchronization
  useEffect(() => {
    if (isPlaying && isActive) {
      audioEngine.playSoundscape(selectedId);
      audioEngine.setVolume(volume);
      audioEngine.setMuted(false);
    } else {
      audioEngine.stopAll();
    }
  }, [isPlaying, isActive, selectedId]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // Main countdown timer logic with graceful 1-minute fadeout
  useEffect(() => {
    if (isPlaying && isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            triggerHaptic('heavy');
            setIsPlaying(false);
            setIsActive(false);
            audioEngine.stopAll();
            audioEngine.playFinalChime();
            setIsFinished(true);
            
            const totalMin = Math.floor((1200 - 0) / 60);
            scheduleSessionComplete('atmosphere', totalMin);
            
            // Call parent completion callback for practice tracking
            onSessionComplete?.('atmosphere', totalMin);
            
            return 0;
          }

          // Gradual fading
          if (prev <= 60) {
            const progress = prev / 60; // 1.0 down to 0.0
            setBrightness(Math.round(80 * progress));
            setVolume(Math.round(70 * progress));
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
  }, [isPlaying, isActive, onSessionComplete]);

  const togglePlay = () => {
    triggerHaptic('medium');
    setIsPlaying(!isPlaying);
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleSetTimer = (minutes: number) => {
    triggerHaptic('light');
    setTimeLeft(minutes * 60);
    setBrightness(80);
    setVolume(70);
  };

  // Favoriting with long press or button tap
  const toggleFavorite = (scapeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    let updated;
    if (favorites.includes(scapeId)) {
      updated = favorites.filter(id => id !== scapeId);
    } else {
      updated = [...favorites, scapeId];
    }
    setFavorites(updated);
    localStorage.setItem('ritual_atmosphere_favorites', JSON.stringify(updated));
    requestPrivacySafeSync();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Sort Soundscapes so favorites show first as specified
  const sortedSoundscapes = [...SOUNDSCAPES].sort((a, b) => {
    const aFav = favorites.includes(a.id) ? 1 : 0;
    const bFav = favorites.includes(b.id) ? 1 : 0;
    return bFav - aFav; // Favorites first
  });

  // Living Glass glowing color derived from active zone and fallback selected soundscape
  const getAmbientGlowColor = () => {
    return activeZone.glowColor;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060608] text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      
      {/* 1. Living Glass Dynamic Background Light */}
      <motion.div
        animate={isActive && isPlaying ? {
          scale: [1, 1.03, 1],
          opacity: [0.15, 0.25, 0.15]
        } : { scale: 1, opacity: 0.12 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute inset-0 z-0 pointer-events-none transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${getAmbientGlowColor()} 0%, transparent 75%)`,
        }}
      />

      <div className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4 overflow-y-auto hide-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <button 
            id="btn-atmosphere-close"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </button>
          <h2 className="text-sm font-sans tracking-widest font-semibold uppercase text-white/40">АТМОСФЕРА</h2>
          <button 
            id="btn-atmosphere-help"
            onClick={() => { triggerHaptic('light'); setShowHelp(true); }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <HelpCircle className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* SETUP SCREEN */}
        {!isActive ? (
          <div className="flex-1 flex flex-col justify-between py-4">
            
            {/* Center Preview Circle */}
            <div className="flex-1 flex flex-col items-center justify-center my-6">
              <motion.div 
                className="w-56 h-56 rounded-full border border-white/10 backdrop-blur-2xl flex flex-col items-center justify-center relative shadow-2xl bg-white/[0.02]"
                style={{
                  boxShadow: `0 0 40px -10px ${getAmbientGlowColor()}33`
                }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="absolute inset-2 rounded-full border border-white/[0.02] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                
                <Sparkles className="w-6 h-6 text-white/30 mb-3" />
                <h3 className="text-lg font-semibold text-white tracking-tight text-center px-4 mb-2">
                  {selectedScape.title}
                </h3>
                
                <p className="text-[10px] text-white/55 text-center px-6 leading-relaxed font-medium">
                  {selectedScape.description}
                </p>
                
                <div className="mt-4 py-1 px-3 rounded-full bg-white/5 border border-white/5">
                  <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">ГОТОВ К СТАРТУ</span>
                </div>
              </motion.div>
            </div>

            {/* Timer Selection */}
            <div className="flex flex-col gap-2 mb-4">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase px-1">ТАЙМЕР СЕССИИ</span>
              <div className="flex gap-2">
                {[10, 20, 30, 45].map((mins) => {
                  const isCurrent = Math.floor(timeLeft / 60) === mins;
                  return (
                    <button
                      key={mins}
                      onClick={() => handleSetTimer(mins)}
                      className={`flex-1 h-9 rounded-xl border text-[11px] font-mono transition-all ${
                        isCurrent 
                          ? 'bg-white/15 border-white/20 text-white font-semibold'
                          : 'bg-white/[0.01] border-white/5 text-white/50 hover:border-white/10'
                      }`}
                    >
                      {mins}м
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Presets Carousel */}
            <div className="flex flex-col gap-2.5 mb-6">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase px-1">ВЫБОР ЛАНДШАФТА</span>
              <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 px-1">
                {sortedSoundscapes.map((scape) => {
                  const isSelected = selectedId === scape.id;
                  const isFav = favorites.includes(scape.id);
                  return (
                    <div
                      key={scape.id}
                      onClick={() => { triggerHaptic('light'); setSelectedId(scape.id); }}
                      className={`flex-none p-3.5 rounded-2xl cursor-pointer border relative transition-all duration-300 flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-white/[0.06] border-white/20 text-white scale-[1.02]'
                          : 'bg-white/[0.01] border-white/5 text-white/45 hover:border-white/10 opacity-70'
                      }`}
                      style={{ width: '135px' }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-1.5 font-sans font-semibold text-xs text-white truncate max-w-[85px]">
                          <span 
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                            style={{ 
                              backgroundColor: scape.color,
                              boxShadow: `0 0 6px 1px ${scape.color}`
                            }} 
                          />
                          {scape.title}
                        </span>
                        <button 
                          onClick={(e) => toggleFavorite(scape.id, e)}
                          className={`p-0.5 rounded-full hover:bg-white/10 ${isFav ? 'text-rose-400' : 'text-white/20'}`}
                        >
                          <Heart className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                      <p className="text-[9px] text-white/45 mt-1.5 line-clamp-2 leading-relaxed h-6">
                        {scape.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Large Start CTA */}
            <div className="pb-4">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setIsActive(true);
                  setIsPlaying(true);
                }}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current ml-0.5 animate-pulse" />
                <span>Начать сессию</span>
              </button>
            </div>

          </div>
        ) : (
          /* ACTIVE PLAYING SCREEN */
          <div className="flex-1 flex flex-col justify-between py-4">
            
            {/* Active glowing sphere */}
            <div className="flex-1 flex flex-col items-center justify-center my-6">
              <div className="relative w-64 h-64 rounded-full flex items-center justify-center">
                {/* Visual breath swell effect */}
                <motion.div
                  animate={isPlaying ? {
                    scale: [1, 1.04, 1],
                    opacity: [0.4, 0.65, 0.4]
                  } : { scale: 1, opacity: 0.3 }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="absolute inset-2 rounded-full blur-2xl transition-colors duration-1000 pointer-events-none"
                  style={{
                    backgroundColor: getAmbientGlowColor(),
                  }}
                />

                <div 
                  className="absolute inset-4 rounded-full border border-white/10 backdrop-blur-3xl flex flex-col items-center justify-center relative shadow-2xl bg-white/[0.02]"
                  style={{
                    boxShadow: `0 0 40px -10px ${getAmbientGlowColor()}44`
                  }}
                >
                  <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase mb-2">СЛУШАНИЕ</span>
                  <h3 className="text-lg font-light text-white tracking-tight text-center px-4 leading-snug">
                    {selectedScape.title}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 mt-2 text-white/60">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs font-mono font-semibold tracking-wider">
                      {formatTime(timeLeft)}
                    </span>
                  </div>

                  {/* Play/Pause indicator */}
                  <div className="mt-5 flex items-center gap-1.5 bg-white/5 py-1 px-3 rounded-full border border-white/5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[9px] font-mono tracking-widest text-white/60 uppercase">
                      {isPlaying ? 'активен' : 'пауза'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls in Active Mode */}
            <div className="flex gap-3 pb-4">
              <button
                onClick={togglePlay}
                className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white fill-current" />}
                <span>{isPlaying ? 'Пауза' : 'Продолжить'}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setIsPlaying(false);
                  setIsActive(false);
                  audioEngine.stopAll();
                }}
                className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 6. Complete Session Overlay */}
      <AnimatePresence>
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#060608] flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto shadow-xl">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <h2 className="text-2xl font-light text-white tracking-wide">Ты сияешь</h2>
              <p className="text-sm text-white/50 max-w-xs font-sans leading-relaxed">
                Атмосфера гармонизировала внутренний биоритм. Ваше сознание чисто и спокойно.
              </p>
              <button
                onClick={() => {
                  setIsFinished(false);
                  onClose();
                }}
                className="mt-6 px-8 py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition"
              >
                Вернуться на главную
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Soundscape scientific explanation modal popup */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowHelp(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216]/95 border border-white/10 rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl relative"
            >
              <button 
                id="btn-atmosphere-help-close"
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-md font-semibold text-white mb-2">Биоритм: {selectedScape.title}</h3>
              <div className="w-10 h-1 bg-amber-300/30 rounded-full mb-4" />

              <p className="text-xs text-white/70 leading-relaxed font-sans mb-4">
                {selectedScape.citation}
              </p>
              
              <div className="py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-white/45 font-mono leading-normal">
                Сияние: «{activeZone.title}» • Частота пульсации {selectedScape.heartRate} BPM
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
