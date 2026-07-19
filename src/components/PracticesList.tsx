import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Activity, Compass, Volume2, Heart } from 'lucide-react';
import { Practice } from '../types';
import { standaloneData, StandalonePractice, STANDALONE_GROUP_COLORS, STANDALONE_GROUP_TITLES, ChapterId } from '../data/practices';
import PracticePlayer from './PracticePlayer';
import PracticeCard from './PracticeCard';
import StandalonePracticeCard from './StandalonePracticeCard';

interface PracticesListProps {
  practices: Practice[];
  onSelectPractice: (practice: Practice) => void;
  onSelectTool: (toolId: 'breathing' | 'activity' | 'focus' | 'atmosphere') => void;
}

type FilterMood = 'all' | 'favorites' | 'istok' | 'tishina' | 'energiya' | 'yasnost';

const STANDALONE_GROUPS: ChapterId[] = ['istok', 'tishina', 'energiya', 'yasnost'];

const GROUP_SUBTITLES: Record<ChapterId, string> = {
  istok: '7 практик · Возвращение к себе',
  tishina: '10 практик · Глубокий покой',
  energiya: '9 практик · Внутренний огонь',
  yasnost: '9 практик · Зеркальная призма',
};

const TOOL_CARDS = [
  {
    tool: 'breathing' as const,
    title: 'Дыхание',
    subtitle: '9 ритмов · Кастом',
    icon: Wind,
    img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=400&auto=format&fit=crop',
  },
  {
    tool: 'activity' as const,
    title: 'Активность',
    subtitle: 'Трекинг · Цели',
    icon: Activity,
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop',
  },
  {
    tool: 'focus' as const,
    title: 'Фокус',
    subtitle: 'Таймер · Помодоро',
    icon: Compass,
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
  },
  {
    tool: 'atmosphere' as const,
    title: 'Атмосфера',
    subtitle: 'Звуковой ландшафт',
    icon: Volume2,
    img: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=400&auto=format&fit=crop',
  },
];

export default function PracticesList({ practices, onSelectPractice, onSelectTool }: PracticesListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMood>('istok');
  const [activeStandalone, setActiveStandalone] = useState<StandalonePractice | null>(null);

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

  const filteredPractices = practices.filter(p => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'favorites') return favoriteIds.includes(p.id);
    return MOOD_MAPPING[p.mood] === activeFilter;
  });

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 select-none pb-24">
      {!activeStandalone && (
        <>

      {/* SECTION: ИНСТРУМЕНТЫ */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] text-white/55 uppercase px-1 tracking-[0.15em] font-semibold">Инструменты</span>

        <div className="grid grid-cols-2 gap-3">
          {TOOL_CARDS.map((card) => {
            const TIcon = card.icon;
            return (
              <motion.div
                key={card.tool}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectTool(card.tool)}
                className="relative rounded-2xl border border-white/[0.04] overflow-hidden cursor-pointer flex flex-col justify-between h-32 hover:border-white/[0.08] transition-all"
              >
                <img
                  src={card.img}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

                <div className="relative z-10 p-3.5 pb-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] backdrop-blur-sm flex items-center justify-center border border-white/[0.06]">
                    <TIcon className="w-4 h-4 text-white/70" strokeWidth={2} />
                  </div>
                </div>

                <div className="relative z-10 p-3.5 pt-0">
                  <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                  <span className="text-[10px] text-white/55 font-medium">{card.subtitle}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Category Horizontal Filter */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] text-white/55 uppercase px-1 tracking-[0.15em] font-semibold">Категории</span>

        <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex-none px-4 py-2 rounded-full text-[12px] font-medium transition-all border duration-300 ${
                activeFilter === filter.value
                  ? 'bg-white/[0.08] text-white border-white/[0.12]'
                  : 'bg-white/[0.02] text-white/50 border-white/[0.04] hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Practice cards */}
      <div className="flex flex-col gap-2">
        {filteredPractices.length > 0 && (
          <span className="text-[11px] text-white/55 uppercase px-1 tracking-[0.15em] font-semibold mb-1 block">
            {activeFilter === 'all' ? 'Все базовые практики' : activeFilter === 'favorites' ? 'Избранные практики' : 'Базовые практики'}
          </span>
        )}
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
      </div>

      {/* STANDALONE PRACTICES SECTION */}
      {(() => {
        let items: StandalonePractice[] = [];
        let sectionTitle = '';
        
        if (activeFilter === 'all') {
          items = STANDALONE_GROUPS.flatMap(groupId => standaloneData[groupId] || []);
          sectionTitle = 'Все медитации';
        } else if (activeFilter === 'favorites') {
          const allStandalone = STANDALONE_GROUPS.flatMap(groupId => standaloneData[groupId] || []);
          items = allStandalone.filter(p => favoriteIds.includes(p.id));
          sectionTitle = 'Избранные медитации';
        } else {
          items = standaloneData[activeFilter] || [];
          sectionTitle = `Медитации Группы «${STANDALONE_GROUP_TITLES[activeFilter]}»`;
        }

        if (items.length === 0) return null;

        return (
          <div className="flex flex-col gap-3 mt-1">
            <span className="text-[11px] text-white/55 uppercase px-1 tracking-[0.15em] font-semibold">
              {sectionTitle}
            </span>
            <div className="flex flex-col gap-1.5">
              {items.map((practice, idx) => (
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
            </div>
          </div>
        );
      })()}

      {/* Empty state for Favorites */}
      {activeFilter === 'favorites' && filteredPractices.length === 0 && (
        (() => {
          const allStandalone = STANDALONE_GROUPS.flatMap(groupId => standaloneData[groupId] || []);
          const favoriteStandalone = allStandalone.filter(p => favoriteIds.includes(p.id));
          if (favoriteStandalone.length === 0) {
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-6 border border-white/[0.04] bg-white/[0.01] text-center flex flex-col items-center gap-3 py-10"
              >
                <Heart className="w-8 h-8 text-white/10" strokeWidth={1.5} />
                <h4 className="text-sm font-semibold text-white/70">Избранное пусто</h4>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-[240px]">
                  Нажмите на сердечко <Heart className="w-3 h-3 inline fill-white/15 text-white/30" /> у любой практики или медитации, чтобы добавить её сюда.
                </p>
              </motion.div>
            );
          }
          return null;
        })()
      )}

      {/* Insight Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 border border-white/[0.04] bg-white/[0.02]"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-[10px] text-white/50 uppercase tracking-wider">Рекомендация</span>
        </div>
        <h4 className="text-sm font-normal text-white/70 mb-1">Балансируйте практику</h4>
        <p className="text-[11px] text-white/35 leading-relaxed font-normal">
          Судя по активности за неделю, упражнение <span className="text-white/55">Успокоиться</span> поможет снизить напряжение перед сном.
        </p>
      </motion.div>
        </>
      )}

      {/* Active Standalone Practice Modal */}
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
