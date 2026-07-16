import { PracticeScript, StandalonePractice } from './types';
import { istokLevels } from './istok';
import { tishinaLevels } from './tishina';
import { energiyaLevels } from './energiya';
import { yasnostLevels } from './yasnost';
import { standaloneIstok } from './standalone-istok';
import { standaloneTishina } from './standalone-tishina';
import { standaloneEnergiya } from './standalone-energiya';
import { standaloneYasnost } from './standalone-yasnost';

export type { PracticeScript, PracticeStep, CrystalState, InteractionConfig, StandalonePractice } from './types';

// ─── Путь внимания (21 уровень, 4 главы) ───

export const chaptersData = {
  istok: {
    id: 'istok',
    title: 'Исток',
    subtitle: 'Возвращение к себе',
    color: '#E6B85C',
    levels: istokLevels,
  },
  tishina: {
    id: 'tishina',
    title: 'Тишина',
    subtitle: 'Глубокий покой',
    color: '#7A9BBA',
    levels: tishinaLevels,
  },
  energiya: {
    id: 'energiya',
    title: 'Энергия',
    subtitle: 'Внутренний огонь',
    color: '#E67E22',
    levels: energiyaLevels,
  },
  yasnost: {
    id: 'yasnost',
    title: 'Ясность',
    subtitle: 'Зеркальная призма',
    color: '#A8D5E5',
    levels: yasnostLevels,
  },
} as const;

export type ChapterId = keyof typeof chaptersData;

// ─── Стandalone практики (35 практик, 4 группы) ───

export const standaloneData = {
  istok: standaloneIstok,
  tishina: standaloneTishina,
  energiya: standaloneEnergiya,
  yasnost: standaloneYasnost,
} as const;

export const STANDALONE_GROUP_COLORS: Record<ChapterId, string> = {
  istok: '#E6B85C',
  tishina: '#7A9BBA',
  energiya: '#E67E22',
  yasnost: '#A8D5E5',
};

export const STANDALONE_GROUP_TITLES: Record<ChapterId, string> = {
  istok: 'Исток',
  tishina: 'Тишина',
  energiya: 'Энергия',
  yasnost: 'Ясность',
};

// ─── Хелперы ───

export function getPracticeScript(chapterId: ChapterId, levelIndex: number): PracticeScript | null {
  const chapter = chaptersData[chapterId];
  if (!chapter) return null;
  return chapter.levels[levelIndex] || null;
}

export function getAllLevels(): PracticeScript[] {
  return [
    ...istokLevels,
    ...tishinaLevels,
    ...energiyaLevels,
    ...yasnostLevels,
  ];
}

export function getAllStandalone(): StandalonePractice[] {
  return [
    ...standaloneIstok,
    ...standaloneTishina,
    ...standaloneEnergiya,
    ...standaloneYasnost,
  ];
}

export function getStandaloneByGroup(groupId: ChapterId): StandalonePractice[] {
  return standaloneData[groupId] || [];
}

export function getStandalonePractice(id: string): StandalonePractice | null {
  return getAllStandalone().find(p => p.id === id) || null;
}

export function getChapterColor(chapterId: ChapterId): string {
  return chaptersData[chapterId]?.color || '#E6B85C';
}
