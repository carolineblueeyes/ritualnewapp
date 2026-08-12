import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Edit2, X, Check,
  Moon, Sun, Zap, Activity, Wind, Sparkle, Sparkles, Heart, Eye, Thermometer,
  ShoppingBag, Smartphone, Lock, ChevronRight, BookOpen, Clock, ArrowLeft, RefreshCw
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
import { ShineBreakdown, calculateShine, getShineLabel, getShineAccentColor } from '../services/health/shine';
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
    if (sleepHours === null || sleepHours === undefined) return 'Подключите источник здоровья, чтобы Ritual собрал ночной ритм.';
    if (sleepHours >= 7.5 && (delta ?? 0) >= -0.25) return 'Сон держится в устойчивой зоне восстановления.';
    if (sleepHours >= 6.5) return 'Ночь близка к норме. Смотрите на тренд, а не на один день.';
    return 'Сон ниже личной нормы. Сегодня лучше выбрать мягкую нагрузку и вечерний ритуал.';
  };
  const [healthPage, setHealthPage] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7' | '30' | '90'>('30');
  const [showNarrative, setShowNarrative] = useState(true);
  const metricRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const metricHrv = healthMetrics.hrv;
  const metricSleep = healthMetrics.sleepHours;
  const metricActivity = healthMetrics.steps;
  const metricPulse = healthMetrics.restingHR;

  const openMetricDetail = (metricKey: string) => {
    setHealthPage(1);
    setExpandedMetric(metricKey);
  };

  useEffect(() => {
    if (healthPage !== 1 || !expandedMetric) return;
    const frame = requestAnimationFrame(() => {
      metricRowRefs.current[expandedMetric]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [healthPage, expandedMetric]);

  const mainSummaryMetrics: Array<{
    key: string;
    label: string;
    val: number | null | undefined;
    unit: string;
  }> = [
    { key: 'sleep', label: 'Сон', val: healthMetrics.sleepHours, unit: 'ч' },
    { key: 'activity', label: 'Активность', val: healthMetrics.steps, unit: 'шагов' },
    { key: 'hrv', label: 'ВСР', val: healthMetrics.hrv, unit: 'мс' },
    { key: 'hr', label: 'ЧСС покоя', val: healthMetrics.restingHR, unit: 'уд/м' },
  ];

  const formatSummaryValue = (key: string, val: number, unit: string) => {
    if (key === 'sleep' || unit === 'ч') {
      return `${Math.floor(val)}ч ${Math.round((val % 1) * 60)}м`;
    }
    if (key === 'activity' || unit === 'шагов') return Math.round(val).toLocaleString('ru-RU');
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
            className="flex flex-col gap-8"
          >
            {/* ===== AURORA HERO: SHINE ===== */}
            <section className="relative -mx-5 overflow-hidden">
              <div className="absolute inset-0 min-h-[400px]" aria-hidden="true">
                <SilkShaderBackground accentColor={accentColor} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08090A]" />
              </div>

              <button
                type="button"
                onClick={() => setIsHealthOpen(true)}
                aria-label="Открыть Ritual Health"
                className="relative z-10 w-full flex flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+4.25rem)] pb-10 cursor-pointer transition-transform duration-[160ms] ease-out active:scale-[0.99]"
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

            {/* ===== DIRECTION ===== */}
            <section className="flex flex-col items-center text-center -mt-4 px-2">
              <h2 className="font-display text-[28px] leading-[1.12] text-[#F2EFE8] text-balance max-w-[320px]">
                Что ты выбираешь сегодня?
              </h2>
            </section>

            {/* ===== RECOMMENDATION ===== */}
            <GlassSurface
              as="button"
              onClick={() => {
                if (!hasRingOrHealth && shineScore === 0) {
                  window.open('https://ritual.store', '_blank');
                  return;
                }
                onSelectPractice(recommendedPractice);
              }}
              className="p-5 flex items-center justify-between gap-4 min-h-[96px]"
            >
              <div className="flex flex-col items-start gap-1.5 min-w-0">
                <span className="text-[13px] text-[#F2EFE8]/45">Рекомендация</span>
                <span className="text-[20px] font-display text-[#F2EFE8] leading-tight text-left">
                  {!hasRingOrHealth && shineScore === 0
                    ? 'Полный опыт с Ritual Core'
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
                          <span className={`text-[11px] tabular-nums font-mono font-semibold tracking-tight ${isSkipped ? 'text-white/15' : 'text-white/50'}`}>{slot.time}</span>
                        </div>

                        {/* Column 2: Timeline node */}
                        <div className="flex-shrink-0 w-[26px] flex items-start justify-center pt-[9px] relative z-20">
                          <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all border ${
                            isCompleted ? 'bg-[#070709] border-emerald-400/30' :
                            isActive ? 'bg-[#070709] border-white/20' :
                            isSkipped ? 'bg-[#070709] border-white/[0.04]' :
                            'bg-[#070709] border-white/[0.08]'
                          }`}>
                            {isCompleted ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
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
                                    className="w-16 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs font-mono tabular-nums text-white/80 text-left hover:border-white/[0.12] focus:outline-none focus:border-white/[0.12] transition-colors"
                                  >
                                    {normalizeTime(editTime, slot.time)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowEditPracticeModal(true)}
                                    className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white/70 text-left min-w-0 truncate hover:border-white/[0.12] transition-colors"
                                  >
                                    {editPracticeId ? practices.find(p => p.id === editPracticeId)?.title || '—' : 'Выбрать...'}
                                  </button>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                                  <button onClick={() => handleDeleteSlot(slot.id)} className="px-2.5 py-1 text-[10px] font-medium text-rose-400/50 hover:text-rose-400 transition-colors">Удалить</button>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingSlotId(null)} className="px-2.5 py-1 text-[10px] text-white/50 hover:text-white/70">Отмена</button>
                                    <button onClick={() => handleSaveSlotEdit(slot.id)} className="px-3 py-1 bg-white/10 text-white/90 hover:bg-white/15 rounded-lg text-[10px] font-semibold transition-all">Сохранить</button>
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
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[9px] font-mono uppercase tracking-wider font-semibold ${isSkipped ? 'text-white/15' : isCompleted ? 'text-white/30 line-through' : 'text-white/45'}`}>
                                          {assignedPractice.mood} · {assignedPractice.duration}
                                        </span>
                                        {isActive && (
                                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full animate-pulse">Сейчас</span>
                                        )}
                                        {isCompleted && (
                                          <span className="text-[8px] font-mono font-semibold uppercase tracking-wider text-emerald-500/80 bg-emerald-500/5 px-1.5 py-0.5 rounded-full">Выполнено</span>
                                        )}
                                        {isSkipped && (
                                          <span className="text-[8px] font-mono font-semibold uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full">Пропущено</span>
                                        )}
                                      </div>
                                      <span 
                                        onClick={() => canInteract && onSelectPractice(assignedPractice, { timelineSlotId: slot.id })}
                                        className={`text-[13px] font-semibold mt-1 tracking-wide leading-snug ${
                                          canInteract ? 'text-white/95 hover:text-[#34d399] cursor-pointer transition-colors' :
                                          isSkipped ? 'text-white/25' :
                                          isCompleted ? 'text-white/50 line-through' :
                                          'text-white/60'
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
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono font-semibold">Новый слот</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] text-white/40 font-mono">Время</label>
                          <button
                            type="button"
                            onClick={() => setShowNewTimePicker(true)}
                            className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums text-white/80 text-left hover:border-white/[0.12] focus:outline-none focus:border-white/[0.12] transition-colors"
                          >
                            {normalizeTime(newSlotTime, '14:00')}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] text-white/40 font-mono">Ритуал</label>
                          <button
                            type="button"
                            onClick={() => setShowNewPracticeModal(true)}
                            className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white/60 text-left truncate hover:border-white/[0.12] transition-colors"
                          >
                            {newSlotPracticeId ? practices.find(p => p.id === newSlotPracticeId)?.title || '—' : 'Выбрать...'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.04]">
                        <button type="button" onClick={() => setIsAddingSlot(false)} className="px-2.5 py-1 text-[10px] text-white/50 hover:text-white/60">Отмена</button>
                        <button type="submit" className="px-3.5 py-1 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg text-[10px] font-semibold transition-all">Добавить</button>
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
              <span className="text-[11px] text-[#E6B85C] tracking-widest font-mono font-bold uppercase">Библиотека знаний</span>
              <span className="text-[10px] text-white/50 font-mono">
                {completedArticles.length} из {ARTICLES.length} изучено
              </span>
            </div>

            {/* Micro-progress indicator line */}
            <div className="h-[2px] w-full bg-white/[0.03] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#E6B85C]/40 to-[#E6B85C] transition-all duration-500 rounded-full"
                style={{ width: `${(completedArticles.length / ARTICLES.length) * 100}%` }}
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
                        ? 'bg-[#E6B85C]/[0.02] border-[#E6B85C]/15 hover:bg-[#E6B85C]/[0.04]' 
                        : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-medium uppercase tracking-wider transition-all duration-300 ${
                        isCompleted ? 'bg-[#E6B85C]/10 border border-[#E6B85C]/20 text-[#E6B85C]/80' : 'bg-white/[0.03] border border-white/[0.05] text-white/45'
                      }`}>
                        {art.category.slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold truncate ${
                            isCompleted ? 'text-[#E6B85C]' : 'text-white/90 group-hover:text-white'
                          }`}>
                            {art.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/50 font-medium truncate">
                          {art.subtitle}
                        </span>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-white/30 mt-0.5">
                          <span className="text-white/45">{art.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {art.readTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center pl-2">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-[#E6B85C]/10 border border-[#E6B85C]/30 flex items-center justify-center text-[#E6B85C]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-white/20 group-hover:text-white/50 group-hover:border-white/20 transition-all duration-300">
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
              className="fixed inset-0 z-[200] bg-[#08090A] flex flex-col overscroll-none"
            >
            <header className="w-full max-w-md mx-auto px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={() => { setIsHealthOpen(false); setExpandedMetric(null); }}
                  className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
                >
                  <X className="w-4 h-4 text-[#F2EFE8]/50" />
                </button>
              </div>
              <GlassSurface className="p-1 grid grid-cols-3 gap-1">
                {['Главное', 'Здоровье', 'Аналитика'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setHealthPage(idx)}
                    className={`py-2.5 rounded-[18px] text-[13px] font-medium transition-colors duration-[160ms] ease-out ${
                      healthPage === idx
                        ? 'bg-white/[0.10] text-[#F2EFE8]/92'
                        : 'text-[#F2EFE8]/42 hover:text-[#F2EFE8]/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </GlassSurface>
            </header>

            <main className="relative flex-1 w-full max-w-md mx-auto pt-2 pb-20 overflow-y-auto hide-scrollbar px-5">
              <AnimatePresence initial={false}>
                {/* TAB: Обзор */}
                {healthPage === 0 && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, position: 'absolute', left: 20, right: 20, top: 8 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col gap-6"
                  >
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

                    <GlassSurface className="p-1 flex w-full max-w-[280px] mx-auto">
                      <button
                        type="button"
                        onClick={() => setShowNarrative(true)}
                        className={`flex-1 py-2 rounded-[18px] text-[13px] font-medium transition-colors duration-[160ms] ${showNarrative ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'}`}
                      >
                        Нарратив
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNarrative(false)}
                        className={`flex-1 py-2 rounded-[18px] text-[13px] font-medium transition-colors duration-[160ms] ${!showNarrative ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'}`}
                      >
                        Статистика
                      </button>
                    </GlassSurface>

                    {healthSource === 'none' && !dashboardHasRing && (
                      <GlassSurface className="p-5 text-left w-full">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-[#F2EFE8]/50" />
                          </div>
                          <span className="text-[15px] font-medium text-[#F2EFE8]/90">Данные здоровья</span>
                        </div>
                        <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed mb-4">
                          Подключите Apple Health / Health Connect или Ritual Core для расчёта Сияния.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleConnectHealth} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[13px] text-[#F2EFE8]/70 active:scale-[0.97] transition-transform">
                            <Smartphone className="w-3.5 h-3.5" />
                            Подключить
                          </button>
                          <button type="button" onClick={() => window.open('https://ritual.store', '_blank')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#C59A55]/10 border border-[#C59A55]/20 text-[13px] text-[#C59A55] active:scale-[0.97] transition-transform">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Ritual Core
                          </button>
                        </div>
                      </GlassSurface>
                    )}

                    {showNarrative ? (
                      <>
                        {/* ===== INTENTION BLOCK ===== */}
                        <GlassSurface
                          onClick={() => { if (!isFocusLockedToday) openIntentionModal(); }}
                          className={`p-5 text-left w-full flex flex-col gap-3 ${!isFocusLockedToday ? 'cursor-pointer active:scale-[0.99] transition-transform duration-[160ms]' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-[#F2EFE8]/42">Намерение дня</span>
                            {!isFocusLockedToday ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openIntentionModal(); }}
                                className="text-[13px] text-[#F2EFE8]/50 hover:text-[#F2EFE8]/70"
                              >
                                Изменить
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#F2EFE8]/30 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Зафиксировано
                              </span>
                            )}
                          </div>
                          <p className="font-display text-[22px] font-light text-[#F2EFE8]/90 italic leading-snug">
                            «{dailyFocus || 'Твоё намерение на день'}»
                          </p>
                          {isFocusLockedToday && (
                            <span className="text-[11px] text-[#F2EFE8]/30">Следующий выбор — завтра</span>
                          )}
                        </GlassSurface>

                        <GlassSurface className="p-5 text-left w-full">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[13px] text-[#F2EFE8]/42">Персональный нарратив</span>
                            {userGender !== 'male' && (
                              <button type="button" onClick={() => setIsCycleOpen(true)} className="text-[13px] text-[#F2EFE8]/50 hover:text-[#F2EFE8]/70 flex items-center gap-1">
                                {isPregnancyMode ? 'Беременность' : 'Женский цикл'}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 text-[15px] text-[#F2EFE8]/70 leading-relaxed">
                          {userGender === 'male' ? (
                            <>
                              <p className="text-[13px] font-medium" style={{ color: accentColor }}>Циркадный ритм · Стабильный тонус</p>
                              <p>Суточный баланс кортизола и testosterone в оптимальных границах. Утренний пик завершился гармонично.</p>
                              <p>Ночной сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. ВСР {healthMetrics.hrv !== null ? `${metricHrv} мс` : 'данные недоступны'}{healthMetrics.hrv !== null ? ' — высокая адаптивность' : ''}.</p>
                              <p className="text-[13px] text-[#F2EFE8]/42">Рекомендация: вечерний ритуал «Тишина» или дыхательная сессия.</p>
                            </>
                          ) : isPregnancyMode ? (
                            <>
                              <p className="text-[13px] font-medium text-[#C59A55]/90">Режим «Беременность» · Второй триместр</p>
                              <p>Твой организм адаптируется. Гормональный фон выравнивается, самочувствие улучшается.</p>
                              <p>Ночью сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. Пульс покоя {healthMetrics.restingHR !== null ? `${metricPulse} уд/мин` : 'данные недоступны'}{healthMetrics.restingHR !== null ? ' — естественный сдвиг' : ''}.</p>
                              <p className="text-[13px] text-[#F2EFE8]/42">Рекомендация: «Сканирование тела» или «Точка спокойствия».</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[13px] font-medium" style={{ color: accentColor }}>
                                {cyclePhase === 'follicular' ? 'Фолликулярная фаза' : cyclePhase === 'luteal' ? 'Лютеиновая фаза' : cyclePhase === 'ovulatory' ? 'Овуляторная фаза' : 'Менструальная фаза'}, {cycleDay}-й день
                              </p>
                              <p>
                                {cyclePhase === 'follicular' ? 'Эстроген растёт. Растут энергия и ясность ума.'
                                  : cyclePhase === 'luteal' ? 'Прогестерон перестраивает организм на сохранение энергии.'
                                  : cyclePhase === 'ovulatory' ? 'Эстроген и тестостерон максимально активны.'
                                  : 'Эстроген и прогестерон на минимуме. Организм занят обновлением.'}
                              </p>
                              <p>Ночью сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. ВСР стабильна на {healthMetrics.hrv !== null ? `${metricHrv} мс` : 'данные недоступны'}.</p>
                              <p className="text-[13px] text-[#F2EFE8]/42">Рекомендация: {cyclePhase === 'follicular' ? '«Утреннее пробуждение» или «Квадратное дыхание».' : cyclePhase === 'luteal' ? 'Мягкие ритуалы «Тишины» и «Дыхание 4-7-8».' : cyclePhase === 'ovulatory' ? 'Отличное время для активных ритуалов.' : 'Лёгкие ритуалы: «Самосострадание» или «Точка спокойствия».'}</p>
                            </>
                          )}
                        </div>
                        </GlassSurface>

                        {/* JCRing-style summary rows — tap opens metric on Здоровье */}
                        <div className="flex flex-col w-full">
                          {mainSummaryMetrics.map((item) => {
                            const hasData = item.val !== null && item.val !== undefined;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  if (hasData) openMetricDetail(item.key);
                                  else handleConnectHealth();
                                }}
                                className="flex items-center justify-between py-4 border-b border-[rgba(242,239,232,0.12)] last:border-0 text-left active:scale-[0.99] transition-transform duration-[160ms]"
                              >
                                <span className="text-[13px] text-[#F2EFE8]/42">{item.label}</span>
                                <span className="flex items-center gap-2">
                                  {hasData ? (
                                    <span className="font-display text-[22px] font-light text-[#F2EFE8]/90 tabular-nums">
                                      {formatSummaryValue(item.key, item.val as number, item.unit)}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] text-[#F2EFE8]/30">—</span>
                                  )}
                                  <ChevronRight className="w-4 h-4 text-[#F2EFE8]/25" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                    </>
                  ) : (
                      <GlassSurface className="p-5 text-left w-full">
                        <span className="text-[13px] text-[#F2EFE8]/42 block mb-4">Драйверы за 7 дней</span>
                        <div className="flex flex-col gap-3">
                          {[
                            { key: 'hrv', label: 'Вариабельность (ВСР)', val: healthMetrics.hrv, unit: 'мс', avg: 48, color: '#6ee7b7' },
                            { key: 'sleep', label: 'Качество сна', val: healthMetrics.sleepHours, unit: 'ч', avg: 7.1, color: '#a78bfa' },
                            { key: 'activity', label: 'Дневная активность', val: healthMetrics.steps, unit: 'шагов', avg: 8000, color: '#e8e0d4' },
                            { key: 'hr', label: 'Пульс покоя', val: healthMetrics.restingHR, unit: 'уд/м', avg: 65, color: '#fca5a5' }
                          ].map((item) => {
                            const hasData = item.val !== null && item.val !== undefined;
                            const pct = hasData ? Math.min(100, Math.round((item.val! / item.avg) * 85)) : 0;
                            const formatted = hasData
                              ? item.unit === 'ч'
                                ? `${Math.floor(item.val!)}ч ${Math.round((item.val! % 1) * 60)}м`
                                : item.unit === 'шагов'
                                  ? item.val!.toLocaleString()
                                  : `${item.val} ${item.unit}`
                              : null;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  if (hasData) openMetricDetail(item.key);
                                  else handleConnectHealth();
                                }}
                                className="flex flex-col gap-2 py-3 border-b border-[rgba(242,239,232,0.12)] last:border-0 text-left active:scale-[0.99] transition-transform duration-[160ms]"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[13px] text-[#F2EFE8]/42">{item.label}</span>
                                  <span className="flex items-center gap-2">
                                    {hasData ? (
                                      <span className="font-display text-xl font-light text-[#F2EFE8]/90 tabular-nums">{formatted}</span>
                                    ) : (
                                      <span className="text-[13px] text-[#F2EFE8]/30 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Нет данных
                                      </span>
                                    )}
                                    <ChevronRight className="w-3.5 h-3.5 text-[#F2EFE8]/25" />
                                  </span>
                                </div>
                                {hasData && (
                                  <div className="h-px bg-[rgba(242,239,232,0.08)] overflow-hidden">
                                    <div className="h-px transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.7 }} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {dataQuality !== 'none' && (
                          <div className="mt-4 pt-4 border-t border-[rgba(242,239,232,0.12)]">
                            <span className="text-[13px] text-[#F2EFE8]/42 block mb-3">Вклад в Сияние</span>
                            <div className="flex flex-col gap-3">
                              {[
                                { key: 'hrv', label: 'ВСР', score: shine?.hrv ?? 0, weight: '30%' },
                                { key: 'sleep', label: 'Сон', score: shine?.sleep ?? 0, weight: '25%' },
                                { key: 'activity', label: 'Активность', score: shine?.activity ?? 0, weight: '25%' },
                                { key: 'hr', label: 'Пульс', score: shine?.restingHR ?? 0, weight: '20%' },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => openMetricDetail(item.key)}
                                  className="flex items-center gap-3 w-full text-left active:opacity-80"
                                >
                                  <span className="text-[13px] text-[#F2EFE8]/42 w-24">{item.label}</span>
                                  <div className="flex-1 h-px bg-[rgba(242,239,232,0.08)] overflow-hidden">
                                    <div className="h-px transition-all" style={{ width: `${item.score}%`, backgroundColor: accentColor, opacity: 0.75 }} />
                                  </div>
                                  <span className="text-[13px] text-[#F2EFE8]/70 w-8 text-right tabular-nums">{item.score}</span>
                                  <span className="text-[11px] text-[#F2EFE8]/30 w-8">{item.weight}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </GlassSurface>
                    )}
                  </motion.div>
                )}

                {/* TAB: Показатели */}
                {healthPage === 1 && (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, position: 'absolute', left: 20, right: 20, top: 8 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col"
                  >
                    {dashboardHasRing && (
                      <div className="mb-4">
                        <RitualRingAnalytics />
                      </div>
                    )}

                    {healthSource === 'none' && !dashboardHasRing && (
                      <GlassSurface className="p-5 flex flex-col gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-5 h-5 text-[#F2EFE8]/35" />
                          <span className="text-[15px] font-medium text-[#F2EFE8]/90">Данные недоступны</span>
                        </div>
                        <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed">
                          Подключите приложение здоровья или Ritual Core для отслеживания показателей.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={handleConnectHealth} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[13px] text-[#F2EFE8]/70">
                            <Smartphone className="w-3.5 h-3.5" />
                            Подключить
                          </button>
                          <button type="button" onClick={() => window.open('https://ritual.store', '_blank')} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#C59A55]/10 border border-[#C59A55]/20 text-[13px] text-[#C59A55]">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Ritual Core
                          </button>
                        </div>
                      </GlassSurface>
                    )}

                    {[
                      { key: 'sleep', title: 'Сон', rawVal: healthMetrics.sleepHours, icon: Moon, unit: 'ч', baseline: 7.1, insight: 'Твой сон стабилен. Глубокие фазы в норме.', color: '#9fb7ff' },
                      { key: 'hrv', title: 'ВСР (Покой)', rawVal: healthMetrics.hrv, icon: Activity, unit: 'мс', baseline: 48, insight: 'Ключевой драйвер самочувствия. Высокая вариабельность = отличная кардиорегуляция.', color: '#6ee7b7' },
                      { key: 'hr', title: 'Пульс покоя', rawVal: healthMetrics.restingHR, icon: Heart, unit: 'уд/м', baseline: 65, insight: 'Пульс снижается — сердце разгружается.', inverted: true, color: '#fca5a5' },
                      { key: 'activity', title: 'Активность', rawVal: healthMetrics.steps, icon: Zap, unit: 'шагов', baseline: 8000, insight: (healthMetrics.steps ?? 0) >= 8000 ? 'Дневная норма выполнена.' : 'Продолжай накапливать активность.', color: '#fcd34d' },
                      { key: 'resp', title: 'Дыхание', rawVal: healthMetrics.respiratoryRate, icon: Wind, unit: 'дых/мин', baseline: 14, insight: 'Дыхание ровное, без признаков гипоксии.', color: '#38bdf8' },
                      { key: 'oxygen', title: 'SpO₂', rawVal: healthMetrics.spo2, icon: Eye, unit: '%', baseline: 97, insight: 'Идеальное насыщение крови кислородом.', color: '#2dd4bf' },
                      { key: 'temp', title: 'Температура', rawVal: healthMetrics.temperature, icon: Thermometer, unit: '°C', baseline: 36.4, insight: 'Терморегуляция спокойна.', color: '#f87171' },
                    ].map((metric) => {
                      const isExpanded = expandedMetric === metric.key;
                      const hasData = metric.rawVal !== null && metric.rawVal !== undefined;
                      const val = metric.rawVal;
                      const healthMetricKey = metricKeyMap[metric.key];
                      const availability = healthMetricKey ? availabilityByMetric[healthMetricKey] : 'unavailable';

                      const formattedVal = hasData ? formatMetricValue(metric.key, val!, metric.unit) : null;
                      const delta = getMetricDelta(metric.key, val);

                      return (
                        <div
                          key={metric.key}
                          ref={(el) => { metricRowRefs.current[metric.key] = el; }}
                          className={
                            isExpanded
                              ? 'rounded-2xl bg-white/[0.03] px-3 -mx-3 mb-2 border'
                              : 'border-b border-[rgba(242,239,232,0.12)]'
                          }
                          style={isExpanded ? { borderColor: `${accentColor}55` } : undefined}
                        >
                          <div
                            onClick={() => {
                              if (hasData) {
                                setExpandedMetric(isExpanded ? null : metric.key);
                              } else {
                                setLockedMetric({ title: metric.title, status: availability });
                              }
                            }}
                            className="flex items-center justify-between py-4 cursor-pointer active:scale-[0.99] transition-transform duration-[160ms]"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] text-[#F2EFE8]/42">{metric.title}</span>
                              {hasData ? (
                                <span className="font-display text-[28px] font-light text-[#F2EFE8]/92 tabular-nums leading-tight mt-0.5">{formattedVal}</span>
                              ) : (
                                <span className="text-[13px] text-[#F2EFE8]/30 mt-0.5">{getAvailabilityLabel(availability)}</span>
                              )}
                            </div>
                            {hasData ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[13px] tabular-nums ${delta === null ? 'text-[#F2EFE8]/30' : delta >= 0 ? 'text-[#74B6A0]' : 'text-[#C56855]'}`}>
                                  {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${metric.key === 'activity' ? Math.round(delta).toLocaleString('ru-RU') : Math.abs(delta) < 1 ? delta.toFixed(1) : Math.round(delta)}`}
                                </span>
                                <ChevronRight className={`w-4 h-4 text-[#F2EFE8]/25 transition-transform duration-[160ms] ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            ) : (
                              <Lock className="w-4 h-4 text-[#F2EFE8]/20" />
                            )}
                          </div>

                          {/* Expanded area — only when has data */}
                          <AnimatePresence initial={false}>
                            {isExpanded && hasData && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="pb-6">
                                  {hasData && (
                                    <div className="relative h-3 mb-5 mx-0.5">
                                      <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(242,239,232,0.12)]" />
                                      <div
                                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full -ml-1"
                                        style={{
                                          left: `${Math.min(96, Math.max(4, ((val! - metric.baseline * 0.75) / (metric.baseline * 0.5)) * 100))}%`,
                                          backgroundColor: accentColor,
                                          boxShadow: `0 0 12px ${accentColor}66`,
                                        }}
                                      />
                                    </div>
                                  )}
                                  <p className="text-[15px] text-[#F2EFE8]/60 leading-relaxed mb-5">
                                    {metric.key === 'sleep'
                                      ? getSleepInsight(typeof val === 'number' ? val : null, getMetricDelta('sleep', val))
                                      : metric.insight}
                                  </p>
                                  <div className="flex justify-between text-[13px] text-[#F2EFE8]/42 mb-4">
                                    <span>Базовая: {metric.baseline} {metric.unit}</span>
                                    {hasData && delta !== null && (
                                      <span className={delta >= 0 ? 'text-[#74B6A0]' : 'text-[#C56855]'}>
                                        {delta >= 0 ? '↑' : '↓'} к вчера
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    const formatHistoryValue = (key: string, v: number): string => {
                                      switch (key) {
                                        case 'sleep':
                                          return `${v.toFixed(1)}`;
                                        case 'hrv':
                                          return `${Math.round(v)}`;
                                        case 'hr':
                                          return `${Math.round(v)}`;
                                        case 'activity':
                                          return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
                                        case 'resp':
                                          return `${v.toFixed(1)}`;
                                        case 'oxygen':
                                          return `${Math.round(v)}%`;
                                        case 'temp':
                                          return `${v.toFixed(1)}°`;
                                        default:
                                          return `${v}`;
                                      }
                                    };

                                    const realPoints = getMetricPoints(metric.key).filter(point => point.status === 'available' && point.value !== null);
                                    const historyValues = realPoints.map(point => point.value as number);
                                    const historyLabels = realPoints.map(point => {
                                      const [, month, day] = point.date.split('-');
                                      return `${parseInt(day, 10)}.${month}`;
                                    });

                                    if (historyValues.length < 2) {
                                      return (
                                        <div className="border-y border-white/[0.06] py-4 mb-4">
                                          <p className="text-[11px] text-white/45 leading-relaxed">
                                            Недостаточно дневных точек для графика. Данные появятся после нескольких синхронизаций HealthKit / Health Connect или кольца.
                                          </p>
                                        </div>
                                      );
                                    }
                                    const minVal = Math.min(...historyValues);
                                    const maxVal = Math.max(...historyValues);
                                    const valRange = maxVal - minVal || 1;

                                    const paddedMin = minVal - valRange * 0.2;
                                    const paddedMax = maxVal + valRange * 0.2;
                                    const paddedRange = paddedMax - paddedMin || 1;

                                    const width = 340;
                                    const height = 140;
                                    const paddingX = 25;
                                    const gapX = (width - 2 * paddingX) / Math.max(1, historyValues.length - 1);

                                    const coords = historyValues.map((v, i) => {
                                      const x = paddingX + i * gapX;
                                      const y = 100 - ((v - paddedMin) / paddedRange) * 70; // y values scaled inside 30 - 100
                                      return { x, y };
                                    });

                                    return (
                                      <div className="border-y border-white/[0.06] py-4 mb-4 flex flex-col items-center">
                                        <div className="w-full h-40 relative">
                                          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                                            {/* Horizontal grid/reference lines */}
                                            {[0.25, 0.5, 0.75].map((p, idx) => {
                                              const yCoord = 100 - p * 70;
                                              return (
                                                <g key={idx} className="opacity-30">
                                                  <line 
                                                    x1={paddingX - 10} 
                                                    y1={yCoord} 
                                                    x2={width - paddingX + 10} 
                                                    y2={yCoord} 
                                                    stroke="rgba(255,255,255,0.04)" 
                                                    strokeWidth="0.5" 
                                                  />
                                                </g>
                                              );
                                            })}

                                            {/* Baseline reference line */}
                                            {(() => {
                                              const bY = 100 - ((metric.baseline - paddedMin) / paddedRange) * 70;
                                              if (bY >= 15 && bY <= 115) {
                                                return (
                                                  <g className="opacity-40">
                                                    <line 
                                                      x1={paddingX - 12} 
                                                      y1={bY} 
                                                      x2={width - paddingX + 12} 
                                                      y2={bY} 
                                                      stroke="rgba(255,255,255,0.2)" 
                                                      strokeDasharray="2,2"
                                                      strokeWidth="1" 
                                                    />
                                                    <text x={width - paddingX + 14} y={bY + 3} className="text-[8px] font-mono fill-white/40">база</text>
                                                  </g>
                                                );
                                              }
                                              return null;
                                            })()}

                                            {/* SVG Line path */}
                                            <path
                                              d={coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')}
                                              fill="none"
                                              stroke={accentColor}
                                              strokeWidth="1.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="opacity-80"
                                            />

                                            {/* Connection circles and value labels */}
                                            {coords.map((c, i) => {
                                              const rawV = historyValues[i];
                                              const formattedLabel = formatHistoryValue(metric.key, rawV);
                                              const isCurrentDay = i === 6;
                                              return (
                                                <g key={i}>
                                                  {/* Dot outline glow for active/latest day */}
                                                  {isCurrentDay && (
                                                    <circle 
                                                      cx={c.x} 
                                                      cy={c.y} 
                                                      r="9" 
                                                      fill={metric.color || '#e8e0d4'} 
                                                      className="opacity-20 animate-pulse" 
                                                    />
                                                  )}
                                                  {/* The Dot */}
                                                  <circle 
                                                    cx={c.x} 
                                                    cy={c.y} 
                                                    r="3.5" 
                                                    fill="#070709" 
                                                    stroke={metric.color || '#e8e0d4'} 
                                                    strokeWidth="2.5" 
                                                  />
                                                  {/* Signed/labeled value above each point */}
                                                  <text 
                                                    x={c.x} 
                                                    y={c.y - 10} 
                                                    className="text-[10px] font-mono font-semibold fill-white/95" 
                                                    textAnchor="middle"
                                                  >
                                                    {formattedLabel}
                                                  </text>
                                                  {/* Day of week below the point */}
                                                  <text 
                                                    x={c.x} 
                                                    y={125} 
                                                    className={`text-[10px] font-sans ${isCurrentDay ? 'fill-white/80 font-semibold' : 'fill-white/35'}`} 
                                                    textAnchor="middle"
                                                  >
                                                    {historyLabels[i] || weekDays[i] || ''}
                                                  </text>
                                                </g>
                                              );
                                            })}
                                          </svg>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* TAB: Тренды */}
                {healthPage === 2 && (() => {
                  const activeAnalyticsList = getHistoricalAnalytics(analyticsPeriod);
                  
                  // Default selected day to the last element (today) if null or out of bounds
                  const selectedIndex = selectedTrendDay !== null && selectedTrendDay < activeAnalyticsList.length 
                    ? selectedTrendDay 
                    : activeAnalyticsList.length - 1;
                    
                  const currentSelectedDay = activeAnalyticsList[selectedIndex];
                  const dayPractices = stats.history.filter(h => normalizeHistoryDate(h.date) === currentSelectedDay.dateStr);

                  // Function to format Russian date nicely
                  const formatFriendlyDate = (dateStr: string, isToday: boolean, dayOfWeek: string) => {
                    if (isToday) return 'Сегодня';
                    const now = new Date();
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    const yestStr = yesterday.toISOString().slice(0, 10);
                    if (dateStr === yestStr) return 'Вчера';

                    const [, m, d] = dateStr.split('-');
                    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
                    const monthName = months[parseInt(m, 10) - 1];
                    const daysFull = { 'Пн': 'Понедельник', 'Вт': 'Вторник', 'Ср': 'Среда', 'Чт': 'Четверг', 'Пт': 'Пятница', 'Сб': 'Суббота', 'Вс': 'Воскресенье' };
                    const dayName = (daysFull as any)[dayOfWeek] || dayOfWeek;
                    return `${parseInt(d, 10)} ${monthName}, ${dayName}`;
                  };

                  // Function to get health/wellness advice based on Shine Score
                  const getShineAdvice = (score: number | null) => {
                    if (score === null) return 'За этот день нет HealthKit / Health Connect данных, поэтому биометрический тренд не рассчитывается.';
                    if (score >= 85) return 'Превосходное состояние. Высокая регулярность практик и отличный физиологический баланс организма.';
                    if (score >= 70) return 'Стабильное состояние. Регулярные осознанные паузы защищают нервную систему от накопления стресса.';
                    if (score >= 55) return 'Умеренный тонус. Рекомендуется уделить 5 минут глубокому расслаблению перед сном или сделать микропаузу.';
                    return 'Период восстановления. Резервы энергии снижены. Попробуйте мягкое дыхание «Квадрат» для центрирования.';
                  };

                  // Coordinates for SVG lines
                  const width = 300;
                  const height = 120;
                  const chartLeft = 20;
                  const chartRight = 260;
                  const chartWidth = chartRight - chartLeft;
                  const axisLabelX = width - 12;
                  const daysCount = activeAnalyticsList.length;

                  const points = activeAnalyticsList.map((dVal, i) => {
                    const x = daysCount > 1
                      ? chartLeft + i * (chartWidth / (daysCount - 1))
                      : chartLeft + chartWidth / 2;
                    const clampedScore = dVal.shineScore === null ? null : Math.max(40, Math.min(100, dVal.shineScore));
                    const y = clampedScore === null ? 95 : 95 - ((clampedScore - 40) / 60) * 80;
                    return { x, y, ...dVal, originalIndex: i };
                  });
                  const scoredPoints = points.filter(p => p.hasHealthData && p.shineScore !== null);
                  let previousPointHadHealthData = false;
                  const shinePath = points.reduce((path, p) => {
                    if (!p.hasHealthData || p.shineScore === null) {
                      previousPointHadHealthData = false;
                      return path;
                    }
                    const command = previousPointHadHealthData ? 'L' : 'M';
                    previousPointHadHealthData = true;
                    return `${path} ${command} ${p.x} ${p.y}`;
                  }, '').trim();
                  const hasEnoughTrendData = scoredPoints.length >= 2;

                  return (
                    <motion.div 
                      key="trends" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0, position: 'absolute', left: 20, right: 20, top: 8 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="flex flex-col gap-6 pb-4"
                    >
                      <div className="pt-2">
                        <span className="text-[13px] text-[#F2EFE8]/42">
                          {formatFriendlyDate(currentSelectedDay.dateStr, currentSelectedDay.isToday, currentSelectedDay.dayOfWeek)}
                        </span>
                        <div className="mt-3 flex items-end gap-1">
                          <span className="font-display text-[72px] font-light leading-none tabular-nums" style={{ color: accentColor }}>
                            {currentSelectedDay.shineScore === null ? '—' : currentSelectedDay.shineScore}
                          </span>
                          {currentSelectedDay.shineScore !== null && (
                            <span className="mb-3 text-lg text-[#F2EFE8]/42">%</span>
                          )}
                        </div>
                        <p className="mt-3 text-[15px] text-[#F2EFE8]/60 leading-relaxed max-w-[300px]">
                          {getShineAdvice(currentSelectedDay.shineScore)}
                        </p>
                      </div>

                      <div className="flex justify-center gap-8 border-b border-[rgba(242,239,232,0.12)]">
                        {(['7', '30', '90'] as const).map((key) => (
                          <button 
                            key={key} 
                            type="button"
                            onClick={() => {
                              setAnalyticsPeriod(key);
                              setSelectedTrendDay(null);
                            }} 
                            className={`min-w-16 border-b py-3 text-[13px] font-medium transition-colors duration-[160ms] ${
                              analyticsPeriod === key 
                                ? 'border-current text-[#F2EFE8]/90' 
                                : 'border-transparent text-[#F2EFE8]/42 hover:text-[#F2EFE8]/60'
                            }`}
                            style={analyticsPeriod === key ? { color: accentColor, borderColor: accentColor } : undefined}
                          >
                            {key === '7' ? 'Неделя' : key === '30' ? '30 дней' : '90 дней'}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-[13px] text-[#F2EFE8]/42">
                        <span>Сияние и практики</span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                            Сияние
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                            Практики
                          </span>
                        </div>
                      </div>
                        <div className="w-full relative py-2">
                          {!hasEnoughTrendData && (
                            <div className="absolute inset-x-4 top-8 z-10 border-y border-white/[0.06] py-4 text-center backdrop-blur-md">
                              <p className="text-[11px] text-white/55 leading-relaxed">
                                Недостаточно реальных дневных health-данных для линии тренда. Подключите HealthKit / Health Connect или синхронизируйте кольцо несколько дней подряд.
                              </p>
                            </div>
                          )}
                          <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                            
                            {/* Grid Lines (Shine Score axis) */}
                            {[40, 70, 100].map((gridVal) => {
                              const yCoord = 95 - ((gridVal - 40) / 60) * 80;
                              return (
                                <g key={gridVal} className="opacity-[0.1]">
                                  <line 
                                    x1={chartLeft - 6}
                                    y1={yCoord} 
                                    x2={chartRight + 4}
                                    y2={yCoord} 
                                    stroke="rgba(255,255,255,0.4)" 
                                    strokeWidth="0.5" 
                                    strokeDasharray="2,2"
                                  />
                                  <text 
                                    x={axisLabelX}
                                    y={yCoord - 3} 
                                    className="text-[7px] font-mono fill-white text-right"
                                    textAnchor="end"
                                  >
                                    {gridVal}%
                                  </text>
                                </g>
                              );
                            })}

                            {/* Weekly Bars for practices (Only in 7-day view) */}
                            {analyticsPeriod === '7' && points.map((p) => {
                              const barW = 14;
                              const maxPossibleBars = Math.max(...barData, 3);
                              const barH = (p.practicesCount / maxPossibleBars) * 45; // max height 45px
                              const barY = 95 - barH;
                              const isSelected = p.originalIndex === selectedIndex;
                              
                              return (
                                <g key={p.dateStr}>
                                  {/* Background pillar */}
                                  <rect 
                                    x={p.x - barW / 2} 
                                    y="15" 
                                    width={barW} 
                                    height="80" 
                                    rx="2" 
                                    className={`transition-all duration-300 ${isSelected ? 'fill-white/[0.03]' : 'fill-transparent'}`} 
                                  />
                                  
                                  {/* Completed practices bar */}
                                  <rect 
                                    x={p.x - barW / 2} 
                                    y={barY} 
                                    width={barW} 
                                    height={barH} 
                                    rx="1.5" 
                                    fill={isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                                    className="transition-all duration-300"
                                  />
                                  
                                  {/* Practice count text above bar if count > 0 */}
                                  {p.practicesCount > 0 && (
                                    <text 
                                      x={p.x} 
                                      y={barY - 4} 
                                      className={`text-[8px] font-mono font-medium text-center ${isSelected ? 'fill-white' : 'fill-white/30'}`}
                                      textAnchor="middle"
                                    >
                                      {p.practicesCount}
                                    </text>
                                  )}
                                </g>
                              );
                            })}

                            {/* Shine Score Line Path */}
                            {hasEnoughTrendData && (
                              <path
                                d={shinePath}
                                fill="none"
                                stroke={accentColor}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="opacity-80"
                              />
                            )}

                            {/* Glowing Area under Shine Line for 30/90 days view */}
                            {analyticsPeriod !== '7' && hasEnoughTrendData && (
                              <path
                                d={`M ${scoredPoints[0].x} 95 ` + scoredPoints.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${scoredPoints[scoredPoints.length - 1].x} 95 Z`}
                                fill="url(#shine-area-grad)"
                                className="opacity-20"
                              />
                            )}

                            {/* SVG Definitions */}
                            <defs>
                              <linearGradient id="shine-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={accentColor} stopOpacity="0.12" />
                                <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Active Point Vertical Hairline */}
                            <line 
                              x1={points[selectedIndex].x} 
                              y1="10" 
                              x2={points[selectedIndex].x} 
                              y2="95" 
                              stroke={accentColor}
                              strokeWidth="0.6" 
                              strokeDasharray="2,2"
                              className="opacity-35"
                            />

                            {/* Points on Shine Line - Blinking circle removed! */}
                            {points.map((p) => {
                              const isSelected = p.originalIndex === selectedIndex;
                              if (!p.hasHealthData || p.shineScore === null) return null;
                              
                              // In dense views, only render circles for selected, today, or every Nth day
                              const shouldRenderDot = analyticsPeriod === '7' || isSelected || p.isToday || (analyticsPeriod === '30' && p.dayOfMonth % 5 === 0);
                              
                              if (!shouldRenderDot) return null;

                              return (
                                <g key={`dot-${p.dateStr}`}>
                                  {/* Selection Glow rings REMOVED to satisfy user request */}
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={isSelected ? '3.5' : '1.8'} 
                                    fill={isSelected ? accentColor : '#08090A'} 
                                    stroke={accentColor} 
                                    strokeWidth="1.2" 
                                  />
                                </g>
                              );
                            })}

                            {/* X-Axis labels */}
                            {points.map((p) => {
                              const isSelected = p.originalIndex === selectedIndex;
                              
                              // Display filter for axis labels to avoid overlap in 30/90 days views
                              let shouldShowLabel = false;
                              if (analyticsPeriod === '7') {
                                shouldShowLabel = true;
                              } else if (analyticsPeriod === '30') {
                                shouldShowLabel = p.dayOfMonth % 5 === 0 || p.isToday;
                              } else {
                                shouldShowLabel = p.dayOfMonth === 1 || p.isToday;
                              }

                              if (!shouldShowLabel) return null;

                              return (
                                <text 
                                  key={`lbl-${p.dateStr}`}
                                  x={p.x} 
                                  y="112" 
                                  className={`text-[11px] transition-all duration-300 ${
                                    isSelected 
                                      ? 'fill-[#F2EFE8]/90 font-medium' 
                                      : p.isToday 
                                        ? 'font-medium' 
                                        : 'fill-[#F2EFE8]/25'
                                  }`}
                                  style={p.isToday && !isSelected ? { fill: accentColor } : undefined}
                                  textAnchor="middle"
                                >
                                  {p.label}
                                </text>
                              );
                            })}

                            {/* Clickable Overlay Columns across full SVG height */}
                            {points.map((p) => {
                              const colWidth = daysCount > 1
                                ? chartWidth / (daysCount - 1)
                                : chartWidth;
                              return (
                                <rect 
                                  key={`click-${p.dateStr}`}
                                  x={p.x - colWidth / 2} 
                                  y="10" 
                                  width={colWidth} 
                                  height="100" 
                                  fill="transparent" 
                                  className="cursor-pointer"
                                  onClick={() => setSelectedTrendDay(p.originalIndex)}
                                />
                              );
                            })}
                          </svg>
                        </div>
                      <div className="border-t border-[rgba(242,239,232,0.12)] pt-4">
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-[13px] text-[#F2EFE8]/42">Ритуалы</span>
                          <span className="text-[13px] text-[#F2EFE8]/70 tabular-nums">{currentSelectedDay.practicesCount} сессий</span>
                        </div>
                        {dayPractices.length > 0 ? (
                          <div className="flex flex-col">
                            {dayPractices.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between py-3 border-b border-[rgba(242,239,232,0.12)] text-[15px] text-[#F2EFE8]/80">
                                <span className="flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-[#F2EFE8]/30" />
                                  {p.practiceTitle}
                                </span>
                                <span className="text-[13px] text-[#F2EFE8]/42">{p.minutes} мин</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[13px] text-[#F2EFE8]/35 leading-relaxed">
                            В этот день практик не зафиксировано.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </main>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ===== CYCLE BOTTOM SHEET ===== */}
      <AnimatePresence>
        {isCycleOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
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

                <AnimatePresence initial={false}>
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
            className="fixed inset-0 z-50 bg-[#070709] text-white flex flex-col w-full max-w-md left-1/2 -translate-x-1/2 overflow-hidden border-x border-white/[0.04]"
          >
            {/* Top Header */}
            <header className="px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 flex items-center justify-between border-b border-white/[0.04] bg-[#070709]/85 backdrop-blur-xl z-20">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all duration-300 ${
                  completedArticles.includes(activeArticle.id)
                    ? 'bg-[#E6B85C]/20 border border-[#E6B85C]/40 text-[#E6B85C]'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/65 hover:bg-white/10'
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
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#E6B85C]/60 to-[#E6B85C] transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
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
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#E6B85C] uppercase bg-[#E6B85C]/10 px-2.5 py-1 rounded-md self-start">
                    {activeArticle.category}
                  </span>
                  <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mt-1">
                    {activeArticle.title}
                  </h1>
                  <p className="text-sm text-white/50 italic leading-relaxed">
                    {activeArticle.subtitle}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 mt-1">
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
                        <h2 className="text-lg font-bold text-white/90 tracking-tight">
                          {sec.sectionTitle}
                        </h2>
                      )}
                      {sec.paragraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-white/70 leading-relaxed font-normal text-justify"
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
                      ? 'bg-[#E6B85C]/20 border border-[#E6B85C]/40 text-[#E6B85C]'
                      : 'bg-white/[0.02] border border-white/[0.05] text-white/30'
                  }`}>
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-white/90">
                      {completedArticles.includes(activeArticle.id)
                        ? 'Вы изучили этот материал!'
                        : 'Завершить чтение'}
                    </h3>
                    <p className="text-[11px] text-white/40 leading-normal max-w-[200px] mx-auto">
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
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                      completedArticles.includes(activeArticle.id)
                        ? 'bg-white/[0.03] text-white/60 hover:bg-white/5 border border-white/[0.05]'
                        : 'bg-gradient-to-r from-[#E6B85C]/90 to-[#E6B85C] text-[#070709] hover:opacity-90 shadow-lg shadow-[#E6B85C]/10'
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
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xl flex items-end justify-center p-4"
            onClick={() => setLockedMetric(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#101014] p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/45" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{lockedMetric.title}</h3>
                    <p className="text-[11px] text-white/45">{getAvailabilityLabel(lockedMetric.status)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLockedMetric(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-white/45"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[12px] text-white/60 leading-relaxed">
                {dashboardHasRing
                  ? lockedMetric.status === 'unsupported'
                    ? 'Ritual Ring подключено, но эта модель или версия прошивки не передаёт выбранный показатель.'
                    : 'Ritual Ring подключено. За последние 7 дней этот показатель не передавался. Запустите синхронизацию и проверьте посадку кольца.'
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
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-emerald-300/[0.10] border border-emerald-300/[0.18] text-[11px] font-medium text-emerald-100/80"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Синхронизировать Ritual Ring
                </button>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setLockedMetric(null);
                    handleConnectHealth();
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-white/70"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Подключить
                </button>
                <button
                  onClick={() => window.open('https://ritual.store', '_blank')}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-[11px] font-medium text-amber-300"
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
