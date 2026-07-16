export interface Practice {
  id: string;
  title: string;
  mood: string;
  iconName: string;
  duration: string;
  durationSec: number;
  color: string;
  accentClass: string;
  bgGlowClass: string;
  description: string;
  breathingPattern: {
    inhale: number;
    hold: number;
    exhale: number;
    holdEmpty: number;
  };
  completed: boolean;
  rituals?: string[];
}

export interface UserStats {
  shineScore: number;
  completedCount: number;
  streakDays: number;
  totalMinutes: number;
  history: {
    date: string;
    practiceId: string;
    practiceTitle: string;
    minutes: number;
  }[];
}

export type ActiveTab = 'today' | 'practices' | 'progress' | 'profile';
