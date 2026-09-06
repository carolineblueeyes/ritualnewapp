import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

interface FlashWordsFieldProps {
  words: string[];
  onComplete?: () => void;
}

const POSITIONS = [
  { top: '6%', left: '8%', rotate: -11 },
  { top: '18%', right: '6%', rotate: 8 },
  { top: '38%', left: '4%', rotate: -5 },
  { top: '28%', right: '12%', rotate: 12 },
  { top: '58%', left: '16%', rotate: 4 },
];

export default function FlashWordsField({ words, onComplete }: FlashWordsFieldProps) {
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const placements = useMemo(
    () => words.map((word, i) => ({
      word,
      ...POSITIONS[i % POSITIONS.length],
      delay: i * 0.7,
    })),
    [words],
  );

  useEffect(() => {
    if (reducedMotion) {
      onComplete?.();
      return;
    }
    const timer = window.setTimeout(() => onComplete?.(), words.length * 700 + 900);
    return () => window.clearTimeout(timer);
    // Intentionally ignore onComplete identity — parent passes an inline setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length, reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-4">
        {words.map((word) => (
          <span key={word} className="text-[22px] text-[#F2EFE8]/45">{word}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full max-w-sm mx-auto">
      {placements.map(({ word, delay, rotate, ...pos }) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
          animate={{
            opacity: [0, 1, 0.38],
            scale: [0.92, 1.04, 1],
            filter: ['blur(12px)', 'blur(0px)', 'blur(0px)'],
          }}
          transition={{ duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute text-[26px] font-display font-light text-[#F2EFE8] tracking-[-0.02em]"
          style={{ ...pos, rotate: `${rotate}deg` }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
