import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const completedRef = useRef(false);
  const skippedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    completedRef.current = false;
    skippedRef.current = false;
    setIndex(-1);
  }, [thoughts]);

  useEffect(() => {
    if (!autoAdvance || thoughts.length === 0) return;

    if (reducedMotion) {
      setIndex(thoughts.length - 1);
      finish();
      return;
    }

    let cancelled = false;
    let timer: number;

    const showNext = (next: number) => {
      if (cancelled || skippedRef.current) return;
      if (next >= thoughts.length) {
        finish();
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
  }, [thoughts, initialDelay, pauseMs, autoAdvance, reducedMotion, finish]);

  const skipRemaining = () => {
    if (thoughts.length === 0) return;
    skippedRef.current = true;
    setIndex(thoughts.length - 1);
    finish();
  };

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
    <div
      className={className}
      onClick={skipRemaining}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          skipRemaining();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Пропустить паузы"
    >
      <AnimatePresence mode="wait">
        {index >= 0 && index < thoughts.length && (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
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
