import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, Play, HelpCircle, Volume2, VolumeX, Share2, Check } from 'lucide-react';
import { Practice } from '../types';
import { StandalonePractice, PracticeStep, CrystalState } from '../data/practices/types';
import { STANDALONE_GROUP_COLORS } from '../data/practices';
import PracticeCrystal from './PracticeCrystal';
import PracticeInteractive from './PracticeInteractive';
import BreathingPlayer from './players/BreathingPlayer';
import FocusPlayer from './players/FocusPlayer';
import MovementPlayer from './players/MovementPlayer';
import AmbientPlayer from './players/AmbientPlayer';
import InputPlayer from './players/InputPlayer';
import CompletionScreen from './players/CompletionScreen';

interface PracticePlayerProps {
  practice: Practice;
  standalone?: StandalonePractice;
  onClose: () => void;
  onComplete: (elapsedSeconds?: number) => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'holdEmpty';

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Вдох',
  hold: 'Задержка',
  exhale: 'Выдох',
  holdEmpty: 'Пауза',
};

const PHASE_SUBTITLES: Record<BreathPhase, string> = {
  inhale: 'Наполните легкие воздухом',
  hold: 'Удерживайте покой внутри',
  exhale: 'Освободите все напряжение',
  holdEmpty: 'Ощутите абсолютную тишину',
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getDailySteps(practiceId: string): PracticeStep[] {
  switch (practiceId) {
    case 'start-day':
      return [
        {
          id: 'sd-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 8,
          text: 'С добрым утром.\nНачнем день с пробуждения разума и тела.',
          subtitle: 'сфокусируйся на дыхании',
          crystalState: { fogPercent: 70, facets: 6, glowIntensity: 0.3, rotationSpeed: 10 }
        },
        {
          id: 'sd-breath-1',
          type: 'breathing',
          startTime: 8,
          duration: 40,
          text: 'Начнем с мягкого согревающего дыхания.\nВдыхаем золотой утренний свет.',
          breathPattern: { inhale: 4, hold: 2, exhale: 4, holdEmpty: 0 },
          crystalState: { fogPercent: 40, facets: 8, glowIntensity: 0.6, rotationSpeed: 18 }
        },
        {
          id: 'sd-insight-1',
          type: 'insight',
          startTime: 48,
          duration: 10,
          text: 'Утреннее ритмичное дыхание активирует симпатическую нервную систему, сигнализируя телу, что пора просыпаться.',
          subtitle: 'Научный факт'
        },
        {
          id: 'sd-inter-1',
          type: 'interactive',
          startTime: 58,
          duration: 15,
          text: 'Настрой намерение на день.',
          interaction: {
            type: 'taps',
            targets: 5,
            instruction: 'Сделай 5 осознанных касаний центрального кристалла, закрепляя чувство бодрости и уверенности.'
          },
          crystalState: { fogPercent: 10, facets: 12, glowIntensity: 0.9, rotationSpeed: 30 },
          screenState: { showBeam: true }
        },
        {
          id: 'sd-breath-2',
          type: 'breathing',
          startTime: 73,
          duration: 40,
          text: 'С каждым вдохом наполняйся чистой энергией.',
          breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 0 },
          crystalState: { fogPercent: 0, facets: 16, glowIntensity: 1.0, rotationSpeed: 40 },
          screenState: { showBeam: true, showSpark: true }
        },
        {
          id: 'sd-microcheck-1',
          type: 'microcheck',
          startTime: 113,
          duration: 8,
          text: 'Как твой уровень энергии сейчас?'
        },
        {
          id: 'sd-closing-1',
          type: 'closing',
          startTime: 121,
          duration: 9,
          text: 'Твой день запущен с ясным намерением.\nТы готов ко всему.'
        },
        {
          id: 'sd-final',
          type: 'final_chord',
          startTime: 130,
          duration: 5,
          text: 'Удачного и продуктивного дня!'
        }
      ];
    case 'calm-down':
      return [
        {
          id: 'cd-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 10,
          text: 'Сделай глубокий вдох.\nТы в безопасности. Шум внешнего мира начинает утихать.',
          subtitle: 'найди опору',
          crystalState: { fogPercent: 90, facets: 4, glowIntensity: 0.2, rotationSpeed: 5 }
        },
        {
          id: 'cd-inter-1',
          type: 'interactive',
          startTime: 10,
          duration: 20,
          text: 'Давай замедлим сенсорный поток.',
          interaction: {
            type: 'hold',
            duration: 5,
            instruction: 'Прижми палец к экрану и удерживай его. Представь, как утихает любая тревога.'
          },
          crystalState: { fogPercent: 50, facets: 6, glowIntensity: 0.4, rotationSpeed: 8 },
          screenState: { showWater: true }
        },
        {
          id: 'cd-breath-1',
          type: 'breathing',
          startTime: 30,
          duration: 50,
          text: 'А теперь дыши по квадрату:\nВдох — Задержка — Выдох — Задержка.',
          breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
          crystalState: { fogPercent: 30, facets: 8, glowIntensity: 0.6, rotationSpeed: 12 },
          screenState: { showWater: true }
        },
        {
          id: 'cd-insight-1',
          type: 'insight',
          startTime: 80,
          duration: 12,
          text: 'Квадратное дыхание (Box Breathing) используется для мгновенной регуляции вегетативной нервной системы и снижения выработки адреналина.',
          subtitle: 'Доказанный метод'
        },
        {
          id: 'cd-breath-2',
          type: 'breathing',
          startTime: 92,
          duration: 50,
          text: 'Продолжай дышать по квадрату. Плыви по волнам спокойствия.',
          breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
          crystalState: { fogPercent: 10, facets: 10, glowIntensity: 0.7, rotationSpeed: 15 },
          screenState: { showWater: true }
        },
        {
          id: 'cd-microcheck-1',
          type: 'microcheck',
          startTime: 142,
          duration: 10,
          text: 'Чувствуешь ли ты, что тревога отступает?'
        },
        {
          id: 'cd-closing-1',
          type: 'closing',
          startTime: 152,
          duration: 12,
          text: 'Отлично. Твой пульс выравнивается. Ты восстановил контроль над своим телом.'
        },
        {
          id: 'cd-final',
          type: 'final_chord',
          startTime: 164,
          duration: 6,
          text: 'Покой внутри тебя. Возвращайся к этому состоянию в любой момент.'
        }
      ];
    case 'pause':
      return [
        {
          id: 'ps-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 8,
          text: 'Время сделать паузу.\nОстанови суету. Дай своей нервной системе перезапуститься.',
          subtitle: 'просто побудь здесь',
          crystalState: { fogPercent: 50, facets: 6, glowIntensity: 0.4, rotationSpeed: 12 }
        },
        {
          id: 'ps-inter-1',
          type: 'interactive',
          startTime: 8,
          duration: 15,
          text: 'Высвободи физическое напряжение.',
          interaction: {
            type: 'swipe',
            instruction: 'Смахни пальцем в любую сторону, чтобы сбросить накопленный стресс и напряжение.'
          },
          crystalState: { fogPercent: 30, facets: 8, glowIntensity: 0.5, rotationSpeed: 15 }
        },
        {
          id: 'ps-breath-1',
          type: 'breathing',
          startTime: 23,
          duration: 40,
          text: 'Сделай 3 глубоких, центрирующих вдоха и выдоха.',
          breathPattern: { inhale: 4, hold: 2, exhale: 4, holdEmpty: 2 },
          crystalState: { fogPercent: 10, facets: 10, glowIntensity: 0.7, rotationSpeed: 20 }
        },
        {
          id: 'ps-insight-1',
          type: 'insight',
          startTime: 63,
          duration: 10,
          text: 'Даже короткая 3-минутная пауза прерывает цикл непрерывной когнитивной нагрузки и восстанавливает умственную гибкость.',
          subtitle: 'Когнитивная наука'
        },
        {
          id: 'ps-microcheck-1',
          type: 'microcheck',
          startTime: 73,
          duration: 8,
          text: 'Удалось ли сделать полноценный перезапуск?'
        },
        {
          id: 'ps-closing-1',
          type: 'closing',
          startTime: 81,
          duration: 9,
          text: 'Пауза завершена. Ты вернул себе баланс и фокус.'
        },
        {
          id: 'ps-final',
          type: 'final_chord',
          startTime: 90,
          duration: 5,
          text: 'Двигайся дальше с легкостью.'
        }
      ];
    case 'focus':
      return [
        {
          id: 'fc-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 8,
          text: 'Входим в состояние потока.\nСузь поле своего внимания до одной точки.',
          subtitle: 'абсолютная концентрация',
          crystalState: { fogPercent: 40, facets: 8, glowIntensity: 0.5, rotationSpeed: 20 }
        },
        {
          id: 'fc-inter-1',
          type: 'interactive',
          startTime: 8,
          duration: 15,
          text: 'Синхронизируй взгляд и фокус.',
          interaction: {
            type: 'taps',
            targets: 7,
            instruction: 'Касайся центрального кристалла в такт пульсации, чтобы сфокусировать разум.'
          },
          crystalState: { fogPercent: 20, facets: 12, glowIntensity: 0.8, rotationSpeed: 30 }
        },
        {
          id: 'fc-breath-1',
          type: 'breathing',
          startTime: 23,
          duration: 50,
          text: 'Когерентное дыхание:\nГлубокий вдох — Плавный выдох.',
          breathPattern: { inhale: 5, hold: 0, exhale: 5, holdEmpty: 0 },
          crystalState: { fogPercent: 5, facets: 16, glowIntensity: 0.9, rotationSpeed: 35 },
          screenState: { showBeam: true }
        },
        {
          id: 'fc-insight-1',
          type: 'insight',
          startTime: 73,
          duration: 12,
          text: 'Ритм 5/5 секунд (когерентное дыхание) выравнивает вариабельность сердечного ритма, приводя мозг в состояние высокой продуктивности и ясного внимания.',
          subtitle: 'Нейробиология'
        },
        {
          id: 'fc-breath-2',
          type: 'breathing',
          startTime: 85,
          duration: 45,
          text: 'Дыши ровно. Ощущай, как отсекается все лишнее.',
          breathPattern: { inhale: 5, hold: 0, exhale: 5, holdEmpty: 0 },
          crystalState: { fogPercent: 0, facets: 24, glowIntensity: 1.0, rotationSpeed: 45 },
          screenState: { showBeam: true }
        },
        {
          id: 'fc-microcheck-1',
          type: 'microcheck',
          startTime: 130,
          duration: 8,
          text: 'Почувствовал ли ты прилив концентрации?'
        },
        {
          id: 'fc-closing-1',
          type: 'closing',
          startTime: 138,
          duration: 9,
          text: 'Внимание собрано в лазерный луч.\nТвой разум готов к сложным задачам.'
        },
        {
          id: 'fc-final',
          type: 'final_chord',
          startTime: 147,
          duration: 5,
          text: 'Вперед, твори великие дела.'
        }
      ];
    case 'restore':
      return [
        {
          id: 'rt-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 8,
          text: 'Запускаем глубокое восстановление.\nВпусти максимум кислорода, разгрузи тело и разум.',
          subtitle: 'регенерация сил',
          crystalState: { fogPercent: 60, facets: 6, glowIntensity: 0.3, rotationSpeed: 10 }
        },
        {
          id: 'rt-inter-1',
          type: 'interactive',
          startTime: 8,
          duration: 15,
          text: 'Активируем целебный огонь.',
          interaction: {
            type: 'pinch',
            instruction: 'Сведи или разведи пальцы на кристалле, чтобы расширить легкие и запустить циркуляцию сил.'
          },
          crystalState: { fogPercent: 30, facets: 10, glowIntensity: 0.6, rotationSpeed: 15 },
          screenState: { showFire: true }
        },
        {
          id: 'rt-breath-1',
          type: 'breathing',
          startTime: 23,
          duration: 50,
          text: 'Дыхание восстановления:\nВдох на 4 счета — Задержка на 7 счетов — Выдох на 8.',
          breathPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
          crystalState: { fogPercent: 15, facets: 12, glowIntensity: 0.8, rotationSpeed: 20 },
          screenState: { showFire: true }
        },
        {
          id: 'rt-insight-1',
          type: 'insight',
          startTime: 73,
          duration: 12,
          text: 'Удлиненный выдох (вдвое длиннее вдоха) мощно активирует блуждающий нерв, замедляя пульс и способствуя мгновенному клеточному восстановлению.',
          subtitle: 'Физиология'
        },
        {
          id: 'rt-breath-2',
          type: 'breathing',
          startTime: 85,
          duration: 45,
          text: 'Продолжай восстанавливающее дыхание 4-7-8.',
          breathPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
          crystalState: { fogPercent: 5, facets: 14, glowIntensity: 0.9, rotationSpeed: 25 },
          screenState: { showFire: true }
        },
        {
          id: 'rt-microcheck-1',
          type: 'microcheck',
          startTime: 130,
          duration: 8,
          text: 'Чувствуешь ли ты облегчение в мышцах и теле?'
        },
        {
          id: 'rt-closing-1',
          type: 'closing',
          startTime: 138,
          duration: 9,
          text: 'Резервуар энергии наполнен.\nСилы вернулись в каждую клетку.'
        },
        {
          id: 'rt-final',
          type: 'final_chord',
          startTime: 147,
          duration: 5,
          text: 'Твое тело полностью обновлено.'
        }
      ];
    case 'end-day':
      return [
        {
          id: 'ed-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 10,
          text: 'День завершен. Пришло время отпустить все дела и заботы.\nТвой разум готов к глубокому исцеляющему сну.',
          subtitle: 'время для покоя',
          crystalState: { fogPercent: 80, facets: 6, glowIntensity: 0.2, rotationSpeed: 6 }
        },
        {
          id: 'ed-inter-1',
          type: 'interactive',
          startTime: 10,
          duration: 20,
          text: 'Собери звезды благодарности.',
          interaction: {
            type: 'tap_dissolve',
            targets: 3,
            instruction: 'Прикоснись к звездам на экране, вспомнив три приятных события сегодняшнего дня.'
          },
          crystalState: { fogPercent: 50, facets: 8, glowIntensity: 0.4, rotationSpeed: 10 },
          screenState: { showSunset: true }
        },
        {
          id: 'ed-breath-1',
          type: 'breathing',
          startTime: 30,
          duration: 60,
          text: 'Расслабляющее дыхание "4-7-8":\nМягкий вдох — Задержка — Глубокий освобождающий выдох.',
          breathPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
          crystalState: { fogPercent: 20, facets: 10, glowIntensity: 0.6, rotationSpeed: 12 },
          screenState: { showSunset: true }
        },
        {
          id: 'ed-insight-1',
          type: 'insight',
          startTime: 90,
          duration: 12,
          text: 'Метод 4-7-8 действует как естественный транквилизатор для нервной системы. Он снижает уровень стрессового гормона кортизола и подготавливает мозг к фазе глубокого сна.',
          subtitle: 'Наука о сне'
        },
        {
          id: 'ed-breath-2',
          type: 'breathing',
          startTime: 102,
          duration: 60,
          text: 'С каждым выдохом погружайся все глубже в покой.',
          breathPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
          crystalState: { fogPercent: 10, facets: 12, glowIntensity: 0.7, rotationSpeed: 8 },
          screenState: { showSunset: true }
        },
        {
          id: 'ed-microcheck-1',
          type: 'microcheck',
          startTime: 162,
          duration: 10,
          text: 'Появилось ли ощущение приятной сонливости?'
        },
        {
          id: 'ed-closing-1',
          type: 'closing',
          startTime: 172,
          duration: 12,
          text: 'Твое тело расслаблено, веки тяжелеют. Ты полностью готов ко сну.'
        },
        {
          id: 'ed-final',
          type: 'final_chord',
          startTime: 184,
          duration: 6,
          text: 'Сладких снов. Спи спокойно.'
        }
      ];
    case 'important-moment':
      return [
        {
          id: 'im-narr-1',
          type: 'narration',
          startTime: 0,
          duration: 10,
          text: 'Впереди важный момент. Волнение — это просто нереализованная энергия.\nДавай направим её в нужное русло.',
          subtitle: 'обрети уверенность',
          crystalState: { fogPercent: 70, facets: 6, glowIntensity: 0.3, rotationSpeed: 10 }
        },
        {
          id: 'im-inter-1',
          type: 'interactive',
          startTime: 10,
          duration: 20,
          text: 'Заземли свое тело.',
          interaction: {
            type: 'hold',
            duration: 5,
            instruction: 'Зажми и удерживай кристалл силы. Почувствуй твердую почву под ногами и абсолютную устойчивость.'
          },
          crystalState: { fogPercent: 40, facets: 8, glowIntensity: 0.6, rotationSpeed: 15 },
          screenState: { showBeam: true }
        },
        {
          id: 'im-breath-1',
          type: 'breathing',
          startTime: 30,
          duration: 50,
          text: 'Тактическое дыхание воинов:\nРавные отрезки вдоха, задержки, выдоха и задержки.',
          breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
          crystalState: { fogPercent: 20, facets: 12, glowIntensity: 0.8, rotationSpeed: 25 },
          screenState: { showBeam: true }
        },
        {
          id: 'im-insight-1',
          type: 'insight',
          startTime: 80,
          duration: 12,
          text: 'Тактическое квадратное дыхание используется спецслужбами и хирургами перед экстремальными операциями для блокировки паники и сохранения идеальной точности движений.',
          subtitle: 'Стресс-менеджмент'
        },
        {
          id: 'im-breath-2',
          type: 'breathing',
          startTime: 92,
          duration: 40,
          text: 'Продолжай тактическое дыхание. Ты полностью контролируешь ситуацию.',
          breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
          crystalState: { fogPercent: 0, facets: 16, glowIntensity: 1.0, rotationSpeed: 30 },
          screenState: { showBeam: true, showSpark: true }
        },
        {
          id: 'im-microcheck-1',
          type: 'microcheck',
          startTime: 132,
          duration: 10,
          text: 'Удалось ли почувствовать внутреннюю силу?'
        },
        {
          id: 'im-closing-1',
          type: 'closing',
          startTime: 142,
          duration: 12,
          text: 'Твой взгляд ясен. Твое тело собрано. Разум спокоен.\nИди и сделай это.'
        },
        {
          id: 'im-final',
          type: 'final_chord',
          startTime: 154,
          duration: 6,
          text: 'Ты готов. У тебя все получится!'
        }
      ];
    default:
      return [];
  }
}

interface StepBreathingState {
  phase: 'inhale' | 'hold' | 'exhale' | 'holdEmpty';
  secondsLeft: number;
  phaseDuration: number;
  cycleIndex: number;
}

function getStepBreathingState(
  elapsedInStep: number,
  pattern: { inhale: number; hold: number; exhale: number; holdEmpty: number }
): StepBreathingState {
  const { inhale, hold = 0, exhale, holdEmpty = 0 } = pattern;
  const cycleDuration = inhale + hold + exhale + holdEmpty;
  if (cycleDuration <= 0) {
    return { phase: 'inhale', secondsLeft: 4, phaseDuration: 4, cycleIndex: 0 };
  }
  const cycleIndex = Math.floor(elapsedInStep / cycleDuration);
  const timeInCycle = elapsedInStep % cycleDuration;

  if (timeInCycle < inhale) {
    return {
      phase: 'inhale',
      secondsLeft: inhale - timeInCycle,
      phaseDuration: inhale,
      cycleIndex,
    };
  } else if (timeInCycle < inhale + hold) {
    return {
      phase: 'hold',
      secondsLeft: inhale + hold - timeInCycle,
      phaseDuration: hold,
      cycleIndex,
    };
  } else if (timeInCycle < inhale + hold + exhale) {
    return {
      phase: 'exhale',
      secondsLeft: inhale + hold + exhale - timeInCycle,
      phaseDuration: exhale,
      cycleIndex,
    };
  } else {
    return {
      phase: 'holdEmpty',
      secondsLeft: cycleDuration - timeInCycle,
      phaseDuration: holdEmpty,
      cycleIndex,
    };
  }
}

const STEP_PHASE_LABELS = {
  inhale: 'Вдох носом',
  hold: 'Задержка дыхания',
  exhale: 'Выдох ртом',
  holdEmpty: 'Задержка на выдохе',
};

const STEP_PHASE_INSTRUCTIONS = {
  inhale: 'Наполняйте легкие прохладным чистым воздухом',
  hold: 'Удерживайте покой и глубокую тишину внутри себя',
  exhale: 'Отпускайте все напряжение и мысли с выдохом',
  holdEmpty: 'Побудьте в абсолютной пустоте и ясности ума',
};

export default function PracticePlayer({
  practice,
  standalone,
  onClose,
  onComplete,
}: PracticePlayerProps) {
  const color = standalone
    ? STANDALONE_GROUP_COLORS[standalone.groupId]
    : practice.color;

  // For standalone or daily practices with steps
  const isDailyPractice = ['start-day', 'calm-down', 'pause', 'focus', 'restore', 'end-day', 'important-moment'].includes(practice.id);
  const dailySteps = isDailyPractice ? getDailySteps(practice.id) : null;
  const steps = standalone ? standalone.steps : (dailySteps || []);
  const hasSteps = steps.length > 0;

  const totalDuration = hasSteps
    ? (steps[steps.length - 1].startTime + (steps[steps.length - 1].duration || 0))
    : (practice.durationSec || 60);

  // Timer state
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Breathing state
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(
    practice.breathingPattern?.inhale || 4
  );
  const [breathCount, setBreathCount] = useState(0);

  // Microcheck
  const [microcheckResponse, setMicrocheckResponse] = useState<boolean | null>(null);

  // Sub-player state
  const [showSubPlayer, setShowSubPlayer] = useState(true);
  const [beforeHeartRate, setBeforeHeartRate] = useState<number | null>(null);
  const [afterHeartRate, setAfterHeartRate] = useState<number | null>(null);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completionReportedRef = useRef(false);

  // ─── Load initial heart rate ───
  useEffect(() => {
    import('../services/health/manager').then(({ fetchHealthData }) => {
      fetchHealthData().then((result: any) => {
        const hr = result?.metrics?.heartRate;
        if (hr && hr > 0) setBeforeHeartRate(Math.round(hr));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // ─── Main timer ───
  useEffect(() => {
    if (!isPlaying || isComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalDuration) {
          setIsComplete(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isComplete, totalDuration]);

  // ─── Breathing phase controller (simple practices) ───
  useEffect(() => {
    if (!practice.breathingPattern || !isPlaying || isComplete) {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
      return;
    }

    const bp = practice.breathingPattern;
    const phases: { phase: BreathPhase; duration: number }[] = [
      { phase: 'inhale', duration: bp.inhale },
      ...(bp.hold > 0 ? [{ phase: 'hold' as BreathPhase, duration: bp.hold }] : []),
      { phase: 'exhale', duration: bp.exhale },
      ...(bp.holdEmpty > 0 ? [{ phase: 'holdEmpty' as BreathPhase, duration: bp.holdEmpty }] : []),
    ];

    let phaseIdx = 0;
    let count = 0;

    const tick = () => {
      setPhaseTimeLeft((prev) => {
        if (prev <= 1) {
          phaseIdx = (phaseIdx + 1) % phases.length;
          setPhase(phases[phaseIdx].phase);
          if (phaseIdx === 0) {
            count++;
            setBreathCount(count);
          }
          return phases[phaseIdx].duration;
        }
        return prev - 1;
      });
    };

    setPhase(phases[0].phase);
    setPhaseTimeLeft(phases[0].duration);

    breathTimerRef.current = setInterval(tick, 1000);

    return () => {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, [practice.breathingPattern, isPlaying, isComplete]);

  // ─── Standalone step controller ───
  const activeStep = hasSteps
    ? steps.reduce<PracticeStep | null>((latest, step) => {
        if (elapsed >= step.startTime) return step;
        return latest;
      }, null)
    : null;

  const crystalState: CrystalState = {
    fogPercent: 0,
    facets: 8,
    color,
    glowIntensity: 0.5,
    rotationSpeed: 20,
    ...steps[0]?.crystalState,
    ...(activeStep?.crystalState ?? {}),
  };

  const elapsedInStep = activeStep ? elapsed - activeStep.startTime : 0;
  const breathState = activeStep?.type === 'breathing' && activeStep.breathPattern
    ? getStepBreathingState(elapsedInStep, {
        inhale: activeStep.breathPattern.inhale,
        hold: activeStep.breathPattern.hold || 0,
        exhale: activeStep.breathPattern.exhale,
        holdEmpty: activeStep.breathPattern.holdEmpty || 0
      })
    : null;

  const getStepBreathingScale = () => {
    if (!breathState || !activeStep?.breathPattern) return 1;
    const { phase: p, secondsLeft: sl, phaseDuration: pd } = breathState;
    const progress = (pd - sl) / pd;
    
    if (p === 'inhale') {
      return 1.0 + progress * 0.45; // 1.0 -> 1.45
    }
    if (p === 'hold') {
      return 1.45;
    }
    if (p === 'exhale') {
      return 1.45 - progress * 0.45; // 1.45 -> 1.0
    }
    return 1.0; // holdEmpty
  };

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleResume = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const reportCompletion = useCallback(() => {
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    onComplete(Math.max(1, elapsed));
  }, [elapsed, onComplete]);

  const handleComplete = useCallback(() => {
    // Capture after heart rate
    import('../services/health/manager').then(({ fetchHealthData }) => {
      fetchHealthData().then((result: any) => {
        const hr = result?.metrics?.heartRate;
        if (hr && hr > 0) setAfterHeartRate(Math.round(hr));
      }).catch(() => {});
    }).catch(() => {});
    setIsComplete(true);
    setTimeout(reportCompletion, 3000);
  }, [reportCompletion]);

  const handleMicrocheck = useCallback((response: boolean) => {
    setMicrocheckResponse(response);
    setTimeout(() => setMicrocheckResponse(null), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const text = `✨ Практика "${practice.title}" завершена в Ritual. ${breathCount > 0 ? `${breathCount} циклов дыхания.` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ritual', text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [practice.title, breathCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  const progress = Math.min((elapsed / totalDuration) * 100, 100);

  // Breathing sphere scale
  const getSphereScale = () => {
    if (!practice.breathingPattern) return 1;
    const bp = practice.breathingPattern;
    switch (phase) {
      case 'inhale': {
        const total = bp.inhale;
        const p = (total - phaseTimeLeft) / total;
        return 1.0 + p * 1.1;
      }
      case 'hold':
        return 2.1;
      case 'exhale': {
        const total = bp.exhale;
        const p = (total - phaseTimeLeft) / total;
        return 2.1 - p * 1.1;
      }
      case 'holdEmpty':
        return 1.0;
    }
  };

  const getGlowOpacity = () => {
    const bp = practice.breathingPattern;
    if (!bp) return 0.4;
    switch (phase) {
      case 'inhale':
        return 0.4 + 0.4 * ((bp.inhale - phaseTimeLeft) / bp.inhale);
      case 'hold':
        return 0.8;
      case 'exhale':
        return 0.8 - 0.4 * ((bp.exhale - phaseTimeLeft) / bp.exhale);
      case 'holdEmpty':
        return 0.3;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#050508] text-white flex flex-col select-none overflow-hidden"
    >
      {/* Immersive Cosmic Aurora / Nebula Backdrops */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: activeStep?.type === 'breathing' ? [1, 1.08, 1] : [1, 1.04, 1],
            opacity: activeStep?.type === 'breathing' ? [0.12, 0.2, 0.12] : [0.08, 0.13, 0.08],
          }}
          transition={{
            duration: activeStep?.type === 'breathing' 
              ? (activeStep.breathPattern?.inhale || 4) + (activeStep.breathPattern?.exhale || 4) + (activeStep.breathPattern?.hold || 0) + (activeStep.breathPattern?.holdEmpty || 0)
              : 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-[18%] left-[12%] right-[12%] aspect-square rounded-full blur-[72px]"
          style={{
            backgroundColor: color,
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
          }}
        />
        <motion.div
          animate={{
            x: [0, 18, -10, 0],
            y: [0, -14, 12, 0],
            scale: [0.96, 1.06, 0.98, 0.96],
            opacity: [0.04, 0.08, 0.05, 0.04],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px]"
          style={{
            backgroundColor: color,
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* ─── Top bar ─── */}
      {!isComplete && (
        <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2">
          <button
            onClick={() => setShowHelp(true)}
            className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all shadow-lg"
          >
            <HelpCircle className="w-4 h-4 text-white/45" strokeWidth={2} />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase font-semibold">
              {standalone?.subtitle || practice.mood}
            </span>
            <h3 className="text-sm font-medium text-white/85 mt-0.5 tracking-tight">
              {standalone?.title || practice.title}
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all shadow-lg"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/45" strokeWidth={2} />
              ) : (
                <Volume2 className="w-4 h-4 text-white/45" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Progress bar ─── */}
      {!standalone?.practiceType && !isComplete && (
        <div className="relative z-10 px-6 mt-3">
          <div className="h-[2px] w-full bg-white/[0.03] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 px-0.5">
            <span className="text-[10px] font-mono text-white/30 tracking-wider">
              {formatTime(elapsed)}
            </span>
            <span className="text-[10px] font-mono text-white/30 tracking-wider">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>
      )}

      {/* ─── Main content ─── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* Simple Breathing mode (no steps) */}
          {!hasSteps && practice.breathingPattern && !isComplete && (
            <motion.div
              key="simple-breathing-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center text-center max-w-sm w-full gap-8 relative"
            >
              {/* Concentric pulsing rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: getSphereScale() * (0.85 + i * 0.35),
                      opacity: phase === 'hold' || phase === 'holdEmpty' ? [0.03, 0.1, 0.03] : 0.08 / i,
                    }}
                    transition={{
                      duration: phase === 'hold' || phase === 'holdEmpty' ? 3 : 0.4,
                      repeat: phase === 'hold' || phase === 'holdEmpty' ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                    className="absolute rounded-full border border-white/5 pointer-events-none"
                    style={{
                      width: '180px',
                      height: '180px',
                      borderColor: `${color}${40 - i * 10}`,
                    }}
                  />
                ))}
              </div>

              {/* Central breathing orb */}
              <motion.div
                animate={{ scale: getSphereScale() }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-2xl border"
                style={{
                  borderColor: `${color}30`,
                  background: `radial-gradient(circle, ${color}88 0%, ${color}11 100%)`,
                  boxShadow: `0 0 60px 5px ${color}${Math.round(getGlowOpacity() * 150)
                    .toString(16)
                    .padStart(2, '0')}`,
                }}
              >
                <div className="absolute top-3 left-5 w-8 h-4 bg-white/10 rounded-full blur-[2px] opacity-40 rotate-[-15deg]" />

                <AnimatePresence mode="wait">
                  <motion.span
                    key={phaseTimeLeft}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.25 }}
                    className="text-4xl font-extralight font-mono text-white/95 tracking-tighter drop-shadow-md"
                  >
                    {phaseTimeLeft}
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              {/* Labels and subtexts */}
              <div className="space-y-3 z-10 w-full mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-1.5"
                  >
                    <span
                      className="text-xs font-semibold tracking-[0.25em] uppercase font-mono block"
                      style={{ color }}
                    >
                      {PHASE_LABELS[phase]}
                    </span>
                    <p className="text-sm font-light text-white/70 max-w-[280px] leading-relaxed mx-auto px-2">
                      {PHASE_SUBTITLES[phase]}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase pt-3">
                  Циклов дыхания: {breathCount}
                </p>
              </div>
            </motion.div>
          )}

          {/* Sub-player for standalone practices with practiceType */}
          {standalone?.practiceType && !isComplete && showSubPlayer && (
            <div key={`sub-player-${standalone.practiceType}`} className="w-full">
              {standalone.practiceType === 'breathing' && (
                <BreathingPlayer color={color} variant={standalone.variant} onFinish={handleComplete} onTick={setElapsed} />
              )}
              {standalone.practiceType === 'focus' && (
                <FocusPlayer color={color} variant={standalone.variant} onFinish={handleComplete} onTick={setElapsed} />
              )}
              {standalone.practiceType === 'movement' && (
                <MovementPlayer color={color} variant={standalone.variant} onFinish={handleComplete} onTick={setElapsed} />
              )}
              {standalone.practiceType === 'ambient' && (
                <AmbientPlayer color={color} variant={standalone.variant} practiceName={standalone.title} howItWorks={standalone.description} onFinish={handleComplete} onTick={setElapsed} />
              )}
              {standalone.practiceType === 'input' && (
                <InputPlayer color={color} variant={standalone.variant} practiceName={standalone.title} howItWorks={standalone.description} onFinish={handleComplete} />
              )}
            </div>
          )}

          {/* Structured step practices */}
          {hasSteps && activeStep && !isComplete && !standalone?.practiceType && (
            <div className="w-full max-w-sm flex flex-col items-center justify-center">
              {/* Narration Step */}
              {activeStep.type === 'narration' && activeStep.text && (
                <motion.div
                  key={`step-narration-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center w-full gap-8"
                >
                  {/* Floating Crystal */}
                  <div className="relative py-2">
                    <PracticeCrystal
                      facets={crystalState.facets}
                      color={crystalState.color}
                      fogPercent={crystalState.fogPercent}
                      glowIntensity={crystalState.glowIntensity * 0.8}
                      rotationSpeed={crystalState.rotationSpeed * 0.4}
                    />
                  </div>

                  <div className="space-y-4">
                    <p className="text-lg md:text-xl font-light text-white/90 leading-relaxed tracking-tight whitespace-pre-line px-2">
                      {activeStep.text}
                    </p>
                    {activeStep.subtitle && (
                      <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">
                        {activeStep.subtitle}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Breathing Step */}
              {activeStep.type === 'breathing' && activeStep.breathPattern && breathState && (
                <motion.div
                  key={`step-breathing-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center w-full gap-8 relative"
                >
                  {/* Central Breathing Crystal with concentric ripple waves */}
                  <div className="relative flex items-center justify-center h-48 w-48 mt-4">
                    {/* Concentric Aura Waves */}
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: getStepBreathingScale() * (0.95 + i * 0.32),
                          opacity: breathState.phase === 'hold' || breathState.phase === 'holdEmpty' 
                            ? [0.03, 0.1, 0.03] 
                            : 0.07 / i,
                        }}
                        transition={{
                          duration: breathState.phase === 'hold' || breathState.phase === 'holdEmpty' ? 3 : 0.4,
                          repeat: breathState.phase === 'hold' || breathState.phase === 'holdEmpty' ? Infinity : 0,
                          ease: 'easeInOut',
                        }}
                        className="absolute rounded-full border border-white/5 pointer-events-none"
                        style={{
                          width: '160px',
                          height: '160px',
                          borderColor: `${color}${40 - i * 10}`,
                        }}
                      />
                    ))}

                    {/* Breathing Crystal */}
                    <div className="absolute z-10">
                      <PracticeCrystal
                        facets={crystalState.facets}
                        color={crystalState.color}
                        fogPercent={crystalState.fogPercent}
                        glowIntensity={crystalState.glowIntensity * (breathState.phase === 'inhale' || breathState.phase === 'hold' ? 0.95 : 0.55)}
                        rotationSpeed={crystalState.rotationSpeed * 0.65}
                        isPulsing={true}
                      />
                    </div>

                    {/* Floating Timer inside the central area */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={breathState.secondsLeft}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.15 }}
                          transition={{ duration: 0.25 }}
                          className="text-4xl font-extralight font-mono text-white/95 tracking-tighter"
                        >
                          {breathState.secondsLeft}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Phase details & instructions */}
                  <div className="space-y-3 z-10 w-full mt-2">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={breathState.phase}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-1.5"
                      >
                        <span
                          className="text-xs font-semibold tracking-[0.25em] uppercase font-mono block"
                          style={{ color }}
                        >
                          {STEP_PHASE_LABELS[breathState.phase]}
                        </span>
                        <p className="text-sm font-light text-white/70 max-w-[280px] leading-relaxed mx-auto px-2">
                          {STEP_PHASE_INSTRUCTIONS[breathState.phase]}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    {/* Poetic description / step commentary if present */}
                    {activeStep.text && (
                      <p className="text-xs text-white/35 leading-relaxed italic max-w-[260px] mx-auto pt-1">
                        {activeStep.text}
                      </p>
                    )}

                    {/* Sleek Cycle Dots */}
                    <div className="flex flex-col items-center pt-4 gap-1">
                      <div className="flex gap-2">
                        {[...Array(4)].map((_, idx) => (
                          <div
                            key={idx}
                            className="h-[3px] rounded-full transition-all duration-700"
                            style={{
                              width: idx === (breathState.cycleIndex % 4) ? '18px' : '6px',
                              backgroundColor: idx < (breathState.cycleIndex % 4) ? color : idx === (breathState.cycleIndex % 4) ? `${color}cc` : 'rgba(255,255,255,0.06)'
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
                        Цикл {(breathState.cycleIndex % 4) + 1}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Interactive Step */}
              {activeStep.type === 'interactive' && activeStep.interaction && (
                <motion.div
                  key={`step-interactive-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center w-full gap-6 relative"
                >
                  <div
                    className="absolute pointer-events-none -top-2 z-0 h-44 w-44 rounded-full blur-[36px] opacity-[0.05]"
                    style={{ backgroundColor: crystalState.color }}
                  />

                  {activeStep.text && (
                    <h3 className="text-base font-light text-white/80 text-center tracking-tight leading-relaxed max-w-[280px] z-10 px-4">
                      {activeStep.text}
                    </h3>
                  )}

                  <div className="w-full relative z-10 py-2">
                    <PracticeInteractive
                      interaction={activeStep.interaction}
                      onComplete={() => {
                        if (activeStep.duration) {
                          setElapsed(activeStep.startTime + activeStep.duration);
                        }
                      }}
                      crystalColor={color}
                    />
                  </div>
                </motion.div>
              )}

              {/* Scientific Insight Step */}
              {activeStep.type === 'insight' && activeStep.text && (
                <motion.div
                  key={`step-insight-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center w-full gap-8"
                >
                  {/* Small rotating crystal decoration */}
                  <div className="scale-75 relative py-2">
                    <PracticeCrystal
                      facets={crystalState.facets}
                      color={crystalState.color}
                      fogPercent={50}
                      glowIntensity={0.3}
                      rotationSpeed={12}
                    />
                  </div>

                  {/* Glassmorphic panel */}
                  <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.05] rounded-3xl p-6 w-full relative overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.24)] text-left">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <span className="text-[10px] font-mono tracking-[0.25em] text-white/45 uppercase block mb-4 font-semibold text-center">
                      {activeStep.subtitle || 'Научный инсайт'}
                    </span>
                    <p className="text-sm text-white/70 leading-relaxed font-light px-1">
                      {activeStep.text}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Microcheck Step */}
              {activeStep.type === 'microcheck' && (
                <motion.div
                  key={`step-microcheck-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center w-full gap-8"
                >
                  <div className="scale-75 opacity-70 py-2">
                    <PracticeCrystal
                      facets={crystalState.facets}
                      color={crystalState.color}
                      fogPercent={60}
                      glowIntensity={0.3}
                      rotationSpeed={10}
                    />
                  </div>

                  <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.05] rounded-3xl p-6 w-full shadow-[0_16px_36px_rgba(0,0,0,0.24)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    
                    <p className="text-md font-light text-white/80 leading-relaxed text-center mb-6 px-2">
                      {activeStep.text || 'Как твое самочувствие сейчас?'}
                    </p>

                    {microcheckResponse === null ? (
                      <div className="flex flex-col gap-3 w-full">
                        <button
                          onClick={() => handleMicrocheck(true)}
                          className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80 hover:bg-white/[0.07] hover:border-white/[0.12] hover:text-white active:scale-98 transition-all font-medium flex items-center justify-center shadow-md"
                        >
                          Хорошо
                        </button>
                        <button
                          onClick={() => handleMicrocheck(false)}
                          className="w-full h-12 rounded-2xl bg-white/[0.015] border border-white/[0.04] text-sm text-white/50 hover:bg-white/[0.05] hover:border-white/[0.08] hover:text-white/80 active:scale-98 transition-all flex items-center justify-center"
                        >
                          Сложно
                        </button>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-sm font-light py-3"
                        style={{ color: microcheckResponse ? '#2dd4bf' : '#fbbf24' }}
                      >
                        {microcheckResponse
                          ? 'Отлично. Твое тело запоминает это состояние.'
                          : 'Это нормально. Позволь себе быть в любом состоянии.'}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Closing / Final Chord Step */}
              {(activeStep.type === 'closing' || activeStep.type === 'final_chord') && activeStep.text && (
                <motion.div
                  key={`step-closing-${activeStep.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="text-center w-full flex flex-col items-center justify-center gap-10"
                >
                  <p className="text-lg md:text-xl font-light text-white/90 leading-relaxed tracking-tight px-4 whitespace-pre-line">
                    {activeStep.text}
                  </p>

                  {activeStep.type === 'final_chord' ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                      transition={{ duration: 2.5, ease: 'easeOut' }}
                      className="relative w-20 h-20 rounded-full flex items-center justify-center mt-2"
                    >
                      {/* Radial shockwave pulse */}
                      <motion.div
                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border border-white/10"
                        style={{ borderColor: `${color}40` }}
                      />
                      <div
                        className="w-16 h-16 rounded-full blur-[4px]"
                        style={{
                          background: `radial-gradient(circle, ${color}ee, ${color}33)`,
                          boxShadow: `0 0 50px 15px ${color}aa`,
                        }}
                      />
                    </motion.div>
                  ) : (
                    <div className="scale-90 opacity-60">
                      <PracticeCrystal
                        facets={crystalState.facets}
                        color={crystalState.color}
                        fogPercent={10}
                        glowIntensity={0.6}
                        rotationSpeed={4}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Completion state */}
          {isComplete && (
            <CompletionScreen
              practice={practice}
              standalone={standalone}
              elapsed={elapsed}
              breathCount={breathCount}
              beforeHeartRate={beforeHeartRate}
              afterHeartRate={afterHeartRate}
              isHealthConnected={beforeHeartRate !== null}
              onGoHome={reportCompletion}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ─── Footer controls ─── */}
      {!isComplete && !standalone?.practiceType && (
        <div className="relative z-10 px-6 pb-8 pt-4">
          <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
            <button
              onClick={isPlaying ? handlePause : handleResume}
              className="flex-1 h-13 rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.05] active:scale-97 transition-all text-white/80 hover:text-white flex items-center justify-center gap-2 shadow-md"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-light">Пауза</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white/60 ml-0.5" />
                  <span className="text-sm font-light">Продолжить</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="h-13 px-6 rounded-2xl border border-white/[0.08] bg-white/[0.06] text-white/90 text-sm font-light hover:bg-white/[0.1] active:scale-97 transition-all flex items-center justify-center shadow-md"
            >
              Завершить
            </button>
          </div>
        </div>
      )}

      {/* ─── Exit confirmation ─── */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowExitConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216]/95 border border-white/[0.08] rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl"
            >
              <h3 className="text-md font-semibold text-white mb-2">Завершить практику?</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-5">
                Прогресс не будет сохранён. Вы уверены?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 hover:bg-white/[0.08] transition-colors"
                >
                  Продолжить
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl bg-white/[0.08] border border-white/[0.08] text-xs text-white hover:bg-white/[0.12] transition-colors"
                >
                  Выйти
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Help overlay ─── */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowHelp(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216]/95 border border-white/[0.08] rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl"
            >
              <h3 className="text-md font-semibold text-white mb-3">О практике</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-2">
                {standalone?.description || practice.description}
              </p>
              {standalone?.scientificBasis && (
                <p className="text-xs text-white/35 leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">
                  {standalone.scientificBasis.slice(0, 200)}...
                </p>
              )}
              <button
                onClick={() => setShowHelp(false)}
                className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/[0.06] text-xs text-white/70 hover:bg-white/[0.1] transition-colors mt-4"
              >
                Закрыть
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
