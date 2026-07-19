import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Check, Clock, Heart } from 'lucide-react';
import { Practice } from '../types';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

interface PracticeCardProps {
  practice: Practice;
  onClick: () => void;
  index?: number;
  isFavProp?: boolean;
  onToggleFav?: (practiceId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Энергия': '⚡',
  'Покой': '🌊',
  'Баланс': '⚖️',
  'Фокус': '🎯',
  'Сила': '💪',
  'Сон': '🌙',
};

export default function PracticeCard({ practice, onClick, index = 0, isFavProp, onToggleFav }: PracticeCardProps) {
  const [isFavLocal, setIsFavLocal] = useState(() => {
    try {
      const favs = localStorage.getItem('ritual_favorite_practices_list');
      if (favs) {
        return JSON.parse(favs).includes(practice.id);
      }
    } catch {}
    return false;
  });

  const isFav = isFavProp !== undefined ? isFavProp : isFavLocal;

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFav) {
      onToggleFav(practice.id);
    } else {
      try {
        const favsStr = localStorage.getItem('ritual_favorite_practices_list');
        let favs = favsStr ? JSON.parse(favsStr) : [];
        if (favs.includes(practice.id)) {
          favs = favs.filter((id: string) => id !== practice.id);
          setIsFavLocal(false);
        } else {
          favs.push(practice.id);
          setIsFavLocal(true);
        }
        localStorage.setItem('ritual_favorite_practices_list', JSON.stringify(favs));
        requestPrivacySafeSync();
      } catch {}
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] active:scale-[0.98] transition-all duration-200 overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        {/* Color indicator */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div
            className="w-2 h-2 rounded-full transition-transform group-hover:scale-125"
            style={{
              backgroundColor: practice.color,
              boxShadow: `0 0 8px 2px ${practice.color}60`,
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium">
              {CATEGORY_ICONS[practice.mood] || '✦'} {practice.mood}
            </span>
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/55 flex items-center gap-1 font-medium">
              <Clock className="w-2.5 h-2.5" />
              {practice.duration}
            </span>
          </div>

          <h3 className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors truncate">
            {practice.title}
          </h3>

          <p className="text-[11px] text-white/50 mt-0.5 max-w-[260px] truncate leading-relaxed font-medium">
            {practice.description}
          </p>
        </div>

        {/* Action button & heart */}
        <div className="flex-shrink-0 pl-2 flex items-center gap-2">
          <button
            onClick={toggleFav}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
              isFav 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/60 hover:border-white/10'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
          </button>

          {practice.completed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${practice.color}20, ${practice.color}08)`,
                border: `1px solid ${practice.color}30`,
              }}
            >
              <Check className="w-4 h-4" style={{ color: `${practice.color}cc` }} strokeWidth={2} />
            </motion.div>
          ) : (
            <div
              className="w-10 h-10 rounded-full border border-white/[0.06] bg-white/[0.03] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-white/[0.1] transition-all"
            >
              <Play className="w-4 h-4 text-white/40 fill-current ml-0.5 group-hover:text-white/60 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
