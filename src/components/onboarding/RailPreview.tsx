import React from 'react';
import { motion } from 'motion/react';
import { Mic, Send } from 'lucide-react';
import { RAIL_NAME } from '../../constants/brand';
import ThoughtSequence from './ThoughtSequence';

interface RailPreviewProps {
  thoughts: string[];
  onThoughtsComplete: () => void;
}

export default function RailPreview({ thoughts, onThoughtsComplete }: RailPreviewProps) {
  return (
    <div className="flex flex-1 flex-col justify-end overflow-hidden">
      <div className="absolute left-6 top-[max(1.5rem,env(safe-area-inset-top))]">
        <span className="text-[13px] text-[#F2EFE8]/42">{RAIL_NAME}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="flex h-16 items-end justify-center gap-1" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <motion.div
              key={index}
              animate={{ height: [14, 22 + Math.sin(index * 1.1) * 16, 14] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
              className="w-1 rounded-full bg-[#F2EFE8]/35"
            />
          ))}
        </div>

        <div className="w-full max-w-sm min-h-[148px] flex items-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-5">
            <ThoughtSequence
              thoughts={thoughts}
              pauseMs={2400}
              initialDelay={500}
              thoughtClassName="text-[17px] leading-[1.45] text-[#F2EFE8]/88"
              onComplete={onThoughtsComplete}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-6 pb-2 pointer-events-none opacity-55" aria-hidden="true">
        <div className="flex gap-2 overflow-hidden">
          {['Мне тревожно', 'Нет сил', 'Больше энергии'].map((label) => (
            <span
              key={label}
              className="flex-none rounded-2xl border border-white/[0.04] bg-white/[0.04] px-4 py-2 text-xs text-white/50"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8e0d4] text-[#070709]">
            <Mic className="h-[18px] w-[18px] stroke-[2]" />
          </div>
          <div className="relative flex flex-1 items-center">
            <div className="h-11 w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 text-sm text-white/20 flex items-center">
              Состояние...
            </div>
            <div className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">
              <Send className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
