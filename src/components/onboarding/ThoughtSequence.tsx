import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ThoughtSequenceProps {
  thoughts: string[];
  /** Pause before first thought (ms) */
  initialDelay?: number;
  /** Pause between thoughts (ms) */
  pauseMs?: number;
  onComplete?: () => void;
  className?: string;
  thoughtClassName?: string;
  autoAdvance?: boolean;
}

export default function ThoughtSequence({
  thoughts,
  initialDelay = 400,
  pauseMs = 1400,
  onComplete,
  className = '',
  thoughtClassName = '',
  autoAdvance = true,
}: ThoughtSequenceProps) {
  const [index, setIndex] = useState(-1);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!autoAdvance || thoughts.length === 0) return;

    if (reducedMotion) {
      setIndex(thoughts.length - 1);
      onComplete?.();
      return;
    }

    let cancelled = false;
    let timer: number;

    const showNext = (next: number) => {
      if (cancelled) return;
      if (next >= thoughts.length) {
        onComplete?.();
        return;
      }
      setIndex(next);
      timer = window.setTimeout(() => showNext(next + 1), pauseMs);
    };

    timer = window.setTimeout(() => showNext(0), initialDelay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [thoughts, initialDelay, pauseMs, onComplete, autoAdvance, reducedMotion]);

  if (reducedMotion) {
    return (
      <div className={className}>
        {thoughts.map((thought) => (
          <p key={thought} className={`${thoughtClassName} mb-4 last:mb-0`}>{thought}</p>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {index >= 0 && index < thoughts.length && (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className={thoughtClassName}
          >
            {thoughts[index]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
