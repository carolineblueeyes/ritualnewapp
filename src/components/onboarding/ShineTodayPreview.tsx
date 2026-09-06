import React from 'react';
import { motion } from 'motion/react';
import SilkShaderBackground from '../SilkShaderBackground';
import ThoughtSequence from './ThoughtSequence';

interface ShineTodayPreviewProps {
  thoughts: string[];
  onThoughtsComplete: () => void;
}

const SHINE_DEMO = 82;
const ACCENT = '#74B6A0';
const ARC = 251;

export default function ShineTodayPreview({ thoughts, onThoughtsComplete }: ShineTodayPreviewProps) {
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <SilkShaderBackground accentColor={ACCENT} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090A]/10 via-transparent to-[#08090A]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.5rem))]">
        <div className="relative w-64 h-36 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 200 100" aria-hidden="true">
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="rgba(242,239,232,0.08)"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
            <motion.path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke={ACCENT}
              strokeLinecap="round"
              strokeWidth="2"
              initial={{ strokeDasharray: ARC, strokeDashoffset: ARC }}
              animate={{ strokeDashoffset: ARC - (ARC * (SHINE_DEMO / 100)) }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[88px] font-display font-light text-[#F2EFE8] leading-none tabular-nums"
            >
              {SHINE_DEMO}
            </motion.span>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-[#F2EFE8]/70 tracking-[0.06em]">Сияние</p>
        <p className="mt-8 text-[28px] font-display font-light text-[#F2EFE8]/55 text-center leading-[1.12]">
          Что ты выбираешь сегодня?
        </p>

        <div className="mt-10 w-full max-w-[320px] min-h-[96px]">
          <ThoughtSequence
            thoughts={thoughts}
            pauseMs={2600}
            initialDelay={700}
            thoughtClassName="text-[17px] leading-[1.45] text-[#F2EFE8]/80 text-center"
            onComplete={onThoughtsComplete}
          />
        </div>
      </div>
    </div>
  );
}
