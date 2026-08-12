import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, Heart, ChevronRight } from 'lucide-react';
import { Practice } from '../types';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

interface PracticeCardProps {
  practice: Practice;
  onClick: () => void;
  index?: number;
  isFavProp?: boolean;
  onToggleFav?: (practiceId: string) => void;
}

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
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="group w-full flex items-center gap-3 py-4 border-b border-[rgba(242,239,232,0.12)] text-left transition-colors duration-[160ms] ease-out active:scale-[0.99] cursor-pointer"
    >
      {/* Nebula thumb */}
      <div
        className="w-10 h-10 rounded-full flex-shrink-0"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${practice.color}88, ${practice.color}22 55%, transparent 70%)`,
          boxShadow: `0 0 16px ${practice.color}33`,
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] text-[#F2EFE8]/42">{practice.mood}</span>
          <span className="text-[#F2EFE8]/25">·</span>
          <span className="text-[11px] text-[#F2EFE8]/42 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {practice.duration}
          </span>
        </div>
        <h3 className="text-[15px] font-medium text-[#F2EFE8]/90 truncate">{practice.title}</h3>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={toggleFav}
          aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-[160ms] ${
            isFav ? 'text-rose-400/80' : 'text-[#F2EFE8]/25 hover:text-[#F2EFE8]/50'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>
        {practice.completed ? (
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: practice.color }}>
            <Check className="w-4 h-4" strokeWidth={2} />
          </div>
        ) : (
          <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25 group-hover:text-[#F2EFE8]/50 transition-colors" />
        )}
      </div>
    </motion.div>
  );
}
