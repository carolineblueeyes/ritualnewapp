import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InteractionConfig } from '../data/practices/types';

interface PracticeInteractiveProps {
  interaction: InteractionConfig;
  onComplete: (result?: any) => void;
  crystalColor: string;
}

export default function PracticeInteractive({
  interaction,
  onComplete,
  crystalColor,
}: PracticeInteractiveProps) {
  const [tapsCount, setTapsCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdComplete, setHoldComplete] = useState(false);
  const [swiped, setSwiped] = useState<string | null>(null);
  const [dissolvedSpots, setDissolvedSpots] = useState<number[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const [pinchScale, setPinchScale] = useState(1);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  // Taps mode
  const handleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (interaction.type !== 'taps') return;

      const target = interaction.targets ?? 3;
      const newCount = tapsCount + 1;

      // Ripple
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, x: clientX - rect.left, y: clientY - rect.top }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 800);

      if (newCount >= target) {
        setTapsCount(target);
        setTimeout(() => onComplete({ taps: newCount }), 400);
      } else {
        setTapsCount(newCount);
      }
    },
    [interaction, tapsCount, onComplete]
  );

  // Tap dissolve mode
  const handleDissolve = useCallback(
    (index: number) => {
      if (interaction.type !== 'tap_dissolve') return;
      const target = interaction.targets ?? 5;
      if (dissolvedSpots.includes(index)) return;
      const updated = [...dissolvedSpots, index];
      setDissolvedSpots(updated);
      if (updated.length >= target) {
        setTimeout(() => onComplete({ dissolved: updated.length }), 400);
      }
    },
    [interaction, dissolvedSpots, onComplete]
  );

  // Tap choice mode
  const handleChoice = useCallback(
    (choiceIndex: number) => {
      if (interaction.type !== 'tap_choice') return;
      setChosenColor(interaction.choices?.[choiceIndex]?.color ?? null);
      setTimeout(() => onComplete({ choice: choiceIndex }), 600);
    },
    [interaction, onComplete]
  );

  // Hold mode
  useEffect(() => {
    if (interaction.type !== 'hold' || holdComplete) return;
    // Managed externally via touch handlers
  }, [interaction, holdComplete]);

  const startHold = useCallback(() => {
    if (interaction.type !== 'hold' || holdComplete) return;
    const duration = interaction.duration ?? 3;
    let elapsed = 0;
    const step = 50;

    holdIntervalRef.current = setInterval(() => {
      elapsed += step;
      const progress = Math.min((elapsed / (duration * 1000)) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setHoldComplete(true);
        setTimeout(() => onComplete({ heldFor: duration }), 400);
      }
    }, step);
  }, [interaction, holdComplete, onComplete]);

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (!holdComplete) setHoldProgress(0);
  }, [holdComplete]);

  // Swipe mode - touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (interaction.type !== 'swipe' || !touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < 30) return;

      let direction: string;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      setSwiped(direction);
      setTimeout(() => onComplete({ swipe: direction }), 400);
      touchStartRef.current = null;
    },
    [interaction, onComplete]
  );

  // Pinch mode - two-finger touch
  const initialPinchDist = useRef<number | null>(null);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (interaction.type !== 'pinch') return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (initialPinchDist.current === null) {
          initialPinchDist.current = dist;
        } else {
          const scale = dist / initialPinchDist.current;
          setPinchScale(Math.min(Math.max(scale, 0.5), 2));
          if (scale > 1.5 || scale < 0.5) {
            onComplete({ pinchScale: scale });
            initialPinchDist.current = null;
          }
        }
      }
    },
    [interaction, onComplete]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const totalTargets = interaction.targets ?? (interaction.type === 'taps' ? 3 : 5);

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center gap-6 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Instruction */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-white/60 text-center max-w-[260px] leading-relaxed"
      >
        {interaction.instruction}
      </motion.p>

      {/* Taps mode */}
      {interaction.type === 'taps' && (
        <div className="relative">
          <motion.div
            onClick={handleTap}
            whileTap={{ scale: 0.92 }}
            className="w-40 h-40 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:border-white/20 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
            style={{
              boxShadow: `0 0 30px -8px ${crystalColor}40`,
            }}
          >
            <span className="text-3xl font-normal text-white/80 font-mono">{tapsCount}</span>
            <span className="text-[10px] text-white/40 font-mono mt-1">
              / {totalTargets}
            </span>

            {/* Ripple effects */}
            <AnimatePresence>
              {ripples.map((ripple) => (
                <motion.div
                  key={ripple.id}
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute w-10 h-10 rounded-full border pointer-events-none"
                  style={{
                    left: ripple.x - 20,
                    top: ripple.y - 20,
                    borderColor: `${crystalColor}60`,
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Progress dots */}
          <div className="flex gap-2 justify-center mt-4">
            {[...Array(totalTargets)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{ scale: tapsCount > i ? 1.2 : 0.8 }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  tapsCount > i ? 'border-0' : 'border border-white/15'
                }`}
                style={{
                  backgroundColor: tapsCount > i ? crystalColor : 'transparent',
                  boxShadow: tapsCount > i ? `0 0 6px 1px ${crystalColor}80` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tap dissolve mode */}
      {interaction.type === 'tap_dissolve' && (
        <div className="relative w-48 h-48">
          {[...Array(totalTargets)].map((_, i) => (
            <motion.button
              key={i}
              onClick={() => handleDissolve(i)}
              animate={{
                opacity: dissolvedSpots.includes(i) ? 0 : 0.8,
                scale: dissolvedSpots.includes(i) ? 0 : 1,
              }}
              transition={{ duration: 0.5 }}
              className="absolute w-8 h-8 rounded-full bg-black/60 border border-white/5 cursor-pointer hover:bg-black/40"
              style={{
                top: `${15 + Math.sin(i * 2.3) * 35}%`,
                left: `${15 + Math.cos(i * 1.7) * 35}%`,
                filter: 'blur(1px)',
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-mono text-white/60">
              {dissolvedSpots.length} / {totalTargets}
            </span>
          </div>
        </div>
      )}

      {/* Tap choice mode */}
      {interaction.type === 'tap_choice' && interaction.choices && (
        <div className="flex gap-4">
          {interaction.choices.map((choice, i) => (
            <motion.button
              key={i}
              onClick={() => handleChoice(i)}
              whileTap={{ scale: 0.9 }}
              animate={{
                scale: chosenColor === choice.color ? 1.3 : 1,
                opacity: chosenColor && chosenColor !== choice.color ? 0.3 : 1,
              }}
              className="w-16 h-16 rounded-full border-2 cursor-pointer"
              style={{
                backgroundColor: `${choice.color}30`,
                borderColor: chosenColor === choice.color ? choice.color : `${choice.color}40`,
                boxShadow: chosenColor === choice.color ? `0 0 20px 4px ${choice.color}50` : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Hold mode */}
      {interaction.type === 'hold' && (
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={crystalColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - holdProgress / 100)}
              style={{ filter: `drop-shadow(0 0 4px ${crystalColor})` }}
            />
          </svg>

          <motion.div
            onTouchStart={startHold}
            onTouchEnd={stopHold}
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            whileTap={{ scale: 0.95 }}
            className="w-28 h-28 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center cursor-pointer select-none"
          >
            {holdComplete ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xl"
                style={{ color: crystalColor }}
              >
                ✓
              </motion.div>
            ) : (
              <span className="text-[10px] font-mono text-white/50 uppercase">Удерживайте</span>
            )}
          </motion.div>
        </div>
      )}

      {/* Swipe mode */}
      {interaction.type === 'swipe' && (
        <div className="relative w-48 h-48 flex items-center justify-center">
          <motion.div
            animate={{
              x: swiped === 'left' ? -60 : swiped === 'right' ? 60 : 0,
              y: swiped === 'up' ? -60 : swiped === 'down' ? 60 : 0,
              opacity: swiped ? 0 : 1,
            }}
            className="w-20 h-20 rounded-full border border-white/10 bg-white/[0.03]"
            style={{ boxShadow: `0 0 20px -6px ${crystalColor}40` }}
          />
          {/* Direction hints */}
          {['↑', '↓', '←', '→'].map((dir, i) => (
            <span
              key={i}
              className="absolute text-white/60 text-lg"
              style={{
                top: i === 0 ? 0 : i === 1 ? undefined : '50%',
                bottom: i === 1 ? 0 : undefined,
                left: i === 2 ? 0 : i === 3 ? undefined : '50%',
                right: i === 3 ? 0 : undefined,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {dir}
            </span>
          ))}
          {swiped && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute text-sm font-mono"
              style={{ color: crystalColor }}
            >
              {swiped}
            </motion.span>
          )}
        </div>
      )}

      {/* Pinch mode */}
      {interaction.type === 'pinch' && (
        <div className="relative w-48 h-48 flex items-center justify-center">
          <motion.div
            animate={{ scale: pinchScale }}
            className="w-24 h-24 rounded-full border border-white/10 bg-white/[0.03]"
            style={{ boxShadow: `0 0 20px -6px ${crystalColor}40` }}
          />
          <span className="absolute bottom-0 text-[10px] font-mono text-white/60">
            {Math.round(pinchScale * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
