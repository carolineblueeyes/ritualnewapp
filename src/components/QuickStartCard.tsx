import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Practice } from '../types';

interface QuickStartCardProps {
  practice: Practice;
  onClick: () => void;
}

const emojiMap: Record<string, string> = {
  'start-day': '☀️',
  'important-moment': '🎤',
  'calm-down': '😰',
  'pause': '⏸️',
  'focus': '🧠',
  'restore': '😴',
  'end-day': '🌙'
};

const cardBg: Record<string, { img: string; gradient: string }> = {
  'start-day': {
    img: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(30,20,5,0.3) 0%, rgba(10,8,4,0.85) 100%)'
  },
  'calm-down': {
    img: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(5,15,30,0.3) 0%, rgba(5,8,15,0.85) 100%)'
  },
  'pause': {
    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(20,15,10,0.3) 0%, rgba(8,6,4,0.85) 100%)'
  },
  'focus': {
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(5,15,25,0.3) 0%, rgba(4,8,12,0.85) 100%)'
  },
  'restore': {
    img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(15,25,10,0.3) 0%, rgba(6,10,4,0.85) 100%)'
  },
  'end-day': {
    img: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(15,5,30,0.3) 0%, rgba(6,2,12,0.85) 100%)'
  },
  'important-moment': {
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(to bottom, rgba(20,10,30,0.3) 0%, rgba(10,5,15,0.85) 100%)'
  }
};

const fallbackGradient = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';

export default function QuickStartCard({ practice, onClick }: QuickStartCardProps) {
  const bg = cardBg[practice.id];
  const isCompleted = practice.completed;

  return (
    <motion.div
      onClick={onClick}
      className={`relative w-[140px] h-[180px] rounded-[20px] cursor-pointer overflow-hidden p-4 flex flex-col justify-between select-none transition-opacity ${isCompleted ? 'opacity-50' : ''}`}
      style={!bg ? { background: fallbackGradient } : undefined}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background image */}
      {bg && (
        <>
          <img 
            src={bg.img} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0" style={{ background: bg.gradient }} />
        </>
      )}

      {/* Icon */}
      <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center border text-base ${isCompleted ? 'bg-white/[0.04] border-white/[0.04]' : 'bg-black/20 border-white/[0.08] backdrop-blur-sm'}`}>
        {isCompleted ? (
          <Check className="w-4 h-4 text-white/50" strokeWidth={2} />
        ) : (
          <span>{emojiMap[practice.id] || '✨'}</span>
        )}
      </div>

      {/* Title + duration */}
      <div className="relative z-10 flex flex-col gap-0.5">
        <h4 className={`text-[13px] font-semibold leading-tight line-clamp-2 ${isCompleted ? 'text-white/50 line-through' : 'text-white'}`}>
          {practice.title}
        </h4>
        <span className="text-[10px] text-white/55 font-medium">
          {practice.duration}
        </span>
      </div>

      {/* Completion badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center border border-white/10 backdrop-blur-sm">
          <Check className="w-3 h-3 text-white/70 stroke-[2.5]" />
        </div>
      )}
    </motion.div>
  );
}
