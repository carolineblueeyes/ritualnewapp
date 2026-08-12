import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Activity, Compass, Volume2, Heart, FlaskConical } from 'lucide-react';
import { Practice } from '../types';
import { standaloneData, StandalonePractice, STANDALONE_GROUP_COLORS, STANDALONE_GROUP_TITLES, ChapterId } from '../data/practices';
import PracticePlayer from './PracticePlayer';
import PracticeCard from './PracticeCard';
import StandalonePracticeCard from './StandalonePracticeCard';
import ToolTile from './ui/ToolTile';
import SectionMeta from './ui/SectionMeta';
import GlassSurface from './ui/GlassSurface';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';

interface PracticesListProps {
  practices: Practice[];
  onSelectPractice: (practice: Practice) => void;
  onSelectTool: (toolId: 'breathing' | 'activity' | 'focus' | 'atmosphere') => void;
  onOpenInsights?: () => void;
  searchOpen?: boolean;
  onSearchClose?: () => void;
}

type FilterMood = 'all' | 'favorites' | 'istok' | 'tishina' | 'energiya' | 'yasnost';

const STANDALONE_GROUPS: ChapterId[] = ['istok', 'tishina', 'energiya', 'yasnost'];

const TOOL_TILES = [
  { tool: 'breathing' as const, title: 'Дыхание', subtitle: '9 ритмов', icon: Wind, accent: '#74B6A0' },
  { tool: 'activity' as const, title: 'Активность', subtitle: 'Трекинг', icon: Activity, accent: '#7dd3fc' },
  { tool: 'focus' as const, title: 'Фокус', subtitle: 'Помодоро', icon: Compass, accent: '#C59A55' },
  { tool: 'atmosphere' as const, title: 'Атмосфера', subtitle: 'Звук', icon: Volume2, accent: '#a78bfa' },
];

export default function PracticesList({
  practices,
  onSelectPractice,
  onSelectTool,
  onOpenInsights,
  searchOpen = false,
  onSearchClose,
}: PracticesListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMood>('istok');
  const [activeStandalone, setActiveStandalone] = useState<StandalonePractice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const favs = localStorage.getItem('ritual_favorite_practices_list');
      return favs ? JSON.parse(favs) : [];
    } catch {
      return [];
    }
  });

  const handleToggleFavorite = (practiceId: string) => {
    try {
      const favsStr = localStorage.getItem('ritual_favorite_practices_list');
      let favs = favsStr ? JSON.parse(favsStr) : [];
      if (favs.includes(practiceId)) {
        favs = favs.filter((id: string) => id !== practiceId);
      } else {
        favs.push(practiceId);
      }
      localStorage.setItem('ritual_favorite_practices_list', JSON.stringify(favs));
      setFavoriteIds(favs);
      requestPrivacySafeSync();
    } catch {}
  };

  const filters: { label: React.ReactNode; value: FilterMood }[] = [
    { label: 'Все', value: 'all' },
    { label: <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline-block" />, value: 'favorites' },
    { label: 'Исток', value: 'istok' },
    { label: 'Тишина', value: 'tishina' },
    { label: 'Энергия', value: 'energiya' },
    { label: 'Ясность', value: 'yasnost' },
  ];

  const MOOD_MAPPING: Record<string, FilterMood> = {
    'Энергия': 'energiya',
    'Сила': 'energiya',
    'Покой': 'tishina',
    'Сон': 'tishina',
    'Баланс': 'istok',
    'Уверенность': 'istok',
    'Фокус': 'yasnost',
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredPractices = useMemo(() => {
    return practices.filter(p => {
      if (q && !p.title.toLowerCase().includes(q) && !p.mood.toLowerCase().includes(q)) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'favorites') return favoriteIds.includes(p.id);
      return MOOD_MAPPING[p.mood] === activeFilter;
    });
  }, [practices, activeFilter, favoriteIds, q]);

  const standaloneItems = useMemo(() => {
    let items: StandalonePractice[] = [];
    if (activeFilter === 'all') {
      items = STANDALONE_GROUPS.flatMap(groupId => standaloneData[groupId] || []);
    } else if (activeFilter === 'favorites') {
      const allStandalone = STANDALONE_GROUPS.flatMap(groupId => standaloneData[groupId] || []);
      items = allStandalone.filter(p => favoriteIds.includes(p.id));
    } else {
      items = standaloneData[activeFilter] || [];
    }
    if (q) {
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeFilter, favoriteIds, q]);

  return (
    <div className="w-full flex flex-col gap-8 select-none pb-24">
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 -mt-2"
          >
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Найти практику..."
              className="flex-1 h-11 px-4 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl text-[15px] text-[#F2EFE8]/90 placeholder:text-[#F2EFE8]/30 outline-none focus:border-white/20"
            />
            <button
              type="button"
              onClick={() => { setSearchQuery(''); onSearchClose?.(); }}
              className="text-[13px] text-[#F2EFE8]/42 px-2"
            >
              Отмена
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeStandalone && (
        <>
          {/* Инструменты — compact glass tiles */}
          <section className="flex flex-col gap-4">
            <SectionMeta>Инструменты</SectionMeta>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {TOOL_TILES.map((tile) => (
                <div key={tile.tool} className="min-h-[104px]">
                  <ToolTile
                    title={tile.title}
                    subtitle={tile.subtitle}
                    icon={tile.icon}
                    accent={tile.accent}
                    onClick={() => onSelectTool(tile.tool)}
                  />
                </div>
              ))}
            </div>
            {onOpenInsights && (
              <GlassSurface as="button" onClick={onOpenInsights} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7dd3fc]/10 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-[#7dd3fc]/80" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-[#F2EFE8]/90">Ritual Insights</p>
                  <p className="text-[11px] text-[#F2EFE8]/42 mt-0.5">Исследования внимания и состояния</p>
                </div>
              </GlassSurface>
            )}
          </section>

          {/* Направление — filters */}
          <section className="flex flex-col gap-3">
            <SectionMeta>Направление</SectionMeta>
            <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`flex-none px-4 py-2 rounded-full text-[13px] font-medium border transition-colors duration-[160ms] ease-out ${
                    activeFilter === filter.value
                      ? 'bg-white/[0.08] text-[#F2EFE8]/90 border-white/12'
                      : 'bg-transparent text-[#F2EFE8]/42 border-[rgba(242,239,232,0.12)] hover:text-[#F2EFE8]/60'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          {/* Base practices — hairline rows */}
          {filteredPractices.length > 0 && (
            <section className="flex flex-col">
              {filteredPractices.map((practice, index) => (
                <div key={practice.id}>
                  <PracticeCard
                    practice={practice}
                    onClick={() => onSelectPractice(practice)}
                    index={index}
                    isFavProp={favoriteIds.includes(practice.id)}
                    onToggleFav={handleToggleFavorite}
                  />
                </div>
              ))}
            </section>
          )}

          {/* Standalone meditations */}
          {standaloneItems.length > 0 && (
            <section className="flex flex-col">
              <SectionMeta className="mb-3 block">
                {activeFilter === 'all'
                  ? 'Медитации'
                  : activeFilter === 'favorites'
                    ? 'Избранные медитации'
                    : STANDALONE_GROUP_TITLES[activeFilter]}
              </SectionMeta>
              {standaloneItems.map((practice, idx) => (
                <div key={practice.id}>
                  <StandalonePracticeCard
                    practice={practice}
                    onClick={() => setActiveStandalone(practice)}
                    index={idx}
                    isFavProp={favoriteIds.includes(practice.id)}
                    onToggleFav={handleToggleFavorite}
                  />
                </div>
              ))}
            </section>
          )}

          {/* Favorites empty */}
          {activeFilter === 'favorites' && filteredPractices.length === 0 && standaloneItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center flex flex-col items-center gap-3"
            >
              <Heart className="w-8 h-8 text-[#F2EFE8]/15" strokeWidth={1.5} />
              <p className="text-[15px] text-[#F2EFE8]/60">Избранное пусто</p>
              <p className="text-[13px] text-[#F2EFE8]/35 max-w-[240px] leading-relaxed">
                Нажмите на сердечко у любой практики, чтобы добавить её сюда.
              </p>
            </motion.div>
          )}
        </>
      )}

      <AnimatePresence>
        {activeStandalone && (
          <PracticePlayer
            practice={{
              id: activeStandalone.id,
              title: activeStandalone.title,
              mood: activeStandalone.subtitle,
              iconName: '',
              duration: `${Math.floor(activeStandalone.duration / 60)} мин`,
              durationSec: activeStandalone.duration,
              color: STANDALONE_GROUP_COLORS[activeStandalone.groupId],
              accentClass: '',
              bgGlowClass: '',
              description: activeStandalone.description,
              breathingPattern: { inhale: 4, hold: 0, exhale: 6, holdEmpty: 0 },
              completed: false,
            }}
            standalone={activeStandalone}
            onClose={() => setActiveStandalone(null)}
            onComplete={() => setActiveStandalone(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
