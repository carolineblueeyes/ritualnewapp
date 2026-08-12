import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Heart, ChevronRight } from 'lucide-react';
import { StandalonePractice } from '../data/practices/types';
import { STANDALONE_GROUP_COLORS } from '../data/practices';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

interface StandalonePracticeCardProps {
  practice: StandalonePractice;
  onClick: () => void;
  index?: number;
  isFavProp?: boolean;
  onToggleFav?: (practiceId: string) => void;
}

export default function StandalonePracticeCard({
  practice,
  onClick,
  index = 0,
  isFavProp,
  onToggleFav,
}: StandalonePracticeCardProps) {
  const color = STANDALONE_GROUP_COLORS[practice.groupId];
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m}:00`;
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="group w-full flex items-center gap-3 py-3.5 border-b border-[rgba(242,239,232,0.12)] text-left active:scale-[0.99] transition-transform duration-[160ms] ease-out cursor-pointer"
    >
      <div
        className="w-9 h-9 rounded-full flex-shrink-0"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}88, ${color}22 55%, transparent 70%)`,
          boxShadow: `0 0 12px ${color}33`,
        }}
      />
      <div className="min-w-0 flex-1">
        <span className="text-[15px] font-medium text-[#F2EFE8]/88 block truncate">{practice.title}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock className="w-3 h-3 text-[#F2EFE8]/30" />
          <span className="text-[11px] text-[#F2EFE8]/42">{formatDuration(practice.duration)}</span>
          {practice.shortDuration && (
            <span className="text-[11px] text-[#F2EFE8]/30">· короткая {formatDuration(practice.shortDuration)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={toggleFav}
          aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isFav ? 'text-rose-400/80' : 'text-[#F2EFE8]/25 hover:text-[#F2EFE8]/50'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>
        <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25 group-hover:text-[#F2EFE8]/50 transition-colors" />
      </div>
    </motion.div>
  );
}
