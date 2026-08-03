import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Calendar, Compass, Lock, CheckCircle, HelpCircle } from 'lucide-react';
import { UserStats, Practice } from '../types';
import PracticeEngine from './PracticeEngine';
import { chaptersData, ChapterId, getPracticeScript } from '../data/practices';
import ProgressJournal from './ProgressJournal';
import { deriveRealStats } from '../services/progressStats';
import ParticleSphere from './ui/particle-sphere';

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

const FIELD_DOTS = Array.from({ length: 221 });

function formatStatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return '0';
  const rounded = Math.round(minutes * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function PathAttentionField({
  completedLevelIds,
}: {
  completedLevelIds: string[];
}) {
  const chapterStats = CHAPTER_ORDER.map((chapterId) => {
    const chapter = chaptersData[chapterId];
    const completed = chapter.levels.filter((_, index) =>
      completedLevelIds.includes(`${chapterId}_${index}`)
    ).length;
    return {
      id: chapterId,
      title: chapter.title,
      color: chapter.color,
      completed,
      total: chapter.levels.length,
      progress: completed / chapter.levels.length,
    };
  });

  const totalCompleted = chapterStats.reduce((sum, item) => sum + item.completed, 0);
  const totalLevels = chapterStats.reduce((sum, item) => sum + item.total, 0);
  const completion = totalLevels ? totalCompleted / totalLevels : 0;
  const leftPull = chapterStats[0].progress + chapterStats[1].progress;
  const rightPull = chapterStats[2].progress + chapterStats[3].progress;
  const topPull = chapterStats[1].progress + chapterStats[3].progress;
  const x = Math.min(66, Math.max(28, 42 + (rightPull - leftPull) * 16));
  const y = Math.min(68, Math.max(30, 58 - topPull * 12 + completion * 4));
  const scale = 0.72 + completion * 0.72;
  const balance = Math.round(
    (1 - Math.min(1, Math.max(...chapterStats.map(item => item.progress)) - Math.min(...chapterStats.map(item => item.progress)))) * 100
  );

  return (
    <section className="px-5 py-8 border-t border-white/[0.07]">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] text-white/42 uppercase tracking-[0.24em] font-mono font-bold">Карта пути</span>
          <h3 className="mt-2 text-2xl font-light text-white/92">Отпечаток внимания</h3>
        </div>
        <div className="text-right">
          <span className="block text-4xl font-light leading-none text-white">{balance}</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/34">баланс</span>
        </div>
      </div>

      <div className="relative h-[340px] overflow-hidden border-y border-white/[0.06]">
        <div className="absolute inset-x-10 top-0 h-px bg-white/[0.10]" />
        <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-white/[0.08]" />
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.08]" />

        <span className="absolute left-1/2 top-4 -translate-x-1/2 text-[10px] font-semibold text-white/46">Устойчивость</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/46">Покой</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/46">Энергия</span>
        <span className="absolute bottom-[5.6rem] left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white/30">Исток</span>

        <div className="absolute inset-10 grid grid-cols-[repeat(17,1fr)] gap-2 opacity-45">
          {FIELD_DOTS.map((_, index) => (
            <span key={index} className="h-0.5 w-0.5 rounded-full bg-white/35" />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.74 }}
          animate={{ opacity: 1, scale }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute h-40 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/55 blur-2xl"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.88, scale: 0.82 + chapterStats[1].progress * 0.6 }}
          transition={{ duration: 0.8, delay: 0.08 }}
          className="absolute h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/70 blur-2xl"
          style={{ left: `${Math.max(24, x - 12)}%`, top: `${Math.min(70, y + 4)}%` }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.86, scale: 0.7 + chapterStats[3].progress * 0.72 }}
          transition={{ duration: 0.8, delay: 0.14 }}
          className="absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400/80 blur-xl"
          style={{ left: `${Math.max(24, x - 20)}%`, top: `${Math.min(72, y + 8)}%` }}
        />

        <div className="absolute bottom-5 left-5 right-5 grid grid-cols-2 gap-x-4 gap-y-3">
          {chapterStats.map((chapter) => (
            <div key={chapter.id} className="min-w-0">
              <div className="mb-1 flex min-h-[14px] items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[8px] uppercase tracking-[0.08em] text-white/42">{chapter.title}</span>
                <span className="flex-none text-[8px] text-white/34">{chapter.completed}/{chapter.total}</span>
              </div>
              <div className="h-px bg-white/[0.08]">
                <div
                  className="h-px"
                  style={{ width: `${chapter.progress * 100}%`, backgroundColor: chapter.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
  const totalMinutesLabel = formatStatMinutes(totalMinutes);
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
  const crystalScheme = CRYSTAL_COLOR_SCHEMES[crystalState] || CRYSTAL_COLOR_SCHEMES.crystal;

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
    <div className="w-full max-w-md mx-auto select-none pb-24 bg-black text-white" style={{ '--flow-color': crystalScheme.color } as React.CSSProperties}>

      {/* ====== SECTION: КРИСТАЛЛ ВНИМАНИЯ — Completely unboxed & minimalist ====== */}
      <section className="relative min-h-[430px] overflow-hidden px-5 pb-8 pt-9 flex flex-col items-center text-center">
        <div className="absolute left-1/2 top-2 -translate-x-1/2 opacity-55">
          <ParticleSphere size={340} opacity={0.44} color={crystalScheme.color} particleCount={260} />
        </div>
        <button
          onClick={() => setShowCrystalInfo(true)}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/[0.035] flex items-center justify-center text-white/42 hover:text-white transition-all z-20"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Majestic Glowing Crystal Canvas */}
        <div className="hidden">
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

        <div className="relative z-10 mt-24 flex flex-col items-center">
          <span className="text-[10px] font-mono tracking-[0.34em] uppercase font-bold" style={{ color: crystalScheme.color }}>ПУТЬ ВНИМАНИЯ</span>
          <div className="mt-7 flex items-end justify-center gap-2">
            <span className="text-[108px] font-light leading-[0.82] tracking-[-0.04em] text-white">
              {Math.round((totalCompletedCount / 21) * 100)}
            </span>
            <span className="mb-3 text-2xl font-light text-white/45">%</span>
          </div>
          <h3 className="mt-5 text-2xl font-light leading-tight text-white/92">
            {crystalState === 'fog' && 'Начало практики'}
            {crystalState === 'spark' && 'Первые уровни'}
            {crystalState === 'crystal' && 'Ритм закрепляется'}
            {crystalState === 'silence' && 'Глубина растет'}
            {crystalState === 'energy' && 'Стабильная энергия'}
            {crystalState === 'clarity' && 'Путь завершен'}
          </h3>
          <p className="mt-4 max-w-[300px] text-[13px] font-medium leading-relaxed text-white/54">
            {totalCompletedCount > 0
              ? `Пройдено ${totalCompletedCount} из 21 уровней. Продолжай без спешки: важен не темп, а возвращение.`
              : 'Здесь появится личная динамика после первой завершенной практики.'}
          </p>
        </div>

        {/* Progress bar inside Crystal Card - Swiss Refined Integration */}
        <div className="relative z-10 w-full pt-10 mt-auto flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] text-white/30 font-mono uppercase tracking-[0.15em]">
            <span>Прогресс пути</span>
            <span className="text-white/62 font-semibold font-mono">{totalCompletedCount} / 21 УРОВНЕЙ</span>
          </div>
          <div className="relative w-full h-1 bg-white/[0.02] rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, (totalCompletedCount / 21) * 100)}%`,
                background: `linear-gradient(90deg, ${crystalScheme.color}, #ffffff)`,
                boxShadow: `0 0 22px ${crystalScheme.glow}`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ====== SECTION: МОЙ ПРОГРЕСС — Swiss Linear Elegance ====== */}
      <section className="px-5 py-7 flex flex-col gap-7 border-t border-white/[0.07]">
        <span className="text-[10px] text-white/42 uppercase tracking-[0.24em] font-mono font-bold">Сводка</span>

        {/* Linear stats with vertical hairline separators */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
          <div className="flex flex-col gap-1 pr-3">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">СЕРИИ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl font-light font-mono text-white tracking-tight">{streakDays}</span>
              <span className="text-[10px] text-orange-400 font-mono font-medium">дн.</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">подряд</span>
          </div>

          <div className="flex flex-col gap-1 px-4">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">ВРЕМЯ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl font-light font-mono text-white tracking-tight">{totalMinutesLabel}</span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">мин.</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">выполнено</span>
          </div>

          <div className="flex flex-col gap-1 pl-4">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest">СЕССИИ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl font-light font-mono text-white tracking-tight">{completedCount}</span>
              <span className="text-[10px] text-blue-400 font-mono font-medium">раз</span>
            </div>
            <span className="text-[9px] text-white/45 font-medium leading-none mt-0.5">всего</span>
          </div>
        </div>

        {/* Integrated Stability Meter */}
        <div className="metric-hairline" />
        <div className="flex items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] text-white/35 font-mono uppercase tracking-widest block">ОБЩАЯ СТАБИЛЬНОСТЬ</span>
            <p className="text-[11px] text-white/60 font-medium mt-1 leading-relaxed">
              {stabilityText}
            </p>
          </div>
          <div className="flex flex-col items-end flex-none gap-0.5">
            <span className="text-3xl font-light font-mono leading-none" style={{ color: crystalScheme.color }}>{Math.round((totalCompletedCount / 21) * 100)}%</span>
            <span className="text-[8px] text-white/35 font-mono uppercase tracking-wider mt-1">ИНДЕКС</span>
          </div>
        </div>
      </section>

      <PathAttentionField completedLevelIds={completedLevelIds} />

      <ProgressJournal stats={realStats} />

      {/* ПУТЬ ВНИМАНИЯ (Главы) */}
      <section className="px-6 py-8">
        <span className="text-[10px] text-white/45 uppercase tracking-[0.24em] font-mono font-semibold">Путь внимания</span>

        {CHAPTER_ORDER.map((chapId) => {
          const chap = chaptersData[chapId];
          const isExpanded = activeChapter === chapId;
          const completedInChap = chap.levels.filter((_, idx) =>
            completedLevelIds.includes(`${chapId}_${idx}`)
          ).length;

          return (
            <div
              key={chapId}
              className="border-b border-white/[0.075] overflow-hidden"
            >
              <button
                onClick={() => setActiveChapter(isExpanded ? null : chapId)}
                className="w-full py-5 flex items-center justify-between text-left"
              >
                <div className="flex gap-3 items-center">
                  <div
                    className="w-9 h-9 rounded-full flex-none border border-white/[0.08]"
                    style={{ background: `radial-gradient(circle, ${chap.color} 0%, ${chap.color}66 42%, transparent 68%)`, boxShadow: `0 0 22px ${chap.color}44` }}
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
                    className="overflow-hidden pb-5 flex flex-col gap-2"
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
                            className={`w-full py-3 border-b border-white/[0.045] text-left flex items-center justify-between transition-all ${
                              isCompleted
                                ? 'text-white'
                                : isUnlocked
                                  ? 'text-white/78 hover:text-white'
                                  : 'opacity-25 cursor-not-allowed'
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
      </section>

      {/* Crystal Info Modal */}
      <AnimatePresence>
        {showCrystalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl ritual-nebula" style={{ '--nebula-color': crystalScheme.color } as React.CSSProperties}>
            <div className="absolute inset-0" onClick={() => setShowCrystalInfo(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="ritual-sheet rounded-[32px] p-6 max-w-sm w-full z-10 relative"
              style={{ '--sheet-color': crystalScheme.color } as React.CSSProperties}
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
                className="w-full h-10 rounded-xl ritual-soft-control text-[11px] font-semibold text-white/72 hover:bg-white/[0.08] transition-colors"
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
