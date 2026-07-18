import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Calendar, Compass, Lock, CheckCircle, HelpCircle } from 'lucide-react';
import { UserStats, Practice } from '../types';
import PracticeEngine from './PracticeEngine';
import { chaptersData, ChapterId, getPracticeScript } from '../data/practices';
import { deriveRealStats } from '../services/progressStats';

interface StatsPanelProps {
  stats: UserStats;
  practices: Practice[];
  onAddMinutes?: (mins: number) => void;
}

const CHAPTER_ORDER: ChapterId[] = ['istok', 'tishina', 'energiya', 'yasnost'];

const CRYSTAL_COLOR_SCHEMES: Record<string, {
  color: string;
  glow: string;
  facets: string[];
}> = {
  crystal: {
    color: '#E6B85C',
    glow: 'rgba(230, 184, 92, 0.4)',
    facets: ['rgba(230, 184, 92, 0.35)', 'rgba(230, 184, 92, 0.15)', 'rgba(230, 184, 92, 0.22)', 'rgba(230, 184, 92, 0.4)']
  },
  silence: {
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.4)',
    facets: ['rgba(96, 165, 250, 0.35)', 'rgba(96, 165, 250, 0.15)', 'rgba(96, 165, 250, 0.22)', 'rgba(96, 165, 250, 0.4)']
  },
  energy: {
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.4)',
    facets: ['rgba(244, 63, 94, 0.35)', 'rgba(244, 63, 94, 0.15)', 'rgba(244, 63, 94, 0.22)', 'rgba(244, 63, 94, 0.4)']
  },
  clarity: {
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    facets: ['rgba(168, 85, 247, 0.35)', 'rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.22)', 'rgba(168, 85, 247, 0.4)']
  }
};

const CHAPTER_DESCRIPTIONS: Record<ChapterId, string> = {
  istok: 'Возвращение к себе. Основы присутствия и внутреннего света.',
  tishina: 'Глубокий покой. Погружение в тишину озера.',
  energiya: 'Внутренний огонь. Пробуждение и направление энергии.',
  yasnost: 'Зеркальная призма. Чистота восприятия и ясность.',
};

export default function StatsPanel({ stats, practices, onAddMinutes }: StatsPanelProps) {
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ritual_completed_path_levels');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeMeditation, setActiveMeditation] = useState<{
    chapterId: ChapterId;
    levelIndex: number;
  } | null>(null);
  const [showCrystalInfo, setShowCrystalInfo] = useState(false);

  useEffect(() => {
    if (showCrystalInfo || activeMeditation) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCrystalInfo, activeMeditation]);

  const realStats = deriveRealStats(stats);
  const totalMinutes = realStats.totalMinutes;
  const completedCount = realStats.completedCount;
  const streakDays = realStats.streakDays;
  const hasPracticeHistory = realStats.history.length > 0;
  const averagePracticesPerDay = Math.round((completedCount / (streakDays || 1)) * 10) / 10;
  const stabilityText = hasPracticeHistory
    ? `Вы выполняете ${averagePracticesPerDay} практик в день. Регулярность считается только по реальной истории сессий.`
    : 'Здесь появится аналитика после первой завершенной практики. Демо-данные больше не подставляются.';
  const totalCompletedCount = completedLevelIds.length;

  let crystalState: 'fog' | 'spark' | 'crystal' | 'silence' | 'energy' | 'clarity' = 'fog';
  if (totalCompletedCount >= 21) crystalState = 'clarity';
  else if (totalCompletedCount >= 16) crystalState = 'energy';
  else if (totalCompletedCount >= 11) crystalState = 'silence';
  else if (totalCompletedCount >= 6) crystalState = 'crystal';
  else if (totalCompletedCount >= 1) crystalState = 'spark';

  const handleCompleteMeditation = () => {
    if (!activeMeditation) return;
    const levelId = `${activeMeditation.chapterId}_${activeMeditation.levelIndex}`;
    if (!completedLevelIds.includes(levelId)) {
      const updated = [...completedLevelIds, levelId];
      setCompletedLevelIds(updated);
      localStorage.setItem('ritual_completed_path_levels', JSON.stringify(updated));
      if (onAddMinutes) onAddMinutes(5);
    }
    setActiveMeditation(null);
  };

  const isLevelUnlocked = (chapterId: ChapterId, index: number) => {
    if (chapterId === 'istok' && index === 0) return true;
    const currentChapterObjIndex = CHAPTER_ORDER.indexOf(chapterId);
    if (currentChapterObjIndex === -1) return false;
    if (index === 0) {
      const prevChapterId = CHAPTER_ORDER[currentChapterObjIndex - 1];
      const prevChapter = chaptersData[prevChapterId];
      return prevChapter.levels.every((_, i) => completedLevelIds.includes(`${prevChapterId}_${i}`));
    }
    return completedLevelIds.includes(`${chapterId}_${index - 1}`);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 select-none pb-24">

      {/* ====== SECTION: КРИСТАЛЛ ВНИМАНИЯ — Completely unboxed & minimalist ====== */}
      <div className="relative p-2 pb-6 flex flex-col items-center text-center gap-4">
        <button
          onClick={() => setShowCrystalInfo(true)}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-all z-20"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Majestic Glowing Crystal Canvas */}
        <div className="w-28 h-28 flex items-center justify-center relative my-2">
          {/* Subtle pulsating shadow behind the crystal */}
          <div className="absolute w-20 h-20 bg-white/[0.03] rounded-full blur-2xl animate-pulse" />
          
          <AnimatePresence mode="wait">
            {crystalState === 'fog' && (
              <motion.div key="fog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 blur-md" />
              </motion.div>
            )}
            {crystalState === 'spark' && (
              <motion.div key="spark" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-4 h-4 rounded-full bg-white shadow-[0_0_15px_6px_rgba(255,255,255,0.4)]"
                />
              </motion.div>
            )}
            {crystalState !== 'fog' && crystalState !== 'spark' && (() => {
              const scheme = CRYSTAL_COLOR_SCHEMES[crystalState] || CRYSTAL_COLOR_SCHEMES.crystal;
              return (
                <motion.div 
                  key={crystalState} 
                  initial={{ scale: 0.7, opacity: 0, rotate: -20 }} 
                  animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="relative"
                >
                  {/* Dynamic color glow overlay */}
                  <div 
                    className="absolute inset-0 rounded-full blur-2xl animate-pulse" 
                    style={{ backgroundColor: `${scheme.color}20` }}
                  />
                  <svg viewBox="0 0 40 40" className="w-24 h-24 filter drop-shadow-[0_0_15px_var(--glow)]" style={{ '--glow': scheme.glow } as any}>
                    <polygon points="20,2 34,18 20,22" fill={scheme.facets[0]} stroke={scheme.color} strokeWidth="0.5" />
                    <polygon points="20,2 6,18 20,22" fill={scheme.facets[1]} stroke={scheme.color} strokeWidth="0.5" />
                    <polygon points="20,38 34,18 20,22" fill={scheme.facets[2]} stroke={scheme.color} strokeWidth="0.5" />
                    <polygon points="20,38 6,18 20,22" fill={scheme.facets[3]} stroke={scheme.color} strokeWidth="0.5" strokeLinejoin="round" />
                    {/* Inner core reflection */}
                    <line x1="20" y1="2" x2="20" y2="38" stroke="white" strokeWidth="0.3" strokeDasharray="1 1" opacity="0.3" />
                  </svg>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-amber-300 font-mono tracking-[0.2em] uppercase font-bold">КРИСТАЛЛ ВНИМАНИЯ</span>
          <h3 className="text-lg font-semibold text-white mt-1.5">
            {crystalState === 'fog' && 'Утренний Туман'}
            {crystalState === 'spark' && 'Искра Пробуждения'}
            {crystalState === 'crystal' && 'Кристалл Истока'}
            {crystalState === 'silence' && 'Сияние Тишины'}
            {crystalState === 'energy' && 'Искры Энергии'}
            {crystalState === 'clarity' && 'Спектр Ясности'}
          </h3>
          <p className="text-[11px] text-white/50 leading-relaxed max-w-[260px] mt-1 font-medium text-center">
            {crystalState === 'fog' && 'Сделайте ваш первый шаг на Пути внимания, чтобы зажечь Искру.'}
            {crystalState === 'spark' && 'Искра зажглась. Завершайте уровни, чтобы вырастить структуру кристалла.'}
            {crystalState === 'crystal' && 'Геометрия стабилизировалась. Вы укрепили основы присутствия.'}
            {crystalState === 'silence' && 'Ваш кристалл сияет чистым светом глубокой внутренней тишины.'}
            {crystalState === 'energy' && 'Теплые искры активности наполняют структуру энергией.'}
            {crystalState === 'clarity' && 'Абсолютная призма ясности. Вы полностью прошли Путь внимания.'}
          </p>
        </div>

        {/* Progress bar inside Crystal Card - Swiss Refined Integration */}
        <div className="w-full border-t border-white/[0.03] pt-4 mt-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] text-white/30 font-mono uppercase tracking-[0.15em]">
            <span>Прогресс пути</span>
            <span className="text-white/50 font-semibold font-mono">{totalCompletedCount} / 21 УРОВНЕЙ</span>
          </div>
          <div className="relative w-full h-1 bg-white/[0.02] rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-300 to-white rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (totalCompletedCount / 21) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ====== SECTION: МОЙ ПРОГРЕСС — Swiss Linear Elegance ====== */}
      <div className="border-y border-white/[0.08] bg-transparent py-6 px-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-mono font-bold">АНАЛИТИКА ПРОГРЕССА</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono font-semibold">АКТИВЕН</span>
          </div>
        </div>

        {/* Linear stats with vertical hairline separators */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="flex flex-col gap-1 pr-3">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">СЕРИИ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">{streakDays}</span>
              <span className="text-[10px] text-orange-400 font-mono font-medium">дн.</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">подряд</span>
          </div>

          <div className="flex flex-col gap-1 px-4">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">ВРЕМЯ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">{totalMinutes}</span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">мин.</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">выполнено</span>
          </div>

          <div className="flex flex-col gap-1 pl-4">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">СЕССИИ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">{completedCount}</span>
              <span className="text-[10px] text-blue-400 font-mono font-medium">раз</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">всего</span>
          </div>
        </div>

        {/* Integrated Stability Meter */}
        <div className="border-t border-white/[0.06] pt-4 mt-1 flex items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest block">ОБЩАЯ СТАБИЛЬНОСТЬ</span>
            <p className="text-[11px] text-white/60 font-medium mt-1 leading-relaxed">
              {stabilityText}
            </p>
          </div>
          <div className="flex flex-col items-end flex-none gap-0.5">
            <span className="text-xl font-bold font-mono text-amber-300 leading-none">{Math.round((totalCompletedCount / 21) * 100)}%</span>
            <span className="text-[8px] text-white/35 font-mono uppercase tracking-wider mt-1">ИНДЕКС</span>
          </div>
        </div>
      </div>

      {/* ПУТЬ ВНИМАНИЯ (Главы) */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-white/60 uppercase px-1 tracking-wider font-semibold">Путь внимания</span>

        {CHAPTER_ORDER.map((chapId) => {
          const chap = chaptersData[chapId];
          const isExpanded = activeChapter === chapId;
          const completedInChap = chap.levels.filter((_, idx) =>
            completedLevelIds.includes(`${chapId}_${idx}`)
          ).length;

          return (
            <div
              key={chapId}
              className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setActiveChapter(isExpanded ? null : chapId)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex gap-3 items-center">
                  <div
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ backgroundColor: chap.color }}
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-white/90">{chap.title}</h4>
                    <span className="text-[10px] text-white/70 font-medium">
                      Прогресс: {completedInChap} / {chap.levels.length}
                    </span>
                  </div>
                </div>
                <svg className={`w-3 h-3 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4.5 2.5L8 6L4.5 9.5" />
                </svg>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/[0.04] bg-white/[0.01] px-4 py-3 flex flex-col gap-2"
                  >
                    <p className="text-[11px] text-white/55 mb-2 leading-relaxed font-medium">
                      {CHAPTER_DESCRIPTIONS[chapId]}
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {chap.levels.map((level, idx) => {
                        const levelId = `${chapId}_${idx}`;
                        const isCompleted = completedLevelIds.includes(levelId);
                        const isUnlocked = isLevelUnlocked(chapId, idx);

                        return (
                          <button
                            key={idx}
                            disabled={!isUnlocked}
                            onClick={() => setActiveMeditation({ chapterId: chapId, levelIndex: idx })}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isCompleted
                                ? 'bg-white/[0.03] border-white/[0.06]'
                                : isUnlocked
                                  ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.03]'
                                  : 'bg-white/[0.01] border-transparent opacity-25 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex gap-2.5 items-center min-w-0">
                              <span className="text-[10px] text-white/65 font-medium">
                                {idx + 1 < 10 ? '0' : ''}{idx + 1}
                              </span>
                              <span className="text-xs font-medium text-white/80 truncate max-w-[200px]">
                                {level.title}
                              </span>
                            </div>
                            <div>
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-white/40" />
                              ) : isUnlocked ? (
                                <Compass className="w-4 h-4 text-white/60" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-white/15" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Crystal Info Modal */}
      <AnimatePresence>
        {showCrystalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80">
            <div className="absolute inset-0" onClick={() => setShowCrystalInfo(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e11] border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full z-10 relative"
            >
              <h3 className="text-sm font-semibold text-white/90 mb-2">Стадии Кристалла Внимания</h3>
              <div className="w-8 h-px bg-white/10 rounded-full mb-4" />

              <p className="text-[11px] text-white/60 leading-relaxed font-medium mb-3">
                Ваш прогресс имеет материальную форму в пространстве Ritual.
              </p>

              <ul className="text-[11px] text-white/60 flex flex-col gap-2 list-disc pl-4 mb-4 font-medium">
                <li><span className="text-white/80 font-semibold">Туман</span> — начальное состояние до первого шага.</li>
                <li><span className="text-white/80 font-semibold">Искра</span> — пробуждение после первого уровня.</li>
                <li><span className="text-white/80 font-semibold">Кристалл Истока</span> — стабильная геометрия (Глава 1).</li>
                <li><span className="text-white/80 font-semibold">Сияние Тишины</span> — глубокий покой (Глава 2).</li>
                <li><span className="text-white/80 font-semibold">Искры Энергии</span> — баланс бодрости (Глава 3).</li>
                <li><span className="text-white/80 font-semibold">Спектр Ясности</span> — абсолютное сияние (Глава 4).</li>
              </ul>

              <button
                onClick={() => setShowCrystalInfo(false)}
                className="w-full h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] text-[11px] font-semibold text-white/70 hover:bg-white/[0.08] transition-colors"
              >
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Practice runner modal */}
      <AnimatePresence>
        {activeMeditation && (() => {
          const script = getPracticeScript(activeMeditation.chapterId, activeMeditation.levelIndex);
          if (!script) return null;
          return (
            <PracticeEngine
              script={script}
              onComplete={handleCompleteMeditation}
              onExit={() => setActiveMeditation(null)}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
