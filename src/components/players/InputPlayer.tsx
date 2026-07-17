import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface InputPlayerProps {
  color: string;
  variant?: string;
  practiceName?: string;
  howItWorks?: string;
  onFinish: () => void;
}

export default function InputPlayer({ color, variant = 'goals', practiceName, howItWorks, onFinish }: InputPlayerProps) {
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [saved, setSaved] = useState(false);

  const triggerHaptic = (type: 'light' | 'heavy') => {
    try { if (navigator.vibrate) navigator.vibrate(type === 'heavy' ? 50 : 10); } catch {}
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const handleSave = () => {
    const filledGoals = goals.filter(g => g.trim().length > 0);
    if (filledGoals.length === 0) return;
    triggerHaptic('heavy');
    setSaved(true);
    setTimeout(onFinish, 2200);
  };

  const placeholders = {
    goals: ['Моя главная цель...', 'Ещё одна важная цель...', 'Что ещё я хочу изменить...'],
    'night-diary': ['Что сегодня принесло улыбку?', 'За какую мелочь я благодарен?', 'Чему я научился за этот день?'],
    'weekly-review': ['Главное достижение этой недели...', 'Важный урок, который я забираю...', 'Намерение на следующую неделю...'],
  };

  const labels = placeholders[variant as keyof typeof placeholders] || placeholders.goals;

  const hasAnyInput = goals.some(g => g.trim().length > 0);

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[460px] relative select-none">
      
      {/* ─── TITLE & DESCRIPTION ─── */}
      <div className="z-10 text-center space-y-2 mt-2 w-full px-4">
        <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">Пространство мысли</span>
        <h3 className="text-lg font-light text-white/95 max-w-[320px] mx-auto leading-relaxed">
          {practiceName || 'Направь внимание на то, что действительно важно'}
        </h3>
      </div>

      {/* ─── JOURNAL WRITING SLOTS ─── */}
      <div className="w-full max-w-sm space-y-8 z-10 px-6 my-auto py-4">
        <AnimatePresence>
          {!saved ? (
            <div className="space-y-6">
              {[0, 1, 2].map(index => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.12, duration: 0.6 }}
                  className="relative flex items-center"
                >
                  {/* Delicate serif indicator */}
                  <span className="absolute left-0 -top-4 text-[10px] font-serif italic opacity-40" style={{ color }}>
                    Откровение {index + 1}
                  </span>
                  
                  {/* Modern paper line input */}
                  <input 
                    type="text" 
                    value={goals[index]}
                    onChange={(e) => handleGoalChange(index, e.target.value)}
                    placeholder={labels[index]}
                    disabled={saved}
                    className="w-full pt-4 pb-2 bg-transparent border-b border-white/[0.08] focus:border-b-white/40 text-white text-sm outline-none transition-all placeholder:text-white/20 rounded-none"
                    style={{
                      borderColor: goals[index].trim() ? `${color}40` : 'rgba(255,255,255,0.08)',
                      fontFamily: 'SF Pro Text, system-ui',
                    }}
                    onFocus={(e) => e.target.style.borderColor = `${color}60`}
                    onBlur={(e) => e.target.style.borderColor = goals[index].trim() ? `${color}40` : 'rgba(255,255,255,0.08)'}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, filter: 'blur(5px)' }} 
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} 
              className="text-center py-8 space-y-3 flex flex-col items-center justify-center"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                style={{
                  background: `radial-gradient(circle, ${color}20, transparent)`,
                  border: `1px solid ${color}40`
                }}
              >
                <span className="text-white text-sm">✓</span>
              </div>
              <p className="text-base font-light text-white/90">Записано в твой день</p>
              <p className="text-[10px] font-mono tracking-widest text-white/35 uppercase">Мысли зафиксированы</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── CONTROLS ─── */}
      <div className="w-full max-w-sm px-6 z-10 mt-auto pb-2 space-y-4">
        {!saved && (
          <motion.button 
            onClick={handleSave} 
            whileTap={{ scale: 0.96 }}
            className="w-full py-4 rounded-2xl text-xs font-semibold tracking-[0.2em] active:scale-95 transition-all text-white border border-white/5 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.06] shadow-2xl uppercase"
            style={{
              opacity: hasAnyInput ? 1 : 0.4,
              boxShadow: hasAnyInput ? `0 0 30px -5px ${color}30` : 'none',
              borderColor: hasAnyInput ? `${color}30` : 'rgba(255,255,255,0.05)',
            }}
            disabled={!hasAnyInput}
          >
            Сохранить в дневник
          </motion.button>
        )}

        {howItWorks && !saved && (
          <p className="text-[10px] text-white/35 font-light text-center max-w-[280px] mx-auto leading-relaxed">
            {howItWorks}
          </p>
        )}
      </div>

    </div>
  );
}
