import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Lock, CheckCircle, HelpCircle, ChevronRight } from 'lucide-react';
import { UserStats, Practice } from '../types';
import PracticeEngine from './PracticeEngine';
import { chaptersData, ChapterId, getPracticeScript } from '../data/practices';
import ProgressJournal from './ProgressJournal';
import { deriveRealStats, normalizeHistoryDate } from '../services/progressStats';
import PracticeCrystal from './PracticeCrystal';
import GlassSurface from './ui/GlassSurface';
import SectionMeta from './ui/SectionMeta';

interface StatsPanelProps {
  stats: UserStats;
  practices: Practice[];
  onAddMinutes?: (mins: number) => void;
}

const CHAPTER_ORDER: ChapterId[] = ['istok', 'tishina', 'energiya', 'yasnost'];

const CRYSTAL_COLOR_SCHEMES: Record<string, { color: string }> = {
  fog: { color: '#76668E' },
  spark: { color: '#74B6A0' },
  crystal: { color: '#C59A55' },
  silence: { color: '#76668E' },
  energy: { color: '#C56855' },
  clarity: { color: '#F2EFE8' },
};

const CHAPTER_DESCRIPTIONS: Record<ChapterId, string> = {
  istok: 'Возвращение к себе. Основы присутствия и внутреннего света.',
  tishina: 'Глубокий покой. Погружение в тишину озера.',
  energiya: 'Внутренний огонь. Пробуждение и направление энергии.',
  yasnost: 'Зеркальная призма. Чистота восприятия и ясность.',
};

function formatStatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return '0';
  const rounded = Math.round(minutes * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getRhythmConclusion(streakDays: number, hasHistory: boolean): string {
  if (!hasHistory) return 'Здесь появится ритм после первой завершённой практики.';
  if (streakDays >= 7) return 'Ритм становится устойчивым — вы возвращаетесь к себе регулярно.';
  if (streakDays >= 3) return 'Привычка внимания складывается. Продолжайте в том же темпе.';
  if (streakDays >= 1) return 'Первые шаги уже есть. Каждый день укрепляет практику.';
  return 'Сегодня хороший момент, чтобы вернуться к практике.';
}

function buildWeeklyTrend(history: UserStats['history'], days = 28): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of history) {
    const key = normalizeHistoryDate(item.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: { label: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count: counts.get(key) ?? 0,
    });
  }
  return result;
}

function WeeklyTrendChart({ data, accent }: { data: { label: string; count: number }[]; accent: string }) {
  const max = Math.max(1, ...data.map(d => d.count));
  const weekSlices = [
    data.slice(0, 7),
    data.slice(7, 14),
    data.slice(14, 21),
    data.slice(21, 28),
  ];
  const weekTotals = weekSlices.map(w => w.reduce((s, d) => s + d.count, 0));
  const width = 320;
  const height = 88;
  const padX = 8;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = innerW / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * step;
    const y = padY + innerH - (d.count / max) * innerH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed max-w-[220px]">
          {weekTotals[3] > weekTotals[2]
            ? 'На этой неделе практик больше, чем на прошлой.'
            : weekTotals.some(t => t > 0)
              ? 'Сравнение с предыдущими неделями помогает увидеть ритм.'
              : 'График заполнится после первых сессий.'}
        </p>
        <span className="font-display text-3xl font-light tabular-nums text-[#F2EFE8]/90">{weekTotals[3]}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[88px]" aria-hidden="true">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="rgba(242,239,232,0.12)" strokeWidth="1" />
        <polyline
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {data.map((d, i) => {
          if (d.count === 0) return null;
          const x = padX + i * step;
          const y = padY + innerH - (d.count / max) * innerH;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={accent} />;
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-[#F2EFE8]/30">
        <span>4 недели назад</span>
        <span>Сегодня</span>
      </div>
    </div>
  );
}

function PathNodes({ completedLevelIds }: { completedLevelIds: string[] }) {
  let globalIndex = 0;
  return (
    <div className="flex flex-col gap-6">
      {CHAPTER_ORDER.map((chapterId) => {
        const chapter = chaptersData[chapterId];
        const nodes = chapter.levels.map((_, idx) => {
          const levelId = `${chapterId}_${idx}`;
          const nodeIndex = globalIndex;
          globalIndex += 1;
          const isCompleted = completedLevelIds.includes(levelId);
          const isCurrent = !isCompleted && (
            idx === 0
              ? chapterId === 'istok' || CHAPTER_ORDER.slice(0, CHAPTER_ORDER.indexOf(chapterId)).every(prevId =>
                  chaptersData[prevId].levels.every((__, i) => completedLevelIds.includes(`${prevId}_${i}`))
                )
              : completedLevelIds.includes(`${chapterId}_${idx - 1}`)
          );
          return { levelId, nodeIndex, isCompleted, isCurrent, title: chapter.levels[idx].title };
        });

        return (
          <div key={chapterId}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: chapter.color }} />
              <span className="text-[13px] text-[#F2EFE8]/70">{chapter.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {nodes.map((node) => (
                <span
                  key={node.levelId}
                  title={node.title}
                  className={`w-3 h-3 rounded-full border transition-colors ${
                    node.isCompleted
                      ? 'border-transparent'
                      : node.isCurrent
                        ? 'border-[#F2EFE8]/50 bg-[#F2EFE8]/20'
                        : 'border-[rgba(242,239,232,0.15)] bg-transparent'
                  }`}
                  style={node.isCompleted ? { backgroundColor: chapter.color } : undefined}
                  aria-label={node.isCompleted ? 'Завершено' : node.isCurrent ? 'Текущий уровень' : 'Заблокировано'}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPanel({ stats, practices, onAddMinutes }: StatsPanelProps) {
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ritual_completed_path_levels');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeMeditation, setActiveMeditation] = useState<{ chapterId: ChapterId; levelIndex: number } | null>(null);
  const [showCrystalInfo, setShowCrystalInfo] = useState(false);

  useEffect(() => {
    if (showCrystalInfo || activeMeditation) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCrystalInfo, activeMeditation]);

  const realStats = deriveRealStats(stats);
  const totalMinutesLabel = formatStatMinutes(realStats.totalMinutes);
  const completedCount = realStats.completedCount;
  const streakDays = realStats.streakDays;
  const hasPracticeHistory = realStats.history.length > 0;
  const totalCompletedCount = completedLevelIds.length;
  const trendData = useMemo(() => buildWeeklyTrend(realStats.history), [realStats.history]);
  const rhythmText = getRhythmConclusion(streakDays, hasPracticeHistory);

  let crystalState: 'fog' | 'spark' | 'crystal' | 'silence' | 'energy' | 'clarity' = 'fog';
  if (totalCompletedCount >= 21) crystalState = 'clarity';
  else if (totalCompletedCount >= 16) crystalState = 'energy';
  else if (totalCompletedCount >= 11) crystalState = 'silence';
  else if (totalCompletedCount >= 6) crystalState = 'crystal';
  else if (totalCompletedCount >= 1) crystalState = 'spark';
  const crystalScheme = CRYSTAL_COLOR_SCHEMES[crystalState];

  const crystalTitles: Record<typeof crystalState, string> = {
    fog: 'Начало практики',
    spark: 'Первые грани',
    crystal: 'Ритм закрепляется',
    silence: 'Глубина растёт',
    energy: 'Стабильная энергия',
    clarity: 'Путь завершён',
  };

  const handleCompleteMeditation = () => {
    if (!activeMeditation) return;
    const levelId = `${activeMeditation.chapterId}_${activeMeditation.levelIndex}`;
    if (!completedLevelIds.includes(levelId)) {
      const updated = [...completedLevelIds, levelId];
      setCompletedLevelIds(updated);
      localStorage.setItem('ritual_completed_path_levels', JSON.stringify(updated));
      onAddMinutes?.(5);
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
    <div className="w-full select-none pb-24 text-[#F2EFE8]">

      {/* Editorial conclusion + streak hero */}
      <section className="pt-2 pb-8 flex flex-col gap-6">
        <p className="font-display text-[28px] font-light leading-[1.12] text-[#F2EFE8]/92 text-balance">
          {rhythmText}
        </p>
        <div className="flex items-end gap-3">
          <span className="font-display text-[88px] font-light leading-none tabular-nums" style={{ color: crystalScheme.color }}>
            {streakDays}
          </span>
          <div className="pb-3">
            <span className="text-[15px] text-[#F2EFE8]/70 block">дней подряд</span>
            <span className="text-[13px] text-[#F2EFE8]/42">серия практик</span>
          </div>
        </div>
      </section>

      {/* 4-week trend */}
      <section className="py-8 border-t border-[rgba(242,239,232,0.12)]">
        <SectionMeta>Ритм за 4 недели</SectionMeta>
        <div className="mt-5">
          <WeeklyTrendChart data={trendData} accent={crystalScheme.color} />
        </div>
      </section>

      {/* Summary stats — hairline row */}
      <section className="py-8 border-t border-[rgba(242,239,232,0.12)]">
        <SectionMeta>Сводка</SectionMeta>
        <div className="mt-5 grid grid-cols-3 divide-x divide-[rgba(242,239,232,0.12)]">
          <div className="pr-4">
            <span className="text-[13px] text-[#F2EFE8]/42 block">Время</span>
            <span className="font-display text-4xl font-light tabular-nums mt-2 block">{totalMinutesLabel}</span>
            <span className="text-[13px] text-[#F2EFE8]/42">мин</span>
          </div>
          <div className="px-4">
            <span className="text-[13px] text-[#F2EFE8]/42 block">Сессии</span>
            <span className="font-display text-4xl font-light tabular-nums mt-2 block">{completedCount}</span>
            <span className="text-[13px] text-[#F2EFE8]/42">раз</span>
          </div>
          <div className="pl-4">
            <span className="text-[13px] text-[#F2EFE8]/42 block">Путь</span>
            <span className="font-display text-4xl font-light tabular-nums mt-2 block">{totalCompletedCount}</span>
            <span className="text-[13px] text-[#F2EFE8]/42">из 21</span>
          </div>
        </div>
      </section>

      {/* Crystal hero */}
      <section className="relative py-10 border-t border-[rgba(242,239,232,0.12)] flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => setShowCrystalInfo(true)}
          aria-label="О кристалле"
          className="absolute top-5 right-0 w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#F2EFE8]/42 active:scale-[0.97] transition-transform duration-[160ms]"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <PracticeCrystal
            facets={Math.min(64, 8 + totalCompletedCount * 2)}
            color={crystalScheme.color}
            fogPercent={Math.max(0, 100 - (totalCompletedCount / 21) * 100)}
            glowIntensity={0.3 + (totalCompletedCount / 21) * 0.7}
            rotationSpeed={60}
            hasSparks={totalCompletedCount > 0}
            hasBeam={totalCompletedCount >= 6}
            isPulsing={totalCompletedCount > 0 && totalCompletedCount < 21}
          />
        </div>

        <span className="text-[13px] text-[#F2EFE8]/42 mt-6">Кристалл внимания</span>
        <h3 className="font-display text-[28px] font-light text-[#F2EFE8]/90 mt-2">{crystalTitles[crystalState]}</h3>

        <GlassSurface className="mt-8 w-full p-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[13px] text-[#F2EFE8]/42 block">Открыто граней</span>
            <span className="font-display text-2xl font-light tabular-nums text-[#F2EFE8]/90">
              {Math.min(64, totalCompletedCount * 3)} <span className="text-[#F2EFE8]/42 text-lg">/ 64</span>
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#F2EFE8]/30" />
        </GlassSurface>
      </section>

      {/* Path nodes overview */}
      <section className="py-8 border-t border-[rgba(242,239,232,0.12)]">
        <SectionMeta>Путь внимания</SectionMeta>
        <div className="mt-5">
          <PathNodes completedLevelIds={completedLevelIds} />
        </div>
      </section>

      <ProgressJournal stats={realStats} />

      {/* Chapter drill-down */}
      <section className="py-8 border-t border-[rgba(242,239,232,0.12)]">
        <SectionMeta>Уровни</SectionMeta>
        {CHAPTER_ORDER.map((chapId) => {
          const chap = chaptersData[chapId];
          const isExpanded = activeChapter === chapId;
          const completedInChap = chap.levels.filter((_, idx) =>
            completedLevelIds.includes(`${chapId}_${idx}`)
          ).length;

          return (
            <div key={chapId} className="border-b border-[rgba(242,239,232,0.12)]">
              <button
                type="button"
                onClick={() => setActiveChapter(isExpanded ? null : chapId)}
                className="w-full py-5 flex items-center justify-between text-left"
              >
                <div className="flex gap-3 items-center min-w-0">
                  <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: chap.color }} />
                  <div className="min-w-0">
                    <h4 className="text-[15px] font-medium text-[#F2EFE8]/90">{chap.title}</h4>
                    <span className="text-[13px] text-[#F2EFE8]/42">
                      {completedInChap} из {chap.levels.length}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#F2EFE8]/30 transition-transform duration-[160ms] ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-4"
                  >
                    <p className="text-[13px] text-[#F2EFE8]/42 mb-4 leading-relaxed">{CHAPTER_DESCRIPTIONS[chapId]}</p>
                    {chap.levels.map((level, idx) => {
                      const levelId = `${chapId}_${idx}`;
                      const isCompleted = completedLevelIds.includes(levelId);
                      const isUnlocked = isLevelUnlocked(chapId, idx);

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => setActiveMeditation({ chapterId: chapId, levelIndex: idx })}
                          className={`w-full py-3 border-b border-[rgba(242,239,232,0.08)] text-left flex items-center justify-between ${
                            !isUnlocked ? 'opacity-30 cursor-not-allowed' : 'active:opacity-80'
                          }`}
                        >
                          <div className="flex gap-3 items-center min-w-0">
                            <span className="text-[13px] text-[#F2EFE8]/42 tabular-nums w-6">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[15px] text-[#F2EFE8]/80 truncate">{level.title}</span>
                          </div>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-[#F2EFE8]/35 flex-none" />
                          ) : isUnlocked ? (
                            <Compass className="w-4 h-4 text-[#F2EFE8]/50 flex-none" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[#F2EFE8]/20 flex-none" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>

      <AnimatePresence>
        {showCrystalInfo && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => setShowCrystalInfo(false)} aria-hidden="true" />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-sm w-full"
            >
              <GlassSurface className="p-6">
                <h3 className="text-[15px] font-medium text-[#F2EFE8]/90 mb-3">Стадии кристалла</h3>
                <ul className="text-[13px] text-[#F2EFE8]/60 flex flex-col gap-2 mb-5 leading-relaxed">
                  <li><span className="text-[#F2EFE8]/85">Туман</span> — до первого шага</li>
                  <li><span className="text-[#F2EFE8]/85">Искра</span> — после первого уровня</li>
                  <li><span className="text-[#F2EFE8]/85">Исток</span> — глава 1 завершена</li>
                  <li><span className="text-[#F2EFE8]/85">Тишина</span> — глава 2</li>
                  <li><span className="text-[#F2EFE8]/85">Энергия</span> — глава 3</li>
                  <li><span className="text-[#F2EFE8]/85">Ясность</span> — весь путь</li>
                </ul>
                <button
                  type="button"
                  onClick={() => setShowCrystalInfo(false)}
                  className="w-full h-11 rounded-[18px] bg-[#F2EFE8] text-[#08090A] text-[15px] font-medium active:scale-[0.97] transition-transform duration-[160ms]"
                >
                  Понятно
                </button>
              </GlassSurface>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
