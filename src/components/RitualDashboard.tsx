import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Edit2, X, Check,
  Moon, Sun, Zap, Activity, Wind, Sparkle, Heart, Eye, Thermometer,
  ShoppingBag, Smartphone, Lock, ChevronRight, BookOpen, Clock, ArrowLeft, RefreshCw,
  Circle, Droplets
} from 'lucide-react';
import { Practice, UserStats } from '../types';
import GlassSurface from './ui/GlassSurface';
import QuickStartPill from './ui/QuickStartPill';
import RitualRingAnalytics from './RitualRingAnalytics';
import ConnectHealthModal from './ConnectHealthModal';
import SelectModal from './SelectModal';
import TimePickerModal, { normalizeTime } from './TimePickerModal';
import { DataSource } from '../services/health/manager';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import { ShineBreakdown, calculateShine, getShineLabel, getShineAccentColor, type ShineDriver } from '../services/health/shine';
import { APP_NAME, CORE_NAME, HEALTH_NAME, STORE_URL } from '../constants/brand';
import {
  DailyHealthPoint,
  EMPTY_AVAILABILITY_BY_METRIC,
  EMPTY_HISTORY_BY_METRIC,
  EMPTY_METRICS,
  HealthAvailabilityByMetric,
  HealthHistoryByMetric,
  HealthMetrics,
  HealthMetricKey,
  MetricAvailability,
} from '../services/health/types';
import { notificationService, rescheduleAll } from '../services/notifications';
import { ARTICLES } from '../data/articles';
import { requestPrivacySafeSync } from '../services/supabase/privacySync';
import SilkShaderBackground from './SilkShaderBackground';
import ShineTrendPanel from './ShineTrendPanel';
import {
  HealthSleepScreen,
  HealthRecoveryScreen,
  HealthActivityScreen,
  HealthBodyScreen,
  HealthStatisticsOverview,
  HealthMetricsStack,
  HealthGroup,
  defaultSelectedDate,
  type HealthSection,
  type HealthPeriod,
} from './health';

interface RitualDashboardProps {
  practices: Practice[];
  stats: UserStats;
  onSelectPractice: (practice: Practice, context?: { timelineSlotId?: string }) => void;
  shine?: ShineBreakdown;
  healthSource?: DataSource;
  healthMetrics?: HealthMetrics;
  historyByMetric?: HealthHistoryByMetric;
  availabilityByMetric?: HealthAvailabilityByMetric;
  onRefreshHealth?: () => void | Promise<void>;
  onHealthOpenChange?: (open: boolean) => void;
}

interface TimelineSlot {
  id: string;
  time: string;
  practiceId: string;
}

const DEFAULT_SLOTS: TimelineSlot[] = [
  { id: '1', time: '08:00', practiceId: 'start-day' },
  { id: '2', time: '12:30', practiceId: 'focus' },
  { id: '4', time: '20:30', practiceId: 'end-day' }
];

const SLOT_ACTIVE_GRACE_MINUTES = 60;

const METRIC_TO_SECTION: Record<string, HealthSection> = {
  sleep: 'sleep',
  hrv: 'recovery',
  hr: 'recovery',
  activity: 'activity',
  resp: 'body',
  oxygen: 'body',
  temp: 'body',
};

const CYCLE_PHASE_LABEL: Record<string, string> = {
  follicular: 'Фолликулярная фаза',
  luteal: 'Лютеиновая фаза',
  ovulatory: 'Овуляторная фаза',
  menstrual: 'Менструальная фаза',
};

export default function RitualDashboard({
  practices,
  stats,
  onSelectPractice,
  shine,
  healthSource,
  healthMetrics: healthMetricsProp,
  historyByMetric: historyByMetricProp,
  availabilityByMetric: availabilityByMetricProp,
  onRefreshHealth,
  onHealthOpenChange,
}: RitualDashboardProps) {
  const shineScore = shine?.total ?? 0;
  const dataQuality = shine?.dataQuality ?? 'none';

  const recommendedPractice = React.useMemo(() => {
    let recommendedId = 'start-day';
    if (shineScore === 0) {
      recommendedId = 'start-day';
    } else if (shineScore < 45) {
      recommendedId = 'calm-down';
    } else if (shineScore >= 45 && shineScore < 65) {
      recommendedId = 'restore';
    } else if (shineScore >= 65 && shineScore < 85) {
      recommendedId = 'pause';
    } else {
      recommendedId = 'focus';
    }
    return practices.find(p => p.id === recommendedId) || practices[0];
  }, [shineScore, practices]);

  const [currentPage, setCurrentPage] = useState<number>(0);

  // Reading tab states
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [completedArticles, setCompletedArticles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ritual_completed_articles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [readerFontSize, setReaderFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ritual_reader_font_size');
      return saved ? parseInt(saved, 10) : 14;
    } catch {
      return 14;
    }
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedTrendDay, setSelectedTrendDay] = useState<number | null>(null);
  const [lockedMetric, setLockedMetric] = useState<{
    title: string;
    status: MetricAvailability;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('ritual_completed_articles', JSON.stringify(completedArticles));
  }, [completedArticles]);

  useEffect(() => {
    localStorage.setItem('ritual_reader_font_size', String(readerFontSize));
  }, [readerFontSize]);

  const activeArticle = ARTICLES.find(a => a.id === selectedArticleId);

  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const INTENTIONS_HIGH = [
    "Сегодня всё складывается в мою пользу",
    "Сегодня я вижу возможности и беру их спокойно и точно",
    "Сегодня я в ресурсе, в фокусе и на своём пути",
    "Сегодня моя энергия направлена на то, что я выбираю",
    "Сегодня я действую из состояния, где всё уже есть",
    "Сегодня я ориентирую сердце на то, что истинно важно",
    "Сегодня я доверяю дню открыться",
    "Сегодня я замечаю возможности",
    "Сегодня я направляю внимание на главное",
    "Сегодня я доверяю своей интуиции",
    "Сегодня я доверяю своим решениям",
    "Сегодня я делюсь тем, что у меня есть",
    "Сегодня я выбираю важное для себя",
    "Сегодня я встречаю день с доверием",
    "Сегодня я выбираю спокойствие",
    "Сегодня я двигаюсь в своём ритме и принимаю то, что приходит",
    "Сегодня я выбираю видеть возможности",
    "Сегодня я замедляюсь, когда чувствую спешку"
  ];

  const INTENTIONS_LOW = [
    "Сегодня я выбираю свой темп. Я двигаюсь ровно столько, сколько нужно",
    "Сегодня я выбираю отдых без чувства вины",
    "Сегодня я слушаю своё тело",
    "Сегодня я отпускаю то, что не могу контролировать",
    "Сегодня я ориентирую сердце на то, что истинно важно",
    "Сегодня я отдаю то, что могут сделать другие",
    "Сегодня уделяю внимание отдыху больше, чем работе",
    "Сегодня я говорю «нет» тому, что истощает",
    "Сегодня я оставляю незавершённое на потом",
    "Сегодня моя единственная задача — восстановиться",
    "Сегодня я выбираю покой и тишину",
    "Сегодня я ставлю восстановление в приоритет",
    "Сегодня я обращаюсь с собой бережно",
    "Сегодня я возвращаю внимание в тело",
    "Сегодня я забочусь о себе",
    "Сегодня я возвращаюсь к дыханию, когда трудно",
    "Сегодня я позволяю себе просто быть",
    "Сегодня мое внимание направлено на себя"
  ];

  const getPresetIntentionId = (text: string): string | null => {
    const highIndex = INTENTIONS_HIGH.indexOf(text);
    if (highIndex >= 0) return `high_${highIndex}`;

    const lowIndex = INTENTIONS_LOW.indexOf(text);
    if (lowIndex >= 0) return `low_${lowIndex}`;

    return null;
  };

  const [focusDate, setFocusDate] = useState<string>(() => {
    return localStorage.getItem('ritual_day_focus_date') || '';
  });

  const [dailyFocus, setDailyFocus] = useState<string>(() => {
    const savedDate = localStorage.getItem('ritual_day_focus_date') || '';
    const savedFocus = localStorage.getItem('ritual_day_focus') || '';
    if (savedDate === getTodayDateString()) {
      return savedFocus;
    }
    return ''; // Reset to empty if a new day has arrived
  });
  const isFocusLockedToday = focusDate === getTodayDateString() && dailyFocus.trim().length > 0;
  const [isEditingFocus, setIsEditingFocus] = useState(false);

  // States for the Intention Modal
  const [isIntentionModalOpen, setIsIntentionModalOpen] = useState(false);
  const [modalIntention, setModalIntention] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');

  // Evening reflection state
  const [reflection, setReflection] = useState<{
    answer: 'yes' | 'partially' | 'no' | null;
    reactionText: string;
  }>(() => {
    const savedDate = localStorage.getItem('ritual_reflection_date') || '';
    if (savedDate === getTodayDateString()) {
      const answer = localStorage.getItem('ritual_reflection_answer') as 'yes' | 'partially' | 'no' | null;
      const reactionText = localStorage.getItem('ritual_reflection_reaction') || '';
      return { answer, reactionText };
    }
    return { answer: null, reactionText: '' };
  });

  const now = new Date();
  const isEvening = now.getHours() >= 20; // after 20:00
  const showReflectionCard = !!(isEvening && isFocusLockedToday);

  const openIntentionModal = () => {
    const isHigh = shineScore >= 60;
    const pool = isHigh ? INTENTIONS_HIGH : INTENTIONS_LOW;
    const randomIdx = Math.floor(Math.random() * pool.length);
    setModalIntention(pool[randomIdx]);
    setIsCustomInput(false);
    setCustomText('');
    setIsIntentionModalOpen(true);
  };

  const handleNextIntention = () => {
    const isHigh = shineScore >= 60;
    const pool = isHigh ? INTENTIONS_HIGH : INTENTIONS_LOW;
    let nextPhrase = modalIntention;
    if (pool.length > 1) {
      while (nextPhrase === modalIntention) {
        const randomIdx = Math.floor(Math.random() * pool.length);
        nextPhrase = pool[randomIdx];
      }
    } else {
      nextPhrase = pool[0];
    }
    setModalIntention(nextPhrase);
    setIsCustomInput(false);
  };

  const handleReflectionAnswer = (choice: 'yes' | 'partially' | 'no') => {
    let reactions: string[] = [];
    if (choice === 'yes') {
      reactions = [
        "Ты настроил восприятие — и твой мозг отработал это. Завтра — новый выбор.",
        "Здорово. Сегодняшнее намерение стало частью твоего дня. Завтра появится новое."
      ];
    } else if (choice === 'partially') {
      reactions = [
        "Твой мозг учится видеть возможности. Это процесс, а не переключатель. Завтра он будет точнее.",
        "Каждое возвращение к намерению укрепляет привычку замечать главное. Даже если это произошло пару раз."
      ];
    } else {
      reactions = [
        "Мозгу нужно время на перенастройку. Сегодняшний день был частью этого процесса. Завтра — новый выбор.",
        "Завтра – новый день и новый выбор."
      ];
    }
    const chosenReaction = reactions[Math.floor(Math.random() * reactions.length)];

    const todayStr = getTodayDateString();
    localStorage.setItem('ritual_reflection_date', todayStr);
    localStorage.setItem('ritual_reflection_answer', choice);
    localStorage.setItem('ritual_reflection_reaction', chosenReaction);

    setReflection({ answer: choice, reactionText: chosenReaction });
    requestPrivacySafeSync();
  };

  const [slots, setSlots] = useState<TimelineSlot[]>(() => {
    const saved = localStorage.getItem('ritual_day_slots');
    return saved ? JSON.parse(saved) : DEFAULT_SLOTS;
  });

  const todayKey = getTodayDateString();

  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`ritual_completed_slots_${todayKey}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [activeSlotId, setActiveSlotId] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(`ritual_completed_slots_${todayKey}`, JSON.stringify(completedSlots));
  }, [completedSlots, todayKey]);

  const getMinutes = (tStr: string) => {
    const [h, m] = tStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getCurrentMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const getPracticeDurationMinutes = (practice?: Practice) => {
    if (practice?.durationSec) return Math.ceil(practice.durationSec / 60);
    const parsed = parseInt(practice?.duration || '', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getSlotActiveUntil = (slot: TimelineSlot) => {
    const assignedPractice = practices.find(p => p.id === slot.practiceId);
    const practiceDuration = getPracticeDurationMinutes(assignedPractice);
    return getMinutes(slot.time) + Math.max(practiceDuration, SLOT_ACTIVE_GRACE_MINUTES);
  };

  const getSlotStatus = (slot: TimelineSlot): 'completed' | 'skipped' | 'active' | 'pending' => {
    if (completedSlots[slot.id]) return 'completed';
    const currentMinutes = getCurrentMinutes();
    const slotStart = getMinutes(slot.time);
    if (currentMinutes < slotStart) return 'pending';
    if (currentMinutes <= getSlotActiveUntil(slot)) return 'active';
    return 'skipped';
  };

  useEffect(() => {
    const updateActiveSlot = () => {
      if (slots.length === 0) return;
      const currentMinutes = getCurrentMinutes();

      let foundId = '';
      const sortedSlots = [...slots].sort((a, b) => a.time.localeCompare(b.time));
      for (const slot of sortedSlots) {
        if (currentMinutes >= getMinutes(slot.time) && currentMinutes <= getSlotActiveUntil(slot)) {
          foundId = slot.id;
          break;
        }
      }

      setActiveSlotId(foundId);
    };
    updateActiveSlot();
    const interval = setInterval(updateActiveSlot, 10000);
    return () => clearInterval(interval);
  }, [slots]);

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editPracticeId, setEditTimePracticeId] = useState('');

  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('14:00');

  const [showEditPracticeModal, setShowEditPracticeModal] = useState(false);
  const [showNewPracticeModal, setShowNewPracticeModal] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [showNewTimePicker, setShowNewTimePicker] = useState(false);

  // App owns the health-data lifecycle. Reusing its snapshot here keeps the
  // dashboard instant when the tab remounts and avoids another BLE ring sync.
  const healthMetrics = healthMetricsProp ?? EMPTY_METRICS;
  const historyByMetric = historyByMetricProp ?? EMPTY_HISTORY_BY_METRIC;
  const availabilityByMetric = availabilityByMetricProp ?? EMPTY_AVAILABILITY_BY_METRIC;
  const dashboardHasRing = healthSource === 'ring';
  const refreshDashboardHealth = async () => {
    await onRefreshHealth?.();
  };

  // Weekly chart data
  function normalizeHistoryDate(dateStr: string): string {
    const now = new Date();
    if (dateStr.startsWith('Сегодня')) return now.toISOString().slice(0, 10);
    if (dateStr.startsWith('Вчера')) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday.toISOString().slice(0, 10);
    }
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];
    return dateStr.slice(0, 10);
  }

  const getHealthValueForDate = (metric: HealthMetricKey, date: string): number | null => {
    const point = (historyByMetric[metric] || []).find(p => p.date === date && p.status === 'available' && p.value !== null);
    return point?.value ?? null;
  };

  const getRealShineForDate = (date: string): number | null => {
    const dailyMetrics = {
      hrv: getHealthValueForDate('hrv', date),
      sleepHours: getHealthValueForDate('sleepHours', date),
      steps: getHealthValueForDate('steps', date),
      restingHR: getHealthValueForDate('restingHR', date),
      spo2: getHealthValueForDate('spo2', date),
      temperature: getHealthValueForDate('temperature', date),
      respiratoryRate: getHealthValueForDate('respiratoryRate', date),
      source: healthSource === 'ring' ? 'ring' : healthSource === 'healthapp' ? healthMetrics.source : 'none',
      lastSync: null,
    };

    const hasCoreData = dailyMetrics.hrv !== null
      || dailyMetrics.sleepHours !== null
      || dailyMetrics.steps !== null
      || dailyMetrics.restingHR !== null;

    if (!hasCoreData) return null;
    return calculateShine(dailyMetrics, 0).total;
  };

  // Build historical analytics from real daily health points and recorded practices.
  const getHistoricalAnalytics = (period: '7' | '30' | '90') => {
    const now = new Date();
    const daysCount = period === '7' ? 7 : period === '30' ? 30 : 90;
    const daysMap = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const monthsMap = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const list: Array<{
      dateStr: string;
      dayOfWeek: string;
      dayOfMonth: number;
      monthStr: string;
      label: string;
      practicesCount: number;
      shineScore: number | null;
      hasHealthData: boolean;
      isToday: boolean;
    }> = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      
      // practices completed on this exact date
      const practicesCount = stats.history.filter(h => normalizeHistoryDate(h.date) === dayStr).length;
      
      const realShineScore = getRealShineForDate(dayStr);

      // Generate friendly visual label
      let label = '';
      if (period === '7') {
        label = daysMap[d.getDay()];
      } else if (period === '30') {
        label = `${d.getDate()}`;
      } else {
        if (d.getDate() === 1 || i === daysCount - 1 || i === 0) {
          label = monthsMap[d.getMonth()];
        } else {
          label = `${d.getDate()}`;
        }
      }

      list.push({
        dateStr: dayStr,
        dayOfWeek: daysMap[d.getDay()],
        dayOfMonth: d.getDate(),
        monthStr: monthsMap[d.getMonth()],
        label,
        practicesCount,
        shineScore: realShineScore,
        hasHealthData: realShineScore !== null,
        isToday: i === 0
      });
    }

    return list;
  };

  const analytics7Days = getHistoricalAnalytics('7');
  const weekDays = analytics7Days.map(d => d.label);
  const barData = analytics7Days.map(d => d.practicesCount);
  const maxBars = Math.max(...barData, 1);
  const [newSlotPracticeId, setNewSlotPracticeId] = useState('');

  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isHealthConnecting, setIsHealthConnecting] = useState(false);
  const [healthConnectStep, setHealthConnectStep] = useState('');

  const getCurrentHealthSourceType = (): HealthConnectSourceType => {
    return healthService.getPlatform() === 'ios' ? 'healthkit' : 'healthconnect';
  };

  const handleConnectHealth = async () => {
    if (!healthService.isNative()) {
      setShowConnectModal(true);
      return;
    }

    const result = await connectHealthSource(getCurrentHealthSourceType(), {
      onRefresh: async () => {
        await refreshDashboardHealth();
      },
      onSyncing: setIsHealthConnecting,
      onStep: setHealthConnectStep,
    });

    if (result.ok) {
      setShowConnectModal(false);
    }
  };
  const getAvailabilityLabel = (availability: MetricAvailability) => {
    switch (availability) {
      case 'permission_denied':
        return 'Нет разрешения на чтение';
      case 'unsupported':
        return 'Показатель не поддерживается';
      case 'no_recent_data':
        return 'Нет данных за последние 7 дней';
      case 'available':
        return 'Данные доступны';
      default:
        return 'Данные недоступны';
    }
  };
  const metricKeyMap: Record<string, HealthMetricKey> = {
    sleep: 'sleepHours',
    hrv: 'hrv',
    hr: 'restingHR',
    activity: 'steps',
    resp: 'respiratoryRate',
    oxygen: 'spo2',
    temp: 'temperature',
  };
  const getMetricPoints = (uiKey: string): DailyHealthPoint[] => {
    const key = metricKeyMap[uiKey];
    return key ? historyByMetric[key] || [] : [];
  };
  const getAvailableMetricPoints = (uiKey: string, limit?: number): DailyHealthPoint[] => {
    const points = getMetricPoints(uiKey).filter(point => point.status === 'available' && point.value !== null);
    return typeof limit === 'number' ? points.slice(-limit) : points;
  };
  const formatMetricValue = (key: string, value: number, unit: string): string => {
    if (key === 'sleep') {
      const hours = Math.floor(value);
      const minutes = Math.round((value % 1) * 60);
      return `${hours}ч ${minutes}м`;
    }
    if (key === 'activity') return Math.round(value).toLocaleString('ru-RU');
    if (key === 'oxygen') return `${Math.round(value)}%`;
    if (key === 'temp') return `${value.toFixed(1)}°C`;
    if (key === 'resp') return `${value.toFixed(1)} ${unit}`;
    return `${Math.round(value)} ${unit}`;
  };
  const getMetricDelta = (uiKey: string, currentValue: number | null | undefined) => {
    if (currentValue === null || currentValue === undefined) return null;
    const previous = getAvailableMetricPoints(uiKey).slice(-2, -1)[0]?.value ?? null;
    if (previous === null) return null;
    return currentValue - previous;
  };
  const getAverageMetricValue = (uiKey: string, limit = 7): number | null => {
    const values = getAvailableMetricPoints(uiKey, limit).map(point => point.value as number);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };
  const getSleepInsight = (sleepHours: number | null | undefined, delta: number | null) => {
    if (sleepHours === null || sleepHours === undefined) return `Подключите источник здоровья, чтобы ${APP_NAME} собрал ночной ритм.`;
    if (sleepHours >= 7.5 && (delta ?? 0) >= -0.25) return 'Сон держится в устойчивой зоне восстановления.';
    if (sleepHours >= 6.5) return 'Ночь близка к норме. Смотрите на тренд, а не на один день.';
    return 'Сон ниже личной нормы. Сегодня лучше выбрать мягкую нагрузку и вечерний ритуал.';
  };
  const [healthSection, setHealthSection] = useState<HealthSection>('shine');
  const [categoryPeriod, setCategoryPeriod] = useState<HealthPeriod>('day');
  const [selectedHealthDate, setSelectedHealthDate] = useState(defaultSelectedDate);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7' | '30' | '90'>('30');
  const [showNarrative, setShowNarrative] = useState(true);
  const healthMainRef = useRef<HTMLElement | null>(null);
  const lastHealthOpenRef = useRef(false);
  const healthPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const primaryDriverCardRef = useRef<HTMLDivElement | null>(null);

  const metricHrv = healthMetrics.hrv;
  const openHealthSection = (section: HealthSection) => {
    setHealthSection(section);
    if (section !== 'shine') setCategoryPeriod('day');
    healthMainRef.current?.scrollTo({ top: 0 });
  };

  const openMetricDetail = (metricKey: string) => {
    openHealthSection(METRIC_TO_SECTION[metricKey] ?? 'shine');
  };

  const closeHealthOverlay = () => {
    setIsHealthOpen(false);
    setHealthSection('shine');
    setCategoryPeriod('day');
    setSelectedHealthDate(defaultSelectedDate());
  };

  useEffect(() => {
    if (!isHealthOpen) return;
    healthPillRefs.current[healthSection]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [isHealthOpen, healthSection]);

  useEffect(() => {
    const justOpened = isHealthOpen && !lastHealthOpenRef.current;
    lastHealthOpenRef.current = isHealthOpen;
    if (!justOpened || healthSection !== 'shine' || !showNarrative) return;
    const timer = window.setTimeout(() => {
      primaryDriverCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isHealthOpen, healthSection, showNarrative, shine?.primaryDriver]);

  const healthMetricCards: Array<{
    uiKey: string;
    driver: ShineDriver;
    label: string;
    val: number | null | undefined;
    unit: string;
    historyKey: HealthMetricKey;
    color: string;
  }> = [
    { uiKey: 'sleep', driver: 'sleep', label: 'Сон', val: healthMetrics.sleepHours, unit: 'ч', historyKey: 'sleepHours', color: '#8D4FFF' },
    { uiKey: 'activity', driver: 'activity', label: 'Активность', val: healthMetrics.steps, unit: 'шагов', historyKey: 'steps', color: '#fcd34d' },
    { uiKey: 'hrv', driver: 'hrv', label: 'ВСР', val: healthMetrics.hrv, unit: 'мс', historyKey: 'hrv', color: '#6ee7b7' },
    { uiKey: 'hr', driver: 'restingHR', label: 'ЧСС покоя', val: healthMetrics.restingHR, unit: 'уд/м', historyKey: 'restingHR', color: '#fca5a5' },
  ];

  const formatDriverCardValue = (uiKey: string, val: number, unit: string) => {
    if (uiKey === 'sleep' || unit === 'ч') {
      return `${Math.floor(val)}ч ${Math.round((val % 1) * 60)}м`;
    }
    if (uiKey === 'activity' || unit === 'шагов') return `${Math.round(val).toLocaleString('ru-RU')} шагов`;
    return `${Math.round(val)} ${unit}`;
  };

  const [isCycleOpen, setIsCycleOpen] = useState(false);

  useEffect(() => {
    onHealthOpenChange?.(isHealthOpen);
  }, [isHealthOpen, onHealthOpenChange]);

  useEffect(() => {
    if (!isHealthOpen && !isCycleOpen) return;

    const scrollY = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
      width: body.style.width,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      body.style.width = previous.width;
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isHealthOpen, isCycleOpen, isIntentionModalOpen]);
  const [cycleDay, setCycleDay] = useState<number>(12);
  const [cyclePhase, setCyclePhase] = useState<string>('follicular');
  const [isPregnancyMode, setIsPregnancyMode] = useState<boolean>(() => {
    return localStorage.getItem('ritual_pregnancy_mode') === 'true';
  });

  const userGender = typeof window !== 'undefined' ? (localStorage.getItem('ritual_user_gender') || 'unspecified') : 'unspecified';
  const showCycleSection = userGender !== 'male';

  const healthNavItems: Array<{
    id: HealthSection;
    label: string;
    icon: typeof Sparkle;
  }> = [
    { id: 'shine', label: 'Сияние', icon: Sparkle },
    { id: 'sleep', label: 'Сон', icon: Moon },
    { id: 'recovery', label: 'Покой', icon: Heart },
    { id: 'activity', label: 'Активность', icon: Zap },
    { id: 'body', label: 'Тело', icon: Wind },
    ...(showCycleSection ? [{ id: 'cycle' as const, label: 'Цикл', icon: Droplets }] : []),
    ...(dashboardHasRing ? [{ id: 'ring' as const, label: 'Кольцо', icon: Circle }] : []),
  ];

  useEffect(() => {
    if (!healthNavItems.some(item => item.id === healthSection)) {
      setHealthSection('shine');
    }
  }, [healthSection, showCycleSection, dashboardHasRing]);

  useEffect(() => {
    if (isFocusLockedToday) {
      localStorage.setItem('ritual_day_focus', dailyFocus);
    }
  }, [dailyFocus, isFocusLockedToday]);
  useEffect(() => {
    localStorage.setItem('ritual_day_slots', JSON.stringify(slots));
    rescheduleAll().catch(e => console.warn('[RitualDashboard] Failed to reschedule:', e));
  }, [slots]);
  useEffect(() => { localStorage.setItem('ritual_pregnancy_mode', isPregnancyMode ? 'true' : 'false'); }, [isPregnancyMode]);

  const maybeRequestNotificationAccessForNewSlot = async () => {
    if (!notificationService.isNotificationsEnabled() || !notificationService.isNative()) return;
    if (await notificationService.checkPermission()) return;

    const granted = await notificationService.requestNotificationAccess();
    if (granted) {
      await rescheduleAll();
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const newSlot: TimelineSlot = { id: Date.now().toString(), time: newSlotTime, practiceId: newSlotPracticeId };
    const updated = [...slots, newSlot].sort((a, b) => a.time.localeCompare(b.time));
    setSlots(updated);
    setIsAddingSlot(false);
    setNewSlotTime('14:00');
    setNewSlotPracticeId('');
    maybeRequestNotificationAccessForNewSlot()
      .catch(e => console.warn('[RitualDashboard] Failed to request notification access:', e));
  };

  const handleSaveSlotEdit = (id: string) => {
    const updated = slots.map(s => s.id === id ? { ...s, time: editTime, practiceId: editPracticeId } : s)
      .sort((a, b) => a.time.localeCompare(b.time));
    setSlots(updated);
    setEditingSlotId(null);
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const accentColor = getShineAccentColor(shine?.state, shineScore, dataQuality);
  const status = { title: getShineLabel(shineScore, dataQuality), color: accentColor };
  const hasRingOrHealth = dashboardHasRing || (healthSource && healthSource !== 'none');

  const getPracticeIcon = (practice: Practice) => {
    const idLower = practice.id.toLowerCase();
    const titleLower = practice.title.toLowerCase();
    if (idLower.includes('start') || titleLower.includes('начало')) return <Sun className="w-3.5 h-3.5" strokeWidth={2} />;
    if (idLower.includes('end') || titleLower.includes('сон')) return <Moon className="w-3.5 h-3.5" strokeWidth={2} />;
    if (idLower.includes('focus') || titleLower.includes('фокус')) return <Zap className="w-3.5 h-3.5" strokeWidth={2} />;
    if (titleLower.includes('движение') || titleLower.includes('бег')) return <Activity className="w-3.5 h-3.5" strokeWidth={2} />;
    return <Sparkle className="w-3.5 h-3.5" strokeWidth={2} />;
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col select-none relative">

      <AnimatePresence mode="wait">
        {currentPage === 0 && (
          <motion.div
            key="page-today"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {/* ===== AURORA HERO: SHINE ===== */}
            <section className="relative -mx-5 overflow-hidden">
              <div className="absolute inset-0 min-h-[380px]" aria-hidden="true">
                <SilkShaderBackground accentColor={accentColor} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
              </div>

              <button
                type="button"
                onClick={() => setIsHealthOpen(true)}
                aria-label={`Открыть ${HEALTH_NAME}`}
                className="relative z-10 w-full flex flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+4.25rem)] pb-16 cursor-pointer transition-transform duration-[160ms] ease-out active:scale-[0.99]"
              >
                <div className="relative w-64 h-36 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 200 100" aria-hidden="true">
                    <path
                      d="M 20 90 A 80 80 0 0 1 180 90"
                      fill="none"
                      stroke="rgba(242,239,232,0.08)"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                    />
                    {dataQuality !== 'none' && (
                      <motion.path
                        d="M 20 90 A 80 80 0 0 1 180 90"
                        fill="none"
                        stroke={accentColor}
                        strokeLinecap="round"
                        strokeWidth="2"
                        initial={{ strokeDasharray: 251, strokeDashoffset: 251 }}
                        animate={{ strokeDashoffset: 251 - (251 * (shineScore / 100)) }}
                        transition={{ duration: 0.85, ease: [0.23, 1, 0.32, 1] }}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                    {dataQuality !== 'none' ? (
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                        className="text-[88px] font-display font-light text-[#F2EFE8] leading-none tabular-nums"
                      >
                        {shineScore}
                      </motion.span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[32px] font-display font-light text-[#F2EFE8]/35 leading-none">—</span>
                        <span className="text-[11px] text-[#F2EFE8]/40">нет данных</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[13px] text-[#F2EFE8]/70 tracking-[0.06em]">Сияние</p>
                <p className="mt-1 text-[12px] text-[#F2EFE8]/42">{status.title}</p>
              </button>
            </section>

            {/* ===== CONTENT SHEET (Apple-style overlap) ===== */}
            <section className="relative z-20 -mx-5 -mt-9 rounded-t-[32px] bg-[#08090A] border-t border-white/[0.08] shadow-[0_-10px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-8 px-5 pt-7 pb-2">
            {/* ===== DIRECTION ===== */}
            <div className="flex flex-col items-center text-center px-2">
              {isFocusLockedToday ? (
                <h2 className="font-display text-[28px] font-light leading-[1.12] text-[#F2EFE8] text-balance max-w-[320px]">
                  {dailyFocus}
                </h2>
              ) : (
                <button
                  type="button"
                  onClick={openIntentionModal}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <h2 className="font-display text-[28px] font-light leading-[1.12] text-[#F2EFE8] text-balance max-w-[320px] group-active:opacity-80 transition-opacity">
                    Что ты выбираешь сегодня?
                  </h2>
                  <span className="text-[13px] text-[#F2EFE8]/38 group-hover:text-[#F2EFE8]/55 transition-colors">
                    Выбрать намерение
                  </span>
                </button>
              )}
            </div>

            {/* ===== RECOMMENDATION ===== */}
            <GlassSurface
              as="button"
              onClick={() => {
                if (!hasRingOrHealth && shineScore === 0) {
                  window.open(STORE_URL, '_blank');
                  return;
                }
                onSelectPractice(recommendedPractice);
              }}
              className="p-5 flex items-center justify-between gap-4 min-h-[96px]"
            >
              <div className="flex flex-col items-start gap-1.5 min-w-0">
                <span className="text-[13px] text-[#F2EFE8]/45">Рекомендация</span>
                <span className="text-[20px] font-display font-light text-[#F2EFE8] leading-tight text-left">
                  {!hasRingOrHealth && shineScore === 0
                    ? `Полный опыт с ${CORE_NAME}`
                    : recommendedPractice.title}
                </span>
                {!hasRingOrHealth && shineScore === 0 && (
                  <span className="text-[12px] text-[#F2EFE8]/40 text-left leading-relaxed">
                    Умное кольцо точнее считывает состояние
                  </span>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-[#F2EFE8] fill-current ml-0.5" />
              </div>
            </GlassSurface>

            {/* ===== QUICK START ===== */}
            <section>
              <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar snap-x snap-mandatory -mx-1 px-1">
                {practices.map((practice, index) => (
                  <div key={practice.id} className="snap-start flex-shrink-0">
                    <QuickStartPill
                      practice={practice}
                      index={index}
                      onClick={() => onSelectPractice(practice)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ===== DAILY FLOW ===== */}
            <section className="flex flex-col gap-3">
              <motion.div layout className="relative flex flex-col gap-1.5">
                {(() => {
                  const visibleSlots = slots
                    .filter((slot) => slot.practiceId !== '')
                    .sort((a, b) => a.time.localeCompare(b.time));
                  const currentMin = getCurrentMinutes();
                  const firstMin = getMinutes(visibleSlots[0]?.time || '00:00');
                  const lastSlot = visibleSlots[visibleSlots.length - 1];
                  const lastMin = lastSlot ? getSlotActiveUntil(lastSlot) : 1439;
                  const totalRange = lastMin - firstMin || 1;
                  const progress = Math.max(0, Math.min(1, (currentMin - firstMin) / totalRange));
                  return (
                    <>
                      {/* Smooth continuous vertical timeline lines */}
                      <div className="absolute left-[59.5px] top-[14px] bottom-[14px] w-[1px] bg-white/[0.04] z-0" />
                      <div 
                        className="absolute left-[59.5px] top-[14px] w-[1px] transition-all duration-[30s] linear z-0"
                        style={{ 
                          height: `calc(${progress * 100}% - 14px)`,
                          backgroundColor: status.color,
                          boxShadow: `0 0 8px 1.5px ${status.color}30`
                        }} 
                      />
                    </>
                  );
                })()}

                {slots
                  .filter((slot) => slot.practiceId !== '')
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((slot) => {
                    const assignedPractice = practices.find(p => p.id === slot.practiceId);
                    const isEditing = editingSlotId === slot.id;
                    const status = getSlotStatus(slot);
                    const isActive = status === 'active';
                    const isCompleted = status === 'completed';
                    const isSkipped = status === 'skipped';
                    const isPending = status === 'pending';
                    const canInteract = assignedPractice && (isActive || isPending) && !isCompleted && !isSkipped;

                    return (
                      <motion.div layout key={slot.id} className="flex gap-0 items-start relative z-10 min-h-[48px] w-full">
                        {/* Column 1: Time (perfectly aligned with the start of card text) */}
                        <div className="w-[47px] flex-shrink-0 flex justify-end pr-3 pt-[13px]">
                          <span className={`text-[11px] tabular-nums font-medium tracking-tight ${isSkipped ? 'text-[#F2EFE8]/20' : 'text-[#F2EFE8]/45'}`}>{slot.time}</span>
                        </div>

                        {/* Column 2: Timeline node */}
                        <div className="flex-shrink-0 w-[26px] flex items-start justify-center pt-[9px] relative z-20">
                          <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all border ${
                             isCompleted ? 'bg-[#070709] border-[#74B6A0]/30' :
                             isActive ? 'bg-[#070709] border-white/20' :
                             isSkipped ? 'bg-[#070709] border-white/[0.04]' :
                             'bg-[#070709] border-white/[0.08]'
                           }`}>
                            {isCompleted ? (
                              <Check className="w-2.5 h-2.5 text-[#74B6A0]" strokeWidth={3} />
                            ) : assignedPractice ? (
                              <div className={`${isSkipped ? 'text-white/10' : 'text-white/40'}`}>{getPracticeIcon(assignedPractice)}</div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            )}
                          </div>
                        </div>

                        {/* Column 3: Custom Card Content */}
                        <div className="flex-1 min-w-0 pr-1 pl-1">
                          <AnimatePresence mode="wait">
                            {isEditing ? (
                              <motion.div 
                                key="edit-slot-form"
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="p-3.5 bg-[#121216]/90 border border-white/[0.08] rounded-xl flex flex-col gap-2.5 shadow-2xl backdrop-blur-md overflow-hidden"
                              >
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowEditTimePicker(true)}
                                    className="w-16 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs tabular-nums text-[#F2EFE8]/80 text-left hover:border-white/[0.12] focus:outline-none focus:border-white/[0.12] transition-colors"
                                  >
                                    {normalizeTime(editTime, slot.time)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowEditPracticeModal(true)}
                                    className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-[#F2EFE8]/70 text-left min-w-0 truncate hover:border-white/[0.12] transition-colors"
                                  >
                                    {editPracticeId ? practices.find(p => p.id === editPracticeId)?.title || '—' : 'Выбрать...'}
                                  </button>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                                  <button onClick={() => handleDeleteSlot(slot.id)} className="px-2.5 py-1.5 text-[12px] font-medium text-[#C56855]/70 hover:text-[#C56855] transition-colors">Удалить</button>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingSlotId(null)} className="px-2.5 py-1.5 text-[12px] text-[#F2EFE8]/50 hover:text-[#F2EFE8]/70 transition-colors">Отмена</button>
                                    <button onClick={() => handleSaveSlotEdit(slot.id)} className="px-3.5 py-1.5 bg-white/10 text-[#F2EFE8]/90 hover:bg-white/15 rounded-lg text-[12px] font-medium active:scale-[0.97] transition-transform duration-[160ms] ease-out">Сохранить</button>
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="slot-display-card"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`group flex items-start justify-between rounded-xl px-3.5 py-3 border transition-all ${
                                  isActive 
                                    ? 'bg-white/[0.04] border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.25)]' 
                                    : isCompleted 
                                      ? 'bg-white/[0.01] border-white/[0.02] opacity-80'
                                      : 'bg-[#121216]/40 border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.06]'
                                }`}
                              >
                                <div className="flex flex-col min-w-0 text-left gap-0.5">
                                  {assignedPractice && (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] tracking-wide ${isSkipped ? 'text-[#F2EFE8]/20' : isCompleted ? 'text-[#F2EFE8]/30 line-through' : 'text-[#F2EFE8]/42'}`}>
                                          {assignedPractice.mood} · {assignedPractice.duration}
                                        </span>
                                        {isActive && (
                                          <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide" style={{ color: accentColor }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                                            Сейчас
                                          </span>
                                        )}
                                        {isCompleted && (
                                          <span className="text-[10px] text-[#74B6A0]/80">Выполнено</span>
                                        )}
                                        {isSkipped && (
                                          <span className="text-[10px] text-[#F2EFE8]/25">Пропущено</span>
                                        )}
                                      </div>
                                      <span 
                                        onClick={() => canInteract && onSelectPractice(assignedPractice, { timelineSlotId: slot.id })}
                                        className={`text-[15px] font-medium mt-0.5 leading-snug ${
                                          canInteract ? 'text-[#F2EFE8]/95 active:text-[#F2EFE8] cursor-pointer transition-colors' :
                                          isSkipped ? 'text-[#F2EFE8]/25' :
                                          isCompleted ? 'text-[#F2EFE8]/45 line-through' :
                                          'text-[#F2EFE8]/60'
                                        }`}
                                      >
                                        {assignedPractice.title}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <button 
                                  onClick={() => { setEditingSlotId(slot.id); setEditTime(slot.time); setEditTimePracticeId(slot.practiceId); }} 
                                  className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex-shrink-0 opacity-40 group-hover:opacity-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-white/50" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
              </motion.div>

              {/* Align forms and the "Add Slot" button perfectly with the right column */}
              <div className="pl-[73px]">
                <AnimatePresence mode="wait">
                  {isAddingSlot ? (
                    <motion.form 
                      key="add-slot-form"
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      onSubmit={handleAddSlot} 
                      className="p-3.5 bg-[#121216]/90 border border-white/[0.08] rounded-xl flex flex-col gap-3.5 shadow-2xl backdrop-blur-md overflow-hidden text-left"
                    >
                      <span className="text-[13px] text-[#F2EFE8]/42">Новый слот</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-[#F2EFE8]/35">Время</label>
                          <button
                            type="button"
                            onClick={() => setShowNewTimePicker(true)}
                            className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs tabular-nums text-[#F2EFE8]/80 text-left hover:border-white/[0.12] focus:outline-none focus:border-white/[0.12] transition-colors"
                          >
                            {normalizeTime(newSlotTime, '14:00')}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-[#F2EFE8]/35">Ритуал</label>
                          <button
                            type="button"
                            onClick={() => setShowNewPracticeModal(true)}
                            className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-[#F2EFE8]/70 text-left truncate hover:border-white/[0.12] transition-colors"
                          >
                            {newSlotPracticeId ? practices.find(p => p.id === newSlotPracticeId)?.title || '—' : 'Выбрать...'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.04]">
                        <button type="button" onClick={() => setIsAddingSlot(false)} className="px-2.5 py-1.5 text-[12px] text-[#F2EFE8]/50 hover:text-[#F2EFE8]/70 transition-colors">Отмена</button>
                        <button type="submit" className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-[#F2EFE8]/90 rounded-lg text-[12px] font-medium active:scale-[0.97] transition-transform duration-[160ms] ease-out">Добавить</button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button 
                      key="add-slot-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setIsAddingSlot(true)} 
                      className="w-full py-2.5 border border-dashed border-white/[0.06] hover:border-white/[0.12] bg-white/[0.01] hover:bg-white/[0.02] rounded-xl flex items-center justify-center gap-2 text-[11px] text-white/40 hover:text-white/65 transition-all font-semibold shadow-inner"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить слот
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </section>
              </div>
            </section>


          </motion.div>
        )}

        {currentPage === 1 && (
          <motion.div 
            key="page-reading" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            transition={{ duration: 0.3 }} 
            className="flex flex-col gap-4"
          >
            {/* Reading progress header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[13px] text-[#F2EFE8]/42 font-medium">Библиотека знаний</span>
              <span className="text-[13px] text-[#F2EFE8]/30 tabular-nums">
                {completedArticles.length} из {ARTICLES.length} изучено
              </span>
            </div>

            {/* Progress indicator line */}
            <div className="h-[2px] w-full bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedArticles.length / ARTICLES.length) * 100}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {ARTICLES.map((art) => {
                const isCompleted = completedArticles.includes(art.id);
                return (
                  <div 
                    key={art.id} 
                    onClick={() => {
                      setSelectedArticleId(art.id);
                      setScrollProgress(0);
                    }}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isCompleted 
                        ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.04]' 
                        : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-medium tracking-wide transition-all duration-300 ${
                        isCompleted ? 'bg-[#74B6A0]/10 border border-[#74B6A0]/20 text-[#74B6A0]/90' : 'bg-white/[0.03] border border-white/[0.05] text-[#F2EFE8]/45'
                      }`}>
                        {art.category.slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[15px] font-medium truncate ${
                            isCompleted ? 'text-[#F2EFE8]/55' : 'text-[#F2EFE8]/90 group-hover:text-[#F2EFE8]'
                          }`}>
                            {art.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#F2EFE8]/40 font-medium truncate">
                          {art.subtitle}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[#F2EFE8]/30 mt-0.5">
                          <span className="text-[#F2EFE8]/40">{art.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {art.readTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center pl-2">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-[#74B6A0]/10 border border-[#74B6A0]/25 flex items-center justify-center text-[#74B6A0]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-[#F2EFE8]/25 group-hover:text-[#F2EFE8]/50 group-hover:border-white/15 transition-all duration-300">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FULL HEALTH MODAL ===== */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isHealthOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-[#08090A] flex flex-col overscroll-none select-none"
              onContextMenu={(event) => event.preventDefault()}
            >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(242,239,232,0.08),transparent_72%)]"
            />
            <header className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] flex justify-end pointer-events-none">
              <button
                type="button"
                aria-label="Закрыть"
                onClick={closeHealthOverlay}
                className="pointer-events-auto w-11 h-11 shrink-0 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
              >
                <X className="w-4 h-4 text-[#F2EFE8]/50" />
              </button>
            </header>

            <main
              ref={healthMainRef}
              className="relative flex-1 w-full max-w-md mx-auto pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] overflow-y-auto hide-scrollbar px-5"
            >
              <div key={healthSection} className="animate-section-fade">
                {healthSection === 'shine' && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center pt-2">
                      <span
                        className="text-[13px] py-1.5 px-4 rounded-full border border-white/10 text-[#F2EFE8]/70"
                        style={{ borderColor: `${accentColor}44`, color: accentColor }}
                      >
                        {dailyFocus ? `«${dailyFocus}»` : status.title}
                      </span>
                      {dataQuality !== 'none' ? (
                        <>
                          <span
                            className="font-display text-[88px] font-light leading-none tabular-nums mt-6"
                            style={{ color: accentColor }}
                          >
                            {shineScore}
                          </span>
                          <span className="text-[13px] text-[#F2EFE8]/70 mt-2">Сияние</span>
                          <span className="text-[13px] text-[#F2EFE8]/42 mt-1">
                            {dataQuality === 'full' ? 'Полный набор данных' :
                             dataQuality === 'partial' ? 'Частичные данные' : 'Минимальные данные'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-display text-[88px] font-light leading-none text-[#F2EFE8]/35 mt-6">—</span>
                          <span className="text-[13px] text-[#F2EFE8]/70 mt-2">Сияние</span>
                          <span className="text-[13px] text-[#F2EFE8]/42 mt-1">Подключите данные для расчёта</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06] w-full max-w-[280px] mx-auto">
                      <button
                        type="button"
                        onClick={() => setShowNarrative(true)}
                        className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-colors duration-[160ms] ${showNarrative ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'}`}
                      >
                        Нарратив
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNarrative(false)}
                        className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-colors duration-[160ms] ${!showNarrative ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'}`}
                      >
                        Статистика
                      </button>
                    </div>

                    {healthSource === 'none' && !dashboardHasRing && (
                      <HealthGroup padded>
                        <span className="text-[15px] text-[#F2EFE8]/90 block">Данные здоровья</span>
                        <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed mt-2 mb-4">
                          Подключите Apple Health / Health Connect или {CORE_NAME} для расчёта Сияния.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleConnectHealth} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-[13px] text-[#F2EFE8]/70 active:scale-[0.97] transition-transform">
                            <Smartphone className="w-3.5 h-3.5" />
                            Подключить
                          </button>
                          <button type="button" onClick={() => window.open('https://ritual.store', '_blank')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[#C59A55]/10 border border-[#C59A55]/20 text-[13px] text-[#C59A55] active:scale-[0.97] transition-transform">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {CORE_NAME}
                          </button>
                        </div>
                      </HealthGroup>
                    )}

                    {showNarrative ? (
                      <>
                        <HealthGroup
                          onClick={() => { if (!isFocusLockedToday) openIntentionModal(); }}
                          padded
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-[#F2EFE8]/50">Намерение дня</span>
                            {!isFocusLockedToday ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openIntentionModal(); }}
                                className="text-[13px] text-[#F2EFE8]/50"
                              >
                                Изменить
                              </button>
                            ) : (
                              <span className="text-[13px] text-[#F2EFE8]/30 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Зафиксировано
                              </span>
                            )}
                          </div>
                          <p className="font-display text-[22px] font-light text-[#F2EFE8]/90 italic leading-snug mt-3">
                            «{dailyFocus || 'Твоё намерение на день'}»
                          </p>
                          {isFocusLockedToday && (
                            <span className="text-[13px] text-[#F2EFE8]/30 mt-2 block">Следующий выбор — завтра</span>
                          )}
                        </HealthGroup>

                        <div className="flex flex-col gap-3 px-1">
                          <p className="text-[15px] font-medium" style={{ color: accentColor }}>
                            {status.title}
                          </p>
                          <p className="text-[15px] text-[#F2EFE8]/60 leading-relaxed">
                            Ночной сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}.
                            {' '}ВСР {healthMetrics.hrv !== null ? `${metricHrv} мс` : 'данные недоступны'}
                            {healthMetrics.hrv !== null ? ' — адаптивность нервной системы' : ''}.
                          </p>
                          <p className="text-[15px] text-[#F2EFE8]/42 leading-relaxed">
                            Рекомендация: {recommendedPractice ? `«${recommendedPractice.title}»` : 'мягкий вечерний ритуал или дыхательная сессия.'}
                          </p>
                        </div>

                        <HealthMetricsStack
                          items={healthMetricCards}
                          shine={shine}
                          getSparklinePoints={(uiKey) =>
                            getAvailableMetricPoints(uiKey, 7).map(point => point.value as number)
                          }
                          formatValue={formatDriverCardValue}
                          onMetricPress={(uiKey, hasValue) => {
                            if (hasValue) openMetricDetail(uiKey);
                            else handleConnectHealth();
                          }}
                          primaryCardRef={primaryDriverCardRef}
                          defaultExpandPrimary
                        />
                        {showCycleSection && (
                          <HealthGroup>
                            <button
                              type="button"
                              onClick={() => openHealthSection('cycle')}
                              className="flex items-center justify-between py-4 w-full text-left active:opacity-80 transition-opacity duration-[160ms]"
                            >
                              <span className="text-[13px] text-[#F2EFE8]/50">
                                {isPregnancyMode ? 'Беременность' : 'Цикл'}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-[15px] text-[#F2EFE8]/80">
                                  {isPregnancyMode
                                    ? 'Второй триместр'
                                    : `${CYCLE_PHASE_LABEL[cyclePhase] ?? 'Фаза'}, ${cycleDay}-й день`}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25" />
                              </span>
                            </button>
                          </HealthGroup>
                        )}
                    </>
                  ) : (
                    (() => {
                      const shineDays = getHistoricalAnalytics(analyticsPeriod);
                      const selectedIndex = selectedTrendDay !== null && selectedTrendDay < shineDays.length
                        ? selectedTrendDay
                        : Math.max(0, shineDays.length - 1);
                      const currentSelectedDay = shineDays[selectedIndex];
                      const dayPractices = currentSelectedDay
                        ? stats.history.filter(h => normalizeHistoryDate(h.date) === currentSelectedDay.dateStr)
                        : [];
                      return (
                        <>
                          <ShineTrendPanel
                            period={analyticsPeriod}
                            onPeriodChange={(key) => {
                              setAnalyticsPeriod(key);
                              setSelectedTrendDay(null);
                            }}
                            selectedIndex={selectedIndex}
                            onSelectDay={setSelectedTrendDay}
                            days={shineDays}
                            dayPractices={dayPractices}
                            accentColor={accentColor}
                            practiceBarMax={maxBars}
                          />
                          <HealthStatisticsOverview
                            shine={shine}
                            healthMetrics={healthMetrics}
                            hasRing={dashboardHasRing}
                            metricItems={healthMetricCards}
                            getSparklinePoints={(uiKey) =>
                              getAvailableMetricPoints(uiKey, 7).map(point => point.value as number)
                            }
                            formatValue={formatDriverCardValue}
                            onOpenSection={openHealthSection}
                            onMetricPress={(uiKey, hasValue) => {
                              if (hasValue) openMetricDetail(uiKey);
                              else handleConnectHealth();
                            }}
                          />
                        </>
                      );
                    })()
                    )}
                  </div>
                )}

                {healthSection === 'sleep' && (                  <div>
                    <HealthSleepScreen
                      period={categoryPeriod}
                      onPeriodChange={setCategoryPeriod}
                      selectedDate={selectedHealthDate}
                      onSelectedDateChange={setSelectedHealthDate}
                      hasRing={dashboardHasRing}
                      healthMetrics={healthMetrics}
                      historySleep={historyByMetric.sleepHours}
                      accentColor={accentColor}
                      shine={shine}
                    />
                  </div>
                )}

                {healthSection === 'recovery' && (
                  <div>
                    <HealthRecoveryScreen
                      period={categoryPeriod}
                      onPeriodChange={setCategoryPeriod}
                      selectedDate={selectedHealthDate}
                      onSelectedDateChange={setSelectedHealthDate}
                      hasRing={dashboardHasRing}
                      healthMetrics={healthMetrics}
                      historyHrv={historyByMetric.hrv}
                      historyHr={historyByMetric.restingHR}
                      accentColor={accentColor}
                    />
                  </div>
                )}

                {healthSection === 'activity' && (
                  <div>
                    <HealthActivityScreen
                      period={categoryPeriod}
                      onPeriodChange={setCategoryPeriod}
                      selectedDate={selectedHealthDate}
                      onSelectedDateChange={setSelectedHealthDate}
                      hasRing={dashboardHasRing}
                      healthMetrics={healthMetrics}
                      historySteps={historyByMetric.steps}
                      accentColor={accentColor}
                    />
                  </div>
                )}

                {healthSection === 'body' && (
                  <div>
                    <HealthBodyScreen
                      period={categoryPeriod}
                      onPeriodChange={setCategoryPeriod}
                      selectedDate={selectedHealthDate}
                      onSelectedDateChange={setSelectedHealthDate}
                      hasRing={dashboardHasRing}
                      healthMetrics={healthMetrics}
                      historySpo2={historyByMetric.spo2}
                      historyTemp={historyByMetric.temperature}
                      historyResp={historyByMetric.respiratoryRate}
                    />
                  </div>
                )}

                {healthSection === 'cycle' && showCycleSection && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col pt-2">
                      <span className="font-display text-[40px] font-light leading-tight text-[#F2EFE8]/92">
                        {isPregnancyMode
                          ? 'Второй триместр'
                          : `${CYCLE_PHASE_LABEL[cyclePhase] ?? 'Фаза'}`}
                      </span>
                      {!isPregnancyMode && (
                        <span className="text-[15px] text-[#F2EFE8]/42 mt-1 tabular-nums">{cycleDay}-й день</span>
                      )}
                    </div>

                    <p className="text-[15px] text-[#F2EFE8]/70 leading-relaxed">
                      {isPregnancyMode
                        ? 'Организм адаптируется. Гормональный фон выравнивается, самочувствие обычно становится ровнее. Держите нагрузку мягкой и выбирайте ритуалы восстановления.'
                        : cyclePhase === 'follicular'
                          ? 'Эстроген растёт. Растут энергия и ясность ума — хороший момент для практик внимания и более активных ритуалов.'
                          : cyclePhase === 'luteal'
                            ? 'Прогестерон перестраивает организм на сохранение энергии. Сегодня лучше мягкая нагрузка и вечернее замедление.'
                            : cyclePhase === 'ovulatory'
                              ? 'Эстроген и тестостерон максимально активны. Отличное время для активных ритуалов и ясного намерения.'
                              : 'Эстроген и прогестерон на минимуме. Организм занят обновлением — выбирайте лёгкие ритуалы и тепло.'}
                    </p>

                    <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed">
                      Рекомендация: {isPregnancyMode
                        ? '«Сканирование тела» или «Точка спокойствия».'
                        : cyclePhase === 'follicular'
                          ? '«Утреннее пробуждение» или «Квадратное дыхание».'
                          : cyclePhase === 'luteal'
                            ? 'Мягкие ритуалы «Тишины» и «Дыхание 4-7-8».'
                            : cyclePhase === 'ovulatory'
                              ? 'Активные ритуалы из «Энергии» или «Ясности».'
                              : '«Самосострадание» или «Точка спокойствия».'}
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsCycleOpen(true)}
                      className="flex items-center justify-between py-4 border-y border-[rgba(242,239,232,0.12)] w-full text-left active:scale-[0.99] transition-transform duration-[160ms]"
                    >
                      <span className="text-[13px] text-[#F2EFE8]/42">Настройки цикла</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] text-[#F2EFE8]/70">Изменить фазу</span>
                        <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25" />
                      </span>
                    </button>
                  </div>
                )}

                {healthSection === 'ring' && dashboardHasRing && (
                  <div className="flex flex-col">
                    <RitualRingAnalytics />
                  </div>
                )}
              </div>
            </main>

            <nav
              aria-label="Разделы здоровья"
              className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20 pointer-events-none"
            >
              <div
                role="tablist"
                className="pointer-events-auto flex items-center h-[52px] px-1.5 bg-[#111114]/90 backdrop-blur-xl rounded-full border border-white/[0.06] overflow-x-auto hide-scrollbar overscroll-x-contain touch-pan-x"
              >
                {healthNavItems.map((item) => {
                  const isActive = healthSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => { healthPillRefs.current[item.id] = el; }}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => openHealthSection(item.id)}
                      className={`relative flex flex-col items-center justify-center gap-[2px] shrink-0 h-11 min-w-[4.5rem] px-3.5 transition-colors duration-[160ms] ease-out ${
                        isActive ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="health-overlay-tab-pill"
                          className="absolute inset-y-0.5 inset-x-1 rounded-full bg-white/[0.10]"
                          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                        />
                      )}
                      <Icon className="relative w-[17px] h-[17px]" strokeWidth={2.5} />
                      <span className="relative whitespace-nowrap text-[9px] font-medium tracking-wide">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ===== CYCLE BOTTOM SHEET ===== */}
      <AnimatePresence>
        {isCycleOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-end justify-center">
            <div className="absolute inset-0" onClick={() => setIsCycleOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 220 }} className="w-full max-w-md bg-[#111114] border-t border-white/[0.06] rounded-t-[32px] p-6 pb-12 relative z-10">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h4 className="text-base font-medium text-white/90">Настройки цикла</h4>
                  <p className="text-xs text-white/60 mt-0.5">Параметры биометрии</p>
                </div>
                <button onClick={() => setIsCycleOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
                  <div className="flex flex-col">
                    <span className="text-xs text-white/70">Режим «Беременность»</span>
                    <span className="text-[10px] text-white/60">Безопасные ритуалы</span>
                  </div>
                  <button onClick={() => setIsPregnancyMode(!isPregnancyMode)} className={`py-1 px-3 rounded-full text-[10px] border transition-all ${isPregnancyMode ? 'bg-white/10 border-white/10 text-white/90 font-medium' : 'bg-white/[0.04] border-white/[0.04] text-white/40'}`}>
                    {isPregnancyMode ? 'Вкл' : 'Выкл'}
                  </button>
                </div>

              <AnimatePresence initial={false} mode="wait">
                  {!isPregnancyMode && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden flex flex-col gap-5"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-white/60 uppercase tracking-wider">Фаза</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[{ key: 'menstrual', title: 'Менструальная' }, { key: 'follicular', title: 'Фолликулярная' }, { key: 'ovulatory', title: 'Овуляторная' }, { key: 'luteal', title: 'Лютеиновая' }].map(phase => (
                            <button key={phase.key} onClick={() => setCyclePhase(phase.key)} className={`py-1.5 rounded-lg text-[10px] border transition-all ${cyclePhase === phase.key ? 'bg-white/[0.08] border-white/[0.12] text-white/80' : 'bg-white/[0.03] border-white/[0.04] text-white/60'}`}>
                              {phase.title}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">День цикла</span>
                          <span className="text-white/80">{cycleDay}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.04] rounded-xl p-2">
                          <button onClick={() => setCycleDay(prev => Math.max(1, prev - 1))} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:bg-white/[0.08]">-</button>
                          <span className="text-sm text-white/80">{cycleDay}</span>
                          <button onClick={() => setCycleDay(prev => Math.min(30, prev + 1))} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:bg-white/[0.08]">+</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={() => setIsCycleOpen(false)} className="w-full py-3 bg-white/10 text-white/90 font-medium rounded-xl text-xs active:scale-95 transition-transform">
                  Применить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectHealthModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnectHealth={handleConnectHealth}
        isConnecting={isHealthConnecting}
        status={healthConnectStep}
      />

      <TimePickerModal
        isOpen={showEditTimePicker}
        title="Время практики"
        subtitle="Выберите, когда напомнить о ритуале"
        value={editTime}
        defaultValue="08:00"
        minuteStep={5}
        onClose={() => setShowEditTimePicker(false)}
        onConfirm={(value) => {
          setEditTime(value);
          setShowEditTimePicker(false);
        }}
      />

      <TimePickerModal
        isOpen={showNewTimePicker}
        title="Новый слот"
        subtitle="Время появится в таймлайне дня"
        value={newSlotTime}
        defaultValue="14:00"
        minuteStep={5}
        onClose={() => setShowNewTimePicker(false)}
        onConfirm={(value) => {
          setNewSlotTime(value);
          setShowNewTimePicker(false);
        }}
      />

      <SelectModal
        isOpen={showEditPracticeModal}
        onClose={() => setShowEditPracticeModal(false)}
        title="Выберите практику"
        options={practices.map(p => {
          const moodMap: Record<string, string> = {
            'Энергия': 'energiya',
            'Сила': 'energiya',
            'Покой': 'tishina',
            'Сон': 'tishina',
            'Баланс': 'istok',
            'Уверенность': 'istok',
            'Фокус': 'yasnost',
          };
          return {
            value: p.id,
            label: p.title,
            category: moodMap[p.mood] || 'istok'
          };
        })}
        selectedValue={editPracticeId}
        onSelect={(v) => setEditTimePracticeId(v)}
      />

      <SelectModal
        isOpen={showNewPracticeModal}
        onClose={() => setShowNewPracticeModal(false)}
        title="Выберите практику"
        options={practices.map(p => {
          const moodMap: Record<string, string> = {
            'Энергия': 'energiya',
            'Сила': 'energiya',
            'Покой': 'tishina',
            'Сон': 'tishina',
            'Баланс': 'istok',
            'Уверенность': 'istok',
            'Фокус': 'yasnost',
          };
          return {
            value: p.id,
            label: p.title,
            category: moodMap[p.mood] || 'istok'
          };
        })}
        selectedValue={newSlotPracticeId}
        onSelect={(v) => setNewSlotPracticeId(v)}
      />

      {/* ===== INTENTION SELECTION MODAL ===== */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isIntentionModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 backdrop-blur-md overscroll-none"
            >
              <div className="absolute inset-0" onClick={() => setIsIntentionModalOpen(false)} aria-hidden="true" />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="relative w-full max-w-md z-10 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
              >
                <GlassSurface className="rounded-t-[28px] rounded-b-[20px] px-5 pt-5 pb-6 flex flex-col gap-5 text-center">
                  <div className="w-10 h-1 bg-white/10 rounded-full mx-auto" />

                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-[#F2EFE8]/42">Намерение на день</span>
                    <button
                      type="button"
                      onClick={() => setIsIntentionModalOpen(false)}
                      aria-label="Закрыть"
                      className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#F2EFE8]/50 active:scale-[0.97] transition-transform duration-[160ms]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-4 py-2 min-h-[120px] justify-center">
                    <span
                      className="text-[13px] py-1.5 px-3 rounded-full border border-white/10"
                      style={{ borderColor: `${accentColor}44`, color: accentColor }}
                    >
                      Рекомендация · Сияние {shineScore}%
                    </span>

                    {isCustomInput ? (
                      <div className="w-full flex flex-col gap-2 text-left">
                        <textarea
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder="Напишите своё намерение на сегодня..."
                          maxLength={100}
                          rows={3}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-[18px] p-4 text-[15px] text-[#F2EFE8]/90 placeholder:text-[#F2EFE8]/25 focus:outline-none focus:border-white/20 resize-none"
                          autoFocus
                        />
                        <span className="text-[11px] text-[#F2EFE8]/30 self-end">
                          {customText.length}/100
                        </span>
                      </div>
                    ) : (
                      <motion.p
                        key={modalIntention}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-display text-[22px] font-light italic text-[#F2EFE8]/90 leading-snug px-2"
                      >
                        «{modalIntention}»
                      </motion.p>
                    )}
                  </div>

                  <GlassSurface className="p-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={handleNextIntention}
                      className="py-3 rounded-[18px] text-[13px] font-medium text-[#F2EFE8]/70 active:scale-[0.97] transition-transform duration-[160ms]"
                    >
                      Другое
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomInput(true)}
                      className={`py-3 rounded-[18px] text-[13px] font-medium transition-colors duration-[160ms] ${
                        isCustomInput ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'
                      }`}
                    >
                      Написать своё
                    </button>
                  </GlassSurface>

                  <button
                    type="button"
                    onClick={() => {
                      const selectedText = isCustomInput ? customText.trim() : modalIntention;
                      if (selectedText) {
                        setDailyFocus(selectedText);
                        const todayStr = getTodayDateString();
                        localStorage.setItem('ritual_day_focus', selectedText);
                        localStorage.setItem('ritual_day_focus_date', todayStr);
                        const presetId = isCustomInput ? null : getPresetIntentionId(selectedText);
                        if (presetId) {
                          localStorage.setItem('ritual_day_focus_preset_id', presetId);
                        } else {
                          localStorage.removeItem('ritual_day_focus_preset_id');
                        }
                        setFocusDate(todayStr);
                        localStorage.removeItem('ritual_reflection_date');
                        localStorage.removeItem('ritual_reflection_answer');
                        localStorage.removeItem('ritual_reflection_reaction');
                        setReflection({ answer: null, reactionText: '' });
                        requestPrivacySafeSync();
                      }
                      setIsIntentionModalOpen(false);
                    }}
                    disabled={isCustomInput && !customText.trim()}
                    className="w-full h-12 rounded-[18px] bg-[#F2EFE8] text-[#08090A] text-[15px] font-medium active:scale-[0.97] transition-transform duration-[160ms] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Подтвердить
                  </button>
                </GlassSurface>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ===== FULLSCREEN READING MODE OVERLAY ===== */}
      <AnimatePresence>
        {activeArticle && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-[#08090A] text-[#F2EFE8] flex flex-col w-full max-w-md left-1/2 -translate-x-1/2 overflow-hidden border-x border-white/[0.04]"
          >
            {/* Top Header */}
            <header className="px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 flex items-center justify-between border-b border-white/[0.04] bg-[#08090A]/85 backdrop-blur-xl z-20">
              <button
                onClick={() => {
                  setSelectedArticleId(null);
                  setScrollProgress(0);
                }}
                className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-white/80" />
              </button>

              {/* Font controls in the header */}
              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] p-1 rounded-full">
                <button
                  onClick={() => setReaderFontSize(prev => Math.max(12, prev - 1))}
                  disabled={readerFontSize <= 12}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-xs text-white/60 hover:text-white/90 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-mono"
                  title="Уменьшить шрифт"
                >
                  A-
                </button>
                <div className="w-[1px] h-3.5 bg-white/[0.08]" />
                <button
                  onClick={() => setReaderFontSize(prev => Math.min(24, prev + 1))}
                  disabled={readerFontSize >= 24}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-xs text-white/60 hover:text-white/90 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-mono"
                  title="Увеличить шрифт"
                >
                  A+
                </button>
              </div>

              {/* Read completion toggle */}
              <button
                onClick={() => {
                  const isCompleted = completedArticles.includes(activeArticle.id);
                  if (isCompleted) {
                    setCompletedArticles(prev => prev.filter(id => id !== activeArticle.id));
                  } else {
                    setCompletedArticles(prev => [...prev, activeArticle.id]);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-[160ms] active:scale-[0.97] ${
                  completedArticles.includes(activeArticle.id)
                    ? 'bg-[#74B6A0]/[0.12] border border-[#74B6A0]/25 text-[#74B6A0]'
                    : 'bg-white/[0.05] border border-white/10 text-[#F2EFE8]/60'
                }`}
              >
                {completedArticles.includes(activeArticle.id) ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Изучено
                  </>
                ) : (
                  'Изучить'
                )}
              </button>
            </header>

            {/* Progress Bar */}
            <div className="relative w-full h-[2px] bg-white/[0.03] z-20">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
                style={{ width: `${scrollProgress}%`, backgroundColor: accentColor }}
              />
            </div>

            {/* Article Content */}
            <div
              className="flex-1 overflow-y-auto px-6 py-8 hide-scrollbar scroll-smooth"
              onScroll={(e) => {
                const target = e.currentTarget;
                const totalScroll = target.scrollHeight - target.clientHeight;
                if (totalScroll <= 0) {
                  setScrollProgress(0);
                } else {
                  const progress = (target.scrollTop / totalScroll) * 100;
                  setScrollProgress(Math.min(100, Math.max(0, Math.round(progress))));
                }
              }}
            >
              <div className="max-w-sm mx-auto flex flex-col gap-8 pb-20">
                {/* Header info */}
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] tracking-wide text-[#F2EFE8]/45 bg-white/[0.05] px-2.5 py-1 rounded-full self-start">
                    {activeArticle.category}
                  </span>
                  <h1 className="font-display text-[28px] font-light leading-[1.15] text-[#F2EFE8] mt-1">
                    {activeArticle.title}
                  </h1>
                  <p className="text-[15px] text-[#F2EFE8]/40 italic leading-relaxed">
                    {activeArticle.subtitle}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-[#F2EFE8]/30 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {activeArticle.readTime}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/[0.05]" />

                {/* Sections */}
                <div className="flex flex-col gap-8">
                  {activeArticle.content.map((sec, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-4">
                      {sec.sectionTitle && (
                        <h2 className="font-display text-[20px] font-normal text-[#F2EFE8]/92">
                          {sec.sectionTitle}
                        </h2>
                      )}
                      {sec.paragraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-[#F2EFE8]/75 leading-relaxed font-normal text-justify"
                          style={{ fontSize: `${readerFontSize}px` }}
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Bottom Completion Banner */}
                <div className="mt-12 p-6 rounded-2xl bg-white/[0.015] border border-white/[0.04] text-center flex flex-col items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    completedArticles.includes(activeArticle.id)
                      ? 'bg-[#74B6A0]/[0.12] border border-[#74B6A0]/25 text-[#74B6A0]'
                      : 'bg-white/[0.02] border border-white/[0.05] text-[#F2EFE8]/30'
                  }`}>
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[15px] font-medium text-[#F2EFE8]/90">
                      {completedArticles.includes(activeArticle.id)
                        ? 'Вы изучили этот материал!'
                        : 'Завершить чтение'}
                    </h3>
                    <p className="text-[11px] text-[#F2EFE8]/40 leading-normal max-w-[220px] mx-auto">
                      {completedArticles.includes(activeArticle.id)
                        ? 'Статья добавлена в список изученных вами тем.'
                        : 'Отметьте статью, чтобы отслеживать свой прогресс.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const isCompleted = completedArticles.includes(activeArticle.id);
                      if (isCompleted) {
                        setCompletedArticles(prev => prev.filter(id => id !== activeArticle.id));
                      } else {
                        setCompletedArticles(prev => [...prev, activeArticle.id]);
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-[13px] font-medium active:scale-[0.97] transition-transform duration-[160ms] ease-out ${
                      completedArticles.includes(activeArticle.id)
                        ? 'bg-white/[0.04] text-[#F2EFE8]/55 border border-white/[0.06]'
                        : 'bg-[#F2EFE8] text-[#08090A]'
                    }`}
                  >
                    {completedArticles.includes(activeArticle.id)
                      ? 'Снять отметку'
                      : 'Отметить как изученное'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lockedMetric && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-xl flex items-end justify-center p-4"
            onClick={() => setLockedMetric(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#111114] p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#F2EFE8]/45" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-[#F2EFE8]/92">{lockedMetric.title}</h3>
                    <p className="text-[11px] text-[#F2EFE8]/42">{getAvailabilityLabel(lockedMetric.status)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLockedMetric(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-[#F2EFE8]/45 active:scale-[0.94] transition-transform duration-[160ms]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[13px] text-[#F2EFE8]/55 leading-relaxed">
                {dashboardHasRing
                  ? lockedMetric.status === 'unsupported'
                    ? `${CORE_NAME} подключено, но эта модель или версия прошивки не передаёт выбранный показатель.`
                    : `${CORE_NAME} подключено. За последние 7 дней этот показатель не передавался. Запустите синхронизацию и проверьте посадку кольца.`
                  : lockedMetric.status === 'permission_denied'
                  ? 'Разрешите чтение этого показателя в Apple Health или Google Health Connect, затем обновите синхронизацию.'
                  : lockedMetric.status === 'no_recent_data'
                    ? 'Интеграция подключена, но за последние 7 дней этот показатель не передавался.'
                    : lockedMetric.status === 'unsupported'
                      ? 'Текущее устройство или источник здоровья не поддерживает этот показатель.'
                      : 'Этот показатель пока недоступен из подключенных источников.'}
              </p>

              {dashboardHasRing ? (
                <button
                  onClick={async () => {
                    setLockedMetric(null);
                    await refreshDashboardHealth();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-[13px] font-medium text-[#F2EFE8]/75 active:scale-[0.97] transition-transform duration-[160ms] ease-out"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Синхронизировать {CORE_NAME}
                </button>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setLockedMetric(null);
                    handleConnectHealth();
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-[13px] font-medium text-[#F2EFE8]/75 active:scale-[0.97] transition-transform duration-[160ms] ease-out"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Подключить
                </button>
                <button
                  onClick={() => window.open('https://ritual.store', '_blank')}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#C59A55]/10 border border-[#C59A55]/20 text-[13px] font-medium text-[#C59A55] active:scale-[0.97] transition-transform duration-[160ms] ease-out"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Купить кольцо
                </button>
              </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
