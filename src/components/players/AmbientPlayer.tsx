import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AmbientPlayerProps {
  color: string;
  variant?: string;
  practiceName?: string;
  howItWorks?: string;
  onFinish: () => void;
  onTick?: (elapsed: number) => void;
}

const MORNING_CHIPS = ['Спокойным', 'Продуктивным', 'Мягким', 'Ясным', 'Энергичным'];
const DAY_CODE_CHIPS = ['Работа', 'Здоровье', 'Отношения', 'Творчество', 'Развитие'];

export default function AmbientPlayer({ color, variant = 'morning-wake', practiceName, howItWorks, onFinish, onTick }: AmbientPlayerProps) {
  const [timer, setTimer] = useState(0);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const elapsedRef = useRef(0);

  const triggerHaptic = (type: 'light' | 'heavy') => {
    try { if (navigator.vibrate) navigator.vibrate(type === 'heavy' ? 50 : 10); } catch {}
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setTimer(elapsedRef.current);
      onTick?.(elapsedRef.current);
    }, 1000);
    return () => { clearInterval(timerRef.current); };
  }, []);

  const renderMorningWaves = () => {
    if (variant !== 'morning-wake') return null;
    return (
      <div className="fixed inset-0 flex items-end justify-center pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div key={i}
            animate={{ 
              y: [120, -10, 120], 
              opacity: [0.1, 0.45 - i * 0.08, 0.1],
              scale: [1, 1.15, 1] 
            }}
            transition={{ repeat: Infinity, duration: 8 + i * 2, delay: i * 1.2, ease: 'easeInOut' }}
            className="absolute bottom-0 rounded-t-full"
            style={{ 
              width: `${260 + i * 90}px`, 
              height: `${100 + i * 60}px`, 
              backgroundColor: `${color}${18 - i * 3}`, 
              filter: 'blur(35px)' 
            }}
          />
        ))}
      </div>
    );
  };

  const renderLightRays = () => {
    if (variant !== 'external-intention') return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i}
            animate={{ 
              opacity: [0.08, 0.32, 0.08], 
              scaleY: [1, 1.25, 1],
              rotate: [i * 45, i * 45 + 10, i * 45]
            }}
            transition={{ repeat: Infinity, duration: 5 + i * 0.5, delay: i * 0.3, ease: 'easeInOut' }}
            className="absolute w-[1.5px] h-64 origin-center rounded-full"
            style={{ 
              background: `linear-gradient(to top, transparent, ${color}, transparent)`, 
              filter: 'blur(4px)' 
            }}
          />
        ))}
      </div>
    );
  };

  const renderForceFlow = () => {
    if (variant !== 'force-flow') return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div key={i}
            animate={{ 
              x: [-250, 450], 
              y: [Math.sin(i) * 80, Math.sin(i + 1) * 80], 
              opacity: [0, 0.45, 0],
              scale: [0.3, 1, 0.3]
            }}
            transition={{ repeat: Infinity, duration: 5 + i * 0.3, delay: i * 0.2, ease: 'linear' }}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ 
              backgroundColor: color, 
              top: `${15 + (i * 4.5) % 70}%`, 
              filter: 'blur(1px)',
              boxShadow: `0 0 6px ${color}`
            }}
          />
        ))}
      </div>
    );
  };

  const renderCollectingLight = () => {
    if (variant !== 'day-resource') return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <motion.div key={i}
              animate={{ 
                x: [Math.cos(angle) * 160, 0], 
                y: [Math.sin(angle) * 160, 0], 
                opacity: [0.1, 0.75, 0.1], 
                scale: [0.4, 1.2, 0.4] 
              }}
              transition={{ duration: 3.5 + i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-1.5 h-1.5 rounded-full" 
              style={{ 
                backgroundColor: color, 
                filter: 'blur(0.5px)',
                boxShadow: `0 0 6px ${color}`
              }}
            />
          );
        })}
        <motion.div 
          animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.5, 0.2] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          className="w-24 h-24 rounded-full blur-[40px]" 
          style={{ backgroundColor: `${color}35` }} 
        />
      </div>
    );
  };

  const renderTomorrowSky = () => {
    if (variant !== 'tomorrow-sky') return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1], 
            opacity: [0.15, 0.35, 0.15] 
          }} 
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          className="w-80 h-80 rounded-full blur-[70px]" 
          style={{ backgroundColor: `${color}25` }} 
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[460px] relative select-none">
      
      {/* Visual backdrops */}
      {renderMorningWaves()}
      {renderLightRays()}
      {renderForceFlow()}
      {renderCollectingLight()}
      {renderTomorrowSky()}

      {/* ─── TITLE & CONTEXT ─── */}
      <div className="z-10 flex flex-col items-center w-full text-center space-y-2 mt-2">
        <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">Пространство звука</span>
        <h3 className="text-xl font-light text-white/95">{practiceName || 'Атмосфера'}</h3>
      </div>

      {/* ─── DYNAMIC INTERACTION AREA ─── */}
      <div className="z-10 flex flex-col items-center justify-center w-full flex-1 my-6 px-4">
        
        {/* Morning Intention Choice */}
        {variant === 'morning-intention' && (
          <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
            <p className="text-sm font-light text-white/70 text-center max-w-[280px] leading-relaxed">
              Каким бы ты хотел видеть сегодняшний день?
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
              {MORNING_CHIPS.map(chip => {
                const isActive = selectedChip === chip;
                return (
                  <motion.button 
                    key={chip} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => { setSelectedChip(chip); triggerHaptic('light'); }}
                    className="px-4 py-2 rounded-full text-xs transition-all relative overflow-hidden"
                    style={{
                      background: isActive ? `${color}1a` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                      boxShadow: isActive ? `0 0 15px -3px ${color}30` : 'none'
                    }}
                  >
                    {chip}
                  </motion.button>
                );
              })}
            </div>
            
            <AnimatePresence mode="wait">
              {selectedChip && (
                <motion.p 
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-xs text-white/35 font-mono tracking-wider text-center"
                >
                  Сегодняшний день будет {selectedChip.toLowerCase()}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Day Code Choice */}
        {variant === 'day-code' && (
          <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
            <p className="text-sm font-light text-white/70 text-center max-w-[280px] leading-relaxed">
              Выбери приоритетную сферу внимания на сегодня
            </p>
            <div className="flex flex-col items-center gap-2 w-full max-w-[220px]">
              {DAY_CODE_CHIPS.map(chip => {
                const isActive = selectedChip === chip;
                return (
                  <motion.button 
                    key={chip} 
                    whileTap={{ scale: 0.96 }} 
                    onClick={() => { setSelectedChip(chip); triggerHaptic('light'); }}
                    className="w-full py-3 rounded-2xl text-xs transition-all border text-center uppercase tracking-widest font-mono"
                    style={{
                      background: isActive ? `${color}18` : 'rgba(255,255,255,0.02)',
                      borderColor: isActive ? `${color}45` : 'rgba(255,255,255,0.05)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                      boxShadow: isActive ? `0 0 20px -5px ${color}30` : 'none'
                    }}
                  >
                    {chip}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cinematic Timer for environmental modes */}
        {(variant === 'morning-wake' || variant === 'force-flow' || variant === 'external-intention' || variant === 'day-resource' || variant === 'tomorrow-sky' || variant === 'night-diary') && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <span className="text-5xl font-extralight font-mono text-white tracking-widest">
              {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
            </span>
            {howItWorks && (
              <p className="text-xs text-white/35 font-light text-center max-w-[260px] leading-relaxed">
                {howItWorks}
              </p>
            )}
          </div>
        )}

      </div>

      {/* ─── SIGNATURE ACTION BUTTON ─── */}
      <div className="w-full max-w-sm px-6 z-10 mt-auto pb-2">
        <button
          onClick={onFinish}
          className="w-full py-4 rounded-2xl text-xs font-semibold tracking-[0.2em] active:scale-95 transition-all text-white border border-white/5 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.06] shadow-2xl uppercase"
          style={{
            boxShadow: `0 4px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05)`
          }}
        >
          Завершить созерцание
        </button>
      </div>

    </div>
  );
}
