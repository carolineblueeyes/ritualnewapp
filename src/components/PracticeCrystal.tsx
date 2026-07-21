import React, { useId, useMemo } from 'react';
import { motion } from 'motion/react';

interface PracticeCrystalProps {
  facets: number;
  color: string;
  fogPercent: number;
  glowIntensity: number;
  rotationSpeed: number;
  isSubmerged?: boolean;
  hasBeam?: boolean;
  hasSparks?: boolean;
  hasShadows?: boolean;
  isPulsing?: boolean;
  pulseRate?: number;
}

function generateCrystalPath(facets: number, cx: number, cy: number, r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < facets; i++) {
    const angle = (Math.PI * 2 * i) / facets - Math.PI / 2;
    const variation = 0.85 + Math.sin(i * 1.7) * 0.15;
    points.push([
      cx + Math.cos(angle) * r * variation,
      cy + Math.sin(angle) * r * variation,
    ]);
  }
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';
}

function generateFacetLines(facets: number, cx: number, cy: number, r: number): string[] {
  const lines: string[] = [];
  const step = Math.max(2, Math.floor(facets / 4));
  for (let i = 0; i < facets; i += step) {
    const angle = (Math.PI * 2 * i) / facets - Math.PI / 2;
    const innerR = r * 0.35;
    lines.push(
      `M${cx + Math.cos(angle) * innerR},${cy + Math.sin(angle) * innerR} L${cx + Math.cos(angle) * r * 0.9},${cy + Math.sin(angle) * r * 0.9}`
    );
  }
  return lines;
}

export default function PracticeCrystal({
  facets,
  color,
  fogPercent,
  glowIntensity,
  rotationSpeed,
  isSubmerged = false,
  hasBeam = false,
  hasSparks = false,
  hasShadows = false,
  isPulsing = false,
  pulseRate = 4,
}: PracticeCrystalProps) {
  const cx = 100;
  const cy = 100;
  const r = 70;

  const crystalPath = useMemo(() => generateCrystalPath(facets, cx, cy, r), [facets]);
  const facetLines = useMemo(() => generateFacetLines(facets, cx, cy, r), [facets]);
  const crystalId = useId().replace(/:/g, '');
  const bodyGradientId = `crystal-body-grad-${crystalId}`;
  const strokeGradientId = `crystal-stroke-grad-${crystalId}`;
  const glowFilterId = `crystal-glow-${crystalId}`;

  const sparkleCount = hasSparks ? Math.min(facets, 16) : 0;

  return (
    <div className="relative w-56 h-56 flex items-center justify-center select-none pointer-events-none">
      {/* Glow backdrop */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [glowIntensity * 0.3, glowIntensity * 0.6, glowIntensity * 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-44 h-44 rounded-full blur-[28px]"
        style={{
          backgroundColor: color,
          transform: 'translateZ(0)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Beam effect */}
      {hasBeam && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2], scaleY: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 w-1 h-32 origin-bottom rounded-full"
          style={{
            background: `linear-gradient(to top, ${color}, transparent)`,
            filter: `blur(2px)`,
            willChange: 'transform, opacity',
          }}
        />
      )}

      {/* Water submersion effect */}
      {isSubmerged && (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full overflow-hidden"
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-3/4 opacity-20"
            style={{
              background: `linear-gradient(to top, ${color}40, transparent)`,
            }}
          />
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ x: [0, 8 * (i % 2 === 0 ? 1 : -1), 0], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              className="absolute h-[1px] w-8 rounded-full"
              style={{
                background: `${color}60`,
                top: `${30 + i * 10}%`,
                left: `${10 + i * 15}%`,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Crystal SVG */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-48 h-48"
        animate={{
          rotate: rotationSpeed > 0 ? 360 : 0,
          scale: isPulsing ? [1, 1.06, 1] : 1,
        }}
        transition={{
          rotate: { duration: rotationSpeed || 999, repeat: Infinity, ease: 'linear' },
          scale: { duration: pulseRate, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform',
          filter: `drop-shadow(0 14px 24px ${color}22)`,
        }}
      >
        <defs>
          <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="50%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={strokeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main crystal body */}
        <motion.path
          d={crystalPath}
          fill={`url(#${bodyGradientId})`}
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="0.8"
          filter={isPulsing ? undefined : `url(#${glowFilterId})`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />

        {/* Facet lines */}
        {facetLines.map((line, i) => (
          <motion.path
            key={i}
            d={line}
            stroke={`${color}40`}
            strokeWidth="0.4"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.5, delay: i * 0.1 }}
          />
        ))}

        {/* Facet reveal light wave */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r * 1.2}
          fill="none"
          stroke={`${color}30`}
          strokeWidth="1"
          initial={{ r: 0, opacity: 0.8 }}
          animate={{ r: r * 1.2, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', repeatDelay: 3 }}
        />
      </motion.svg>

      {/* Dark shadows overlay for Level 4 Исток */}
      {hasShadows && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              className="absolute rounded-full bg-black/40"
              style={{
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
                top: `${25 + Math.sin(i * 2.1) * 25}%`,
                left: `${25 + Math.cos(i * 1.7) * 25}%`,
                filter: 'blur(3px)',
              }}
            />
          ))}
        </div>
      )}

      {/* Fire sparks */}
      {hasSparks && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(sparkleCount)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -(20 + i * 3)],
                x: [0, (i % 2 === 0 ? 1 : -1) * (5 + i * 2)],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 1.2 + (i % 3) * 0.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut',
              }}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: color,
                top: `${55 + (i % 4) * 8}%`,
                left: `${35 + (i % 5) * 8}%`,
                boxShadow: `0 0 4px 1px ${color}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Fog overlay */}
      {fogPercent > 0 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(100,100,120,${fogPercent / 100 * 0.7}) 0%, transparent 70%)`,
            backdropFilter: `blur(${Math.min(fogPercent / 100 * 4, 3)}px)`,
          }}
        />
      )}
    </div>
  );
}
