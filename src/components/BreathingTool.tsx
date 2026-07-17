import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ChevronLeft, Volume2, HelpCircle, Plus, Trash } from 'lucide-react';
import { scheduleSessionComplete } from '../services/notifications';
import { audioEngine } from '../services/audioEngine';

interface BreathingToolProps {
  onClose: () => void;
  color?: string;
  onAddMinutes?: (mins: number, practiceId: string, title: string) => void;
}

interface BreathPreset {
  id: string;
  title: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdEmpty: number;
  description: string;
  citation: string;
}

const SCIENTIFIC_CITATIONS: Record<string, string> = {
  vzbodor: "Удлинённый вдох активирует симпатическую нервную систему и повышает бдительность за счёт мягкого выброса норадреналина. Элисон Макконнелл, дыхательная биомеханика.",
  focus: "Равномерный ритм синхронизирует сердце и мозг. Миндалевидное тело успокаивается, префронтальная кора включается в работу. Сердечно-мозговая когерентность — Институт HeartMath.",
  stress: "Частота ~6 вдохов/мин попадает в резонанс с барорефлексом. Растёт вариабельность пульса, включается блуждающий нерв. Пол Лерер, Университет Нью-Джерси; поливагальная теория Стивена Порджеса.",
  sleep: "Вдох насыщает кислородом, задержка расширяет сосуды, долгий выдох активирует вагус и замедляет пульс. Кортизол падает. Техника 4-7-8 доктора Э. Вейла, Гарвард; Russo et al., 2017.",
  mgnove: "Резкие выдохи животом стимулируют диафрагмальный нерв и дают выброс адреналина. Быстрый прилив бодрости. Эндрю Хуберман, Стэнфорд — нейробиология контролируемой гипервентиляции.",
  peak: "Быстрые вдохи-выдохи животом повышают норадреналин и дофамин, обостряя внимание. Эндрю Хуберман, Стэнфорд — нейробиология дыхательных паттернов.",
  tension: "Напряжение на вдохе, расслабление на выдохе — снижается кортизол, тело отпускает зажимы. Прогрессивная релаксация доктора Э. Джекобсона, Гарвард, 1938.",
  deepsleep: "Постепенное удлинение выдоха синхронизирует пульс с ритмом засыпания. Увеличивает долю глубокого сна. Tsai et al., 2015, Национальный университет Тайваня."
};

const DEFAULT_PRESETS: BreathPreset[] = [
  { id: 'vzbodor', title: 'Взбодриться', inhale: 6, hold: 0, exhale: 4, holdEmpty: 0, description: 'Активирует симпатику для энергии', citation: SCIENTIFIC_CITATIONS.vzbodor },
  { id: 'focus', title: 'Сосредоточиться', inhale: 4, hold: 4, exhale: 4, holdEmpty: 4, description: 'Успокаивает мысли, включает когерентность', citation: SCIENTIFIC_CITATIONS.focus },
  { id: 'stress', title: 'Снять стресс', inhale: 5.5, hold: 0, exhale: 5.5, holdEmpty: 0, description: 'Резонансная частота барорефлекса', citation: SCIENTIFIC_CITATIONS.stress },
  { id: 'sleep', title: 'Уснуть', inhale: 4, hold: 7, exhale: 8, holdEmpty: 0, description: 'Дыхание 4-7-8 доктора Вейла', citation: SCIENTIFIC_CITATIONS.sleep },
  { id: 'mgnove', title: 'Мгновенная энергия', inhale: 0.4, hold: 0, exhale: 0.4, holdEmpty: 0, description: 'Быстрая гипервентиляция для бодрости', citation: SCIENTIFIC_CITATIONS.mgnove },
  { id: 'peak', title: 'Пиковая концентрация', inhale: 0.25, hold: 0, exhale: 0.25, holdEmpty: 0, description: 'Быстрые вдохи-выдохи животом', citation: SCIENTIFIC_CITATIONS.peak },
  { id: 'tension', title: 'Снять напряжение', inhale: 4, hold: 0, exhale: 6, holdEmpty: 0, description: 'На вдохе напряжение, на выдохе сброс', citation: SCIENTIFIC_CITATIONS.tension },
  { id: 'deepsleep', title: 'Глубокий сон', inhale: 4, hold: 3, exhale: 6, holdEmpty: 4, description: 'Удлиненные выдохи для сонного ритма', citation: SCIENTIFIC_CITATIONS.deepsleep }
];

const AUDIO_MAP: Record<string, string> = {
  vzbodor: 'wakeup',
  focus: 'focus',
  stress: 'relax',
  sleep: 'sleep_prep',
  mgnove: 'flow',
  peak: 'focus',
  tension: 'recover',
  deepsleep: 'sleep_prep'
};

export default function BreathingTool({ onClose, color = '#ffd585', onAddMinutes }: BreathingToolProps) {
  const [presets, setPresets] = useState<BreathPreset[]>(() => {
    const saved = localStorage.getItem('ritual_custom_presets');
    return saved ? [...DEFAULT_PRESETS, ...JSON.parse(saved)] : DEFAULT_PRESETS;
  });

  const [selectedPresetId, setSelectedPresetId] = useState('focus');
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins total
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale' | 'holdEmpty'>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4);
  const [isFinished, setIsFinished] = useState(false);
  const [breathCount, setBreathCount] = useState(0);

  // Emotional visual effects: Coherence state
  const [coherence, setCoherence] = useState(80); // percentage 0-100
  const [coherenceGrowthFlash, setCoherenceGrowthFlash] = useState(false);

  // Series state (for hyperventilation presets like 'mgnove' or 'peak')
  const [seriesActive, setSeriesActive] = useState(true); // true = hyperventilation, false = rest/pause
  const [seriesTimeLeft, setSeriesTimeLeft] = useState(0);

  // Help & custom modals
  const [showHelp, setShowHelp] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Form custom preset fields
  const [newTitle, setNewTitle] = useState('');
  const [newInhale, setNewInhale] = useState(4);
  const [newHold, setNewHold] = useState(4);
  const [newExhale, setNewExhale] = useState(4);
  const [newHoldEmpty, setNewHoldEmpty] = useState(0);

  const selectedPreset = presets.find(p => p.id === selectedPresetId) || presets[0];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe triggering of vibration haptics
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    try {
      if (navigator.vibrate) {
        const pattern = type === 'light' ? 10 : type === 'medium' ? 30 : 60;
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  // Adjust deep sleep preset values progressive lengthening (+0.5s exhale every 120 seconds)
  const getDynamicExhale = () => {
    if (selectedPreset.id === 'deepsleep') {
      const elapsed = 300 - timeLeft;
      const additionalTime = Math.floor(elapsed / 120) * 0.5;
      return selectedPreset.exhale + additionalTime;
    }
    return selectedPreset.exhale;
  };

  // Sound play & sync
  useEffect(() => {
    if (isActive && isPlaying) {
      const audioId = AUDIO_MAP[selectedPreset.id] || 'focus';
      audioEngine.playSoundscape(audioId);
      audioEngine.startBreathing();
      audioEngine.setMuted(!isSoundOn);
      audioEngine.setBreathingPhase(currentPhase, phaseSecondsLeft);
    } else {
      audioEngine.stopAll();
    }
  }, [isActive, isPlaying, selectedPresetId]);

  // Adjust audio mute when isSoundOn changes
  useEffect(() => {
    audioEngine.setMuted(!isSoundOn);
  }, [isSoundOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // Update audio breathing phase dynamically
  useEffect(() => {
    if (isActive && isPlaying) {
      audioEngine.setBreathingPhase(currentPhase, phaseSecondsLeft);
    }
  }, [currentPhase, isActive, isPlaying]);

  // Handle high resolution (100ms) cycle logic during active breath play
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    let accumulator = 0;

    timerRef.current = setInterval(() => {
      accumulator += 100;

      // Update total remaining session time every 100ms
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          setIsFinished(true);
          audioEngine.stopAll();
          audioEngine.playFinalChime();
          setIsPlaying(false);
          triggerHaptic('heavy');
          if (onAddMinutes) {
            onAddMinutes(5, 'breathing', `Ритм: ${selectedPreset.title}`);
          }
          return 0;
        }
        return prev - 0.1;
      });

      // Fluctuate coherence for organic visualization
      setCoherence(prev => {
        const target = 75 + Math.sin(Date.now() / 3000) * 15;
        return Math.max(20, Math.min(100, Math.round(prev * 0.95 + target * 0.05)));
      });

      // Gently trigger white flash every 1 minute to show coherence surge
      if (accumulator % 60000 === 0) {
        setCoherenceGrowthFlash(true);
        triggerHaptic('medium');
        setTimeout(() => setCoherenceGrowthFlash(false), 1200);
      }

      // Handle hyperventilation pauses for 'mgnove' and 'peak'
      if (!seriesActive) {
        setSeriesTimeLeft(prev => {
          if (prev <= 0.1) {
            setSeriesActive(true);
            setCurrentPhase('inhale');
            const inhaleDur = selectedPreset.inhale;
            setPhaseSecondsLeft(inhaleDur);
            return 0;
          }
          return prev - 0.1;
        });
        return; // Skip breathing cycle during series resting pause
      }

      setPhaseSecondsLeft(prev => {
        if (prev <= 0.1) {
          // Move to next phase
          let nextPhase: 'inhale' | 'hold' | 'exhale' | 'holdEmpty' = 'inhale';
          let duration = selectedPreset.inhale;
          const dynamicExhale = getDynamicExhale();

          if (currentPhase === 'inhale') {
            if (selectedPreset.hold > 0) {
              nextPhase = 'hold';
              duration = selectedPreset.hold;
            } else {
              nextPhase = 'exhale';
              duration = dynamicExhale;
            }
          } else if (currentPhase === 'hold') {
            nextPhase = 'exhale';
            duration = dynamicExhale;
          } else if (currentPhase === 'exhale') {
            if (selectedPreset.holdEmpty > 0) {
              nextPhase = 'holdEmpty';
              duration = selectedPreset.holdEmpty;
            } else {
              nextPhase = 'inhale';
              duration = selectedPreset.inhale;
              setBreathCount(c => {
                const totalBreathes = c + 1;
                // Check if series limits are reached
                if (selectedPreset.id === 'mgnove' && totalBreathes % 30 === 0) {
                  setSeriesActive(false);
                  setSeriesTimeLeft(30); // 30s pause
                  triggerHaptic('heavy');
                } else if (selectedPreset.id === 'peak' && totalBreathes % 60 === 0) {
                  setSeriesActive(false);
                  setSeriesTimeLeft(60); // 60s pause
                  triggerHaptic('heavy');
                }
                return totalBreathes;
              });
            }
          } else if (currentPhase === 'holdEmpty') {
            nextPhase = 'inhale';
            duration = selectedPreset.inhale;
            setBreathCount(c => {
              const totalBreathes = c + 1;
              if (selectedPreset.id === 'mgnove' && totalBreathes % 30 === 0) {
                setSeriesActive(false);
                setSeriesTimeLeft(30);
                triggerHaptic('heavy');
              } else if (selectedPreset.id === 'peak' && totalBreathes % 60 === 0) {
                setSeriesActive(false);
                setSeriesTimeLeft(60);
                triggerHaptic('heavy');
              }
              return totalBreathes;
            });
          }

          triggerHaptic('light');
          setCurrentPhase(nextPhase);
          return duration;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentPhase, selectedPresetId, selectedPreset, seriesActive]);

  const startPractice = () => {
    triggerHaptic('medium');
    setIsActive(true);
    setIsPlaying(true);
    setTimeLeft(300); // 5 mins
    setCurrentPhase('inhale');
    setPhaseSecondsLeft(selectedPreset.inhale);
    setBreathCount(0);
    setSeriesActive(true);
    setIsFinished(false);
  };

  const stopPractice = () => {
    triggerHaptic('medium');
    setIsActive(false);
    setIsPlaying(false);
    audioEngine.stopAll();
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.floor((300 - timeLeft) / 60);
    if (elapsed > 0) {
      scheduleSessionComplete('breathing', elapsed);
      if (onAddMinutes) {
        onAddMinutes(elapsed, 'breathing', `Ритм: ${selectedPreset.title}`);
      }
    }
  };

  const handleCreatePreset = () => {
    if (!newTitle.trim()) return;
    const customId = `custom_${Date.now()}`;
    const newPreset: BreathPreset = {
      id: customId,
      title: newTitle.trim(),
      inhale: newInhale,
      hold: newHold,
      exhale: newExhale,
      holdEmpty: newHoldEmpty,
      description: `Персональный ритм ${newInhale}-${newHold}-${newExhale}-${newHoldEmpty}`,
      citation: "Ваш персональный ритм дыхания, настроенный для комфортного баланса."
    };

    const customs = presets.filter(p => p.id.startsWith('custom_'));
    const updatedCustoms = [...customs, newPreset];
    localStorage.setItem('ritual_custom_presets', JSON.stringify(updatedCustoms));
    setPresets([...DEFAULT_PRESETS, ...updatedCustoms]);
    setSelectedPresetId(customId);
    setShowCreate(false);
    setNewTitle('');
    triggerHaptic('heavy');
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCustoms = presets.filter(p => p.id.startsWith('custom_') && p.id !== id);
    localStorage.setItem('ritual_custom_presets', JSON.stringify(updatedCustoms.filter(p => p.id.startsWith('custom_'))));
    setPresets([...DEFAULT_PRESETS, ...updatedCustoms]);
    if (selectedPresetId === id) {
      setSelectedPresetId('focus');
    }
    triggerHaptic('medium');
  };

  // Organic spring-like breathing circle scale computation
  const getCircleScale = () => {
    if (!isPlaying) return 1.0;
    if (!seriesActive) return 0.95; // Resting pause scale

    if (currentPhase === 'inhale') {
      const progress = (selectedPreset.inhale - phaseSecondsLeft) / selectedPreset.inhale;
      return 1.0 + progress * 0.20; // 1.0 to 1.20
    }
    if (currentPhase === 'hold') {
      return 1.20;
    }
    if (currentPhase === 'exhale') {
      const dynamicExhale = getDynamicExhale();
      const progress = (dynamicExhale - phaseSecondsLeft) / dynamicExhale;
      return 1.20 - progress * 0.20; // 1.20 to 1.0
    }
    return 1.0; // holdEmpty
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Beautiful background colors corresponding to the exact design specifications
  // "теплеет (золотистый) при синхронизации дыхания с целевым ритмом, холодеет (синий) при расхождении..."
  const getGlowColor = () => {
    if (!isActive) return color;
    if (coherence > 85) return '#E6B85C'; // Исток (Золотистый/Янтарный)
    if (coherence > 55) return '#7A9BBA'; // Тишина (Лазурный)
    return '#E67E22'; // Энергия (Холодеющий / Тревожное янтарное расхождение)
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] text-white flex flex-col justify-between p-6 select-none overflow-hidden">
      
      {/* Living Glass dynamic color background glow overlay */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000"
        animate={{
          background: `radial-gradient(circle at 50% 35%, ${getGlowColor()}22 0%, transparent 70%)`
        }}
      />

      {/* Heartbeat/Coherence organic visual ripple */}
      {isActive && isPlaying && (
        <motion.div
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.08, 0.16, 0.08]
          }}
          transition={{
            duration: 60 / 60, // 60 BPM standard heartbeat pulse
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute inset-x-0 top-1/4 mx-auto w-80 h-80 rounded-full blur-3xl pointer-events-none z-0"
          style={{ backgroundColor: `${getGlowColor()}11` }}
        />
      )}

      {/* Dynamic white coherence growth surge flash */}
      <AnimatePresence>
        {coherenceGrowthFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isActive ? (
          /* SET UP / PRESETS GRID VIEW */
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4 overflow-y-auto hide-scrollbar"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button 
                id="btn-breathing-close"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>
              <h2 className="text-sm font-sans tracking-widest font-semibold uppercase text-white/40">ДЫХАНИЕ</h2>
              <button 
                id="btn-breathing-help"
                onClick={() => { triggerHaptic('light'); setShowHelp(true); }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
              >
                <HelpCircle className="w-5 h-5 text-amber-300" />
              </button>
            </div>

            {/* Breathing Preview Circle */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
              <motion.div 
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.1, 0.22, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-60 h-60 rounded-full border border-white/5 pointer-events-none"
              />
              <div 
                className="w-40 h-40 rounded-full flex flex-col items-center justify-center text-center shadow-inner relative backdrop-blur-md bg-white/[0.03] border border-white/10"
                style={{
                  boxShadow: `0 0 40px -10px ${color}25`
                }}
              >
                <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">РИТМ</span>
                <span className="text-2xl font-light font-mono text-white mt-1">
                  {selectedPreset.inhale}-{selectedPreset.hold}-{selectedPreset.exhale}-{selectedPreset.holdEmpty}
                </span>
                <span className="text-[9px] text-white/30 font-mono mt-1">вдохи / паузы</span>
              </div>
            </div>

            {/* Presets Slider */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Техники дыхания</span>
                <button 
                  id="btn-breathing-create"
                  onClick={() => { triggerHaptic('light'); setShowCreate(true); }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-white/5 py-1 px-3 rounded-full border border-white/5 active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" />
                  <span>Создать</span>
                </button>
              </div>

              {/* Horizontal scroll presets */}
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-1">
                {presets.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  const isCustom = preset.id.startsWith('custom_');
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`flex-none w-36 p-4 rounded-3xl cursor-pointer border relative transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white/[0.04] border-white/20 shadow-xl scale-[1.05] z-10' 
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 opacity-60'
                      }`}
                    >
                      <h4 className="text-[14px] font-semibold text-white truncate">{preset.title}</h4>
                      <p className="text-[10px] text-white/40 mt-1 line-clamp-2 leading-relaxed h-7">
                        {preset.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-mono text-amber-300/80">
                          {preset.inhale}s - {preset.exhale}s
                        </span>

                        {isCustom && (
                          <button 
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="text-white/20 hover:text-rose-400 p-0.5 transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex flex-col gap-4 pb-4 w-full">
              <button
                id="btn-breathing-start"
                onClick={startPractice}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Запустить практику</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* ACTIVE PLAYING SCREEN */
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-4"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">МЕДИТАЦИЯ</span>
                <h3 className="text-base font-semibold text-white">{selectedPreset.title}</h3>
              </div>
              
              <button
                id="btn-breathing-sound"
                onClick={() => { triggerHaptic('light'); setIsSoundOn(!isSoundOn); }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all text-white/80"
              >
                <Volume2 className={`w-5 h-5 ${isSoundOn ? 'text-amber-300' : 'text-white/30'}`} />
              </button>
            </div>

            {/* Breathing Circle Active Arena */}
            <div className="flex-1 flex flex-col items-center justify-center relative py-8">
              {/* Pulsating background rings */}
              <div className="absolute w-72 h-72 rounded-full border border-white/5 flex items-center justify-center pointer-events-none">
                <div className="absolute w-56 h-56 rounded-full border border-white/5" />
                <div className="absolute w-40 h-40 rounded-full border border-white/5" />
              </div>

              {/* Dynamic breathing sphere with organic soft physics spring */}
              <motion.div
                animate={{
                  scale: getCircleScale()
                }}
                transition={{
                  type: 'spring',
                  damping: 18,
                  stiffness: 90,
                  mass: 0.8
                }}
                className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border"
                style={{
                  background: `radial-gradient(circle, ${getGlowColor()}cc 0%, ${getGlowColor()}22 100%)`,
                  borderColor: `${getGlowColor()}66`,
                  boxShadow: `0 0 60px 10px ${getGlowColor()}22`
                }}
              >
                <motion.span 
                  key={phaseSecondsLeft.toFixed(1)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-white text-3xl font-light font-mono drop-shadow-md"
                >
                  {phaseSecondsLeft >= 1 ? Math.ceil(phaseSecondsLeft) : phaseSecondsLeft.toFixed(1)}
                </motion.span>
              </motion.div>

              {/* Current Stage Indicator */}
              <div className="text-center mt-12 min-h-[90px]">
                <span 
                  className="text-xs font-mono tracking-widest uppercase font-semibold block mb-1.5 transition-colors duration-1000"
                  style={{ color: getGlowColor() }}
                >
                  {!seriesActive && 'Пауза восстановления'}
                  {seriesActive && currentPhase === 'inhale' && 'Вдох носом'}
                  {seriesActive && currentPhase === 'hold' && 'Задержка дыхания'}
                  {seriesActive && currentPhase === 'exhale' && 'Выдох ртом'}
                  {seriesActive && currentPhase === 'holdEmpty' && 'Задержка пустая'}
                </span>
                <h3 className="text-lg font-light text-white/90 max-w-xs mx-auto px-4 leading-relaxed">
                  {!seriesActive && `Сделайте паузу отдыха на ${Math.ceil(seriesTimeLeft)} сек`}
                  {seriesActive && currentPhase === 'inhale' && 'Наполните легкие воздухом'}
                  {seriesActive && currentPhase === 'hold' && 'Ощутите абсолютную тишину'}
                  {seriesActive && currentPhase === 'exhale' && 'Освободите все напряжение'}
                  {seriesActive && currentPhase === 'holdEmpty' && 'Пауза покоя'}
                </h3>
              </div>
            </div>

            {/* Active Control Bar */}
            <div className="flex flex-col gap-4 pb-6">
              <div className="flex justify-between items-center text-xs font-mono text-white/40 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Когерентность: {coherence}%
                </span>
                <span>{formatTime(timeLeft)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-breathing-toggle"
                  onClick={() => { triggerHaptic('light'); setIsPlaying(!isPlaying); }}
                  className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center gap-2 font-medium"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  <span>{isPlaying ? 'Пауза' : 'Продолжить'}</span>
                </button>

                <button
                  id="btn-breathing-complete"
                  onClick={stopPractice}
                  className="px-6 h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/95 active:scale-95 transition-all flex items-center justify-center"
                >
                  Завершить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Toast Screen overlay */}
      <AnimatePresence>
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#070709] flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-amber-300/10 border border-amber-300/20 flex items-center justify-center mx-auto shadow-xl">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl text-amber-300"
                >
                  ✨
                </motion.div>
              </div>
              <h2 className="text-2xl font-light text-white tracking-wide">Ты восстановил ритм</h2>
              <p className="text-sm text-white/55 max-w-xs font-sans leading-relaxed">
                Сессия дыхания завершена. Твои биоритмы сбалансированы.
              </p>
              <button
                onClick={() => {
                  setIsFinished(false);
                  setIsActive(false);
                }}
                className="mt-6 px-8 py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition"
              >
                Вернуться к списку
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scientific Citation Help Modal */}
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
                id="btn-breathing-help-close"
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-md font-semibold text-white mb-2 pr-6">Научное обоснование</h3>
              <div className="w-10 h-1 bg-amber-300/30 rounded-full mb-4" />

              <p className="text-xs text-white/70 leading-relaxed font-sans mb-4">
                {selectedPreset.citation}
              </p>
              
              <div className="py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-white/45 font-mono">
                Индекс ВСР стабилизируется при когерентных задержках дыхания.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Custom Preset Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowCreate(false)} />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#111115]/95 border border-white/10 rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl relative"
            >
              <button 
                id="btn-breathing-create-close"
                onClick={() => setShowCreate(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-md font-semibold text-white mb-4 pr-6">Создать свой ритм</h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block mb-1.5">Название</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Например: Перезапуск"
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block mb-1">Вдох (сек)</label>
                    <input
                      type="number"
                      value={newInhale}
                      onChange={(e) => setNewInhale(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block mb-1">Задержка (сек)</label>
                    <input
                      type="number"
                      value={newHold}
                      onChange={(e) => setNewHold(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block mb-1">Выдох (сек)</label>
                    <input
                      type="number"
                      value={newExhale}
                      onChange={(e) => setNewExhale(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase block mb-1">Задержка пуст.</label>
                    <input
                      type="number"
                      value={newHoldEmpty}
                      onChange={(e) => setNewHoldEmpty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreatePreset}
                disabled={!newTitle.trim()}
                className="w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-white/90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                Добавить ритуал
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
