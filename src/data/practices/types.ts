export interface CrystalState {
  fogPercent: number;
  facets: number;
  color: string;
  glowIntensity: number;
  rotationSpeed: number;
}

export interface InteractionConfig {
  type: 'taps' | 'pinch' | 'hold' | 'swipe' | 'tap_dissolve' | 'tap_choice';
  count?: number;
  targets?: number;
  choices?: { label: string; color: string }[];
  instruction: string;
  duration?: number;
}

export interface PracticeStep {
  id: string;
  type: 'narration' | 'pause' | 'interactive' | 'breathing' | 'microcheck' | 'insight' | 'closing' | 'final_chord' | 'crystal_reveal';
  startTime: number;
  duration?: number;
  text?: string;
  subtitle?: string;
  musicVolume?: number;
  crystalState?: Partial<CrystalState>;
  interaction?: InteractionConfig;
  breathPattern?: { inhale?: number; hold?: number; exhale?: number; holdEmpty?: number };
  screenState?: {
    fogPercent?: number;
    showSpark?: boolean;
    showWater?: boolean;
    waterClarity?: number;
    showSunset?: boolean;
    showFire?: boolean;
    showBeam?: boolean;
  };
}

export interface PracticeScript {
  id: string;
  chapterId: 'istok' | 'tishina' | 'energiya' | 'yasnost';
  levelIndex: number;
  title: string;
  subtitle: string;
  totalDuration: number;
  steps: PracticeStep[];
  gamification: {
    crystalState: CrystalState;
    pathProgress: string;
    message: string;
    chapterComplete?: boolean;
  };
}

export interface ChapterConfig {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  accentColor: string;
  levels: PracticeScript[];
}

export type PracticeToolType = 'breathing' | 'movement' | 'focus' | 'input' | 'ambient';

export interface StandalonePractice {
  id: string;
  groupId: 'istok' | 'tishina' | 'energiya' | 'yasnost';
  title: string;
  subtitle: string;
  duration: number;
  shortDuration?: number;
  description: string;
  steps: PracticeStep[];
  shortSteps?: PracticeStep[];
  scientificBasis: string;
  practiceType?: PracticeToolType;
  variant?: string;
  ringMarker?: {
    trigger: string;
    category: string;
    expectedOutcome: string;
  };
}
