import React, { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import type { ShineState } from '../../services/health/shine';

interface ShineDialProps {
  score: number;
  accentColor: string;
  state?: ShineState;
  hasData?: boolean;
  size?: number;
}

const RING_RADIUS = 88;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ShineDial({
  score,
  accentColor,
  hasData = true,
  size = 240,
}: ShineDialProps) {
  const uid = useId().replace(/:/g, '');
  const glowId = `shine-glow-${uid}`;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100;

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="absolute inset-0"
        aria-hidden="true"
      >
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(242,239,232,0.08)"
          strokeWidth="2"
        />

        {hasData && (
          <motion.circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: reducedMotion ? dashOffset : RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: reducedMotion ? 0 : 0.85, ease: [0.23, 1, 0.32, 1] }}
            transform="rotate(-90 100 100)"
            filter={`url(#${glowId})`}
            style={{ opacity: 0.95 }}
          />
        )}

        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS + 14}
          fill="none"
          stroke={accentColor}
          strokeWidth="1"
          opacity="0.12"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hasData ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="font-display font-light text-[#F2EFE8] leading-none tabular-nums"
            style={{ fontSize: size * 0.38 }}
          >
            {score}
          </motion.span>
        ) : (
          <span className="font-display font-light text-[#F2EFE8]/35 text-[48px] leading-none">—</span>
        )}
      </div>
    </div>
  );
}
