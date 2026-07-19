import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Clock, Heart } from 'lucide-react';
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
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={onClick}
      className="w-full p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] active:scale-[0.98] text-left flex items-center justify-between transition-all cursor-pointer select-none"
    >
      <div className="flex gap-3 items-center min-w-0 flex-1">
        <div
          className="w-1 h-8 rounded-full flex-shrink-0"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px 1px ${color}40`,
          }}
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-white/85 block truncate">
            {practice.title}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3 text-white/35" />
            <span className="text-[10px] text-white/50 font-medium">
              {formatDuration(practice.duration)}
            </span>
            {practice.shortDuration && (
              <span className="text-[10px] text-white/35 font-medium">
                · короткая {formatDuration(practice.shortDuration)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleFav}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            isFav 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
              : 'bg-white/[0.02] border-white/5 text-white/35 hover:text-white/60'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
        </button>

        <div
          className="w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            borderColor: `${color}30`,
            backgroundColor: `${color}08`,
          }}
        >
          <Play className="w-3 h-3 fill-current ml-0.5" style={{ color: `${color}99` }} />
        </div>
      </div>
    </motion.div>
  );
}
