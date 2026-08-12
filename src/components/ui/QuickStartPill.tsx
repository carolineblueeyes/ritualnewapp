import React from 'react';
import { motion } from 'motion/react';
import { Practice } from '../../types';

interface QuickStartPillProps {
  practice: Practice;
  onClick: () => void;
  index?: number;
}

export default function QuickStartPill({ practice, onClick, index = 0 }: QuickStartPillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="snap-start flex-shrink-0 flex items-center h-12 px-4 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-md active:scale-[0.97] transition-transform duration-[160ms] ease-out"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mr-2.5"
        style={{ backgroundColor: practice.color, boxShadow: `0 0 8px ${practice.color}66` }}
      />
      <span className="text-[13px] font-medium text-[#F2EFE8]/90 whitespace-nowrap">{practice.title}</span>
    </motion.button>
  );
}
