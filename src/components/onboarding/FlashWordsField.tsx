import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface FlashWordsFieldProps {
  words: string[];
  onComplete?: () => void;
}

const POSITIONS = [
  { top: '8%', left: '6%', rotate: -8 },
  { top: '14%', right: '4%', rotate: 6 },
  { top: '32%', left: '12%', rotate: -4 },
  { top: '28%', right: '10%', rotate: 10 },
  { top: '48%', left: '4%', rotate: 5 },
  { top: '44%', right: '6%', rotate: -7 },
  { top: '62%', left: '18%', rotate: -3 },
  { top: '58%', right: '14%', rotate: 8 },
];

export default function FlashWordsField({ words, onComplete }: FlashWordsFieldProps) {
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const placements = useMemo(
    () => words.map((word, i) => ({
      word,
      ...POSITIONS[i % POSITIONS.length],
      delay: i * 0.55,
    })),
    [words],
  );

  React.useEffect(() => {
    if (reducedMotion) {
      onComplete?.();
      return;
    }
    const timer = window.setTimeout(() => onComplete?.(), words.length * 550 + 800);
    return () => window.clearTimeout(timer);
  }, [words.length, onComplete, reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="flex flex-wrap gap-2 justify-center px-4">
        {words.map((word) => (
          <span key={word} className="text-sm text-white/50">{word}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-52 w-full max-w-sm mx-auto">
      {placements.map(({ word, delay, rotate, ...pos }) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
          animate={{ opacity: [0, 1, 0.72], scale: [0.8, 1.05, 1], filter: ['blur(8px)', 'blur(0px)', 'blur(0px)'] }}
          transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute text-[15px] font-display text-white/55 tracking-wide"
          style={{ ...pos, transform: `rotate(${rotate}deg)` }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
