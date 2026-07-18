import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Edit2, X, Check,
  Moon, Sun, Zap, Activity, Wind, Sparkle, Sparkles, Heart, Eye, Thermometer,
  ShoppingBag, Smartphone, Lock, ChevronRight, BookOpen, Clock, ArrowLeft
} from 'lucide-react';
import { Practice, UserStats } from '../types';
import QuickStartCard from './QuickStartCard';
import RingPurchaseBanner from './RingPurchaseBanner';
import ConnectHealthModal from './ConnectHealthModal';
import SelectModal from './SelectModal';
import TimePickerModal, { normalizeTime } from './TimePickerModal';
import { useHealthData } from '../hooks/useHealthData';
import { DataSource } from '../services/health/manager';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import { ShineBreakdown, calculateShine, getShineLabel, getShineColor } from '../services/health/shine';
import {
  DailyHealthPoint,
  EMPTY_AVAILABILITY_BY_METRIC,
  EMPTY_HISTORY_BY_METRIC,
  HealthAvailabilityByMetric,
  HealthHistoryByMetric,
  HealthMetricKey,
  MetricAvailability,
} from '../services/health/types';
import { notificationService, rescheduleAll } from '../services/notifications';
import { ARTICLES } from '../data/articles';

interface RitualDashboardProps {
  practices: Practice[];
  stats: UserStats;
  onSelectPractice: (practice: Practice) => void;
  shine?: ShineBreakdown;
  healthSource?: DataSource;
  historyByMetric?: HealthHistoryByMetric;
  availabilityByMetric?: HealthAvailabilityByMetric;
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

export default function RitualDashboard({
  practices,
  stats,
  onSelectPractice,
  shine,
  healthSource,
  historyByMetric: historyByMetricProp,
  availabilityByMetric: availabilityByMetricProp,
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

  const [focusDate, setFocusDate] = useState<string>(() => {
    return localStorage.getItem('ritual_day_focus_date') || '';
  });

  const isFocusLockedToday = focusDate === getTodayDateString();

  const [dailyFocus, setDailyFocus] = useState<string>(() => {
    const savedDate = localStorage.getItem('ritual_day_focus_date') || '';
    const savedFocus = localStorage.getItem('ritual_day_focus') || '';
    if (savedDate === getTodayDateString()) {
      return savedFocus;
    }
    return ''; // Reset to empty if a new day has arrived
  });
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
  const showReflectionCard = !!(isEvening && dailyFocus);

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
  };

  const handleSmartIntention = () => {
    if (isFocusLockedToday) return;

    const isHigh = shineScore >= 60;
    const pool = isHigh ? INTENTIONS_HIGH : INTENTIONS_LOW;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosenText = pool[randomIndex];
    
    setDailyFocus(chosenText);
    const todayStr = getTodayDateString();
    localStorage.setItem('ritual_day_focus', chosenText);
    localStorage.setItem('ritual_day_focus_date', todayStr);
    setFocusDate(todayStr);
  };

  const [slots, setSlots] = useState<TimelineSlot[]>(() => {
    const saved = localStorage.getItem('ritual_day_slots');
    return saved ? JSON.parse(saved) : DEFAULT_SLOTS;
  });

  const todayKey = new Date().toISOString().slice(0, 10);

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

  const getSlotStatus = (slot: TimelineSlot): 'completed' | 'skipped' | 'active' | 'pending' => {
    const assignedPractice = practices.find(p => p.id === slot.practiceId);
    if (completedSlots[slot.id] || assignedPractice?.completed) return 'completed';
    const slotIdx = slots.findIndex(s => s.id === slot.id);
    const activeIdx = slots.findIndex(s => s.id === activeSlotId);
    if (slotIdx < activeIdx) return 'skipped';
    if (slot.id === activeSlotId) return 'active';
    return 'pending';
  };

  useEffect(() => {
    const updateActiveSlot = () => {
      if (slots.length === 0) return;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let foundId = '';
      for (let i = slots.length - 1; i >= 0; i--) {
        if (currentMinutes >= getMinutes(slots[i].time)) {
          foundId = slots[i].id;
          break;
        }
      }
      if (!foundId) foundId = slots[0].id;

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

  const { 
    metrics: healthMetrics, 
    historyByMetric: dashboardHistoryByMetric,
    availabilityByMetric: dashboardAvailabilityByMetric,
    refresh: refreshDashboardHealth
  } = useHealthData();

  const historyByMetric = historyByMetricProp || dashboardHistoryByMetric;
  const availabilityByMetric = availabilityByMetricProp || dashboardAvailabilityByMetric;

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
      onRefresh: refreshDashboardHealth,
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
  const [healthPage, setHealthPage] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7' | '30' | '90'>('30');
  const [showNarrative, setShowNarrative] = useState(true);

  const metricHrv = healthMetrics.hrv;
  const metricSleep = healthMetrics.sleepHours;
  const metricActivity = healthMetrics.steps;
  const metricPulse = healthMetrics.restingHR;

  const [isCycleOpen, setIsCycleOpen] = useState(false);

  useEffect(() => {
    if (isHealthOpen || isCycleOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isHealthOpen, isCycleOpen]);
  const [cycleDay, setCycleDay] = useState<number>(12);
  const [cyclePhase, setCyclePhase] = useState<string>('follicular');
  const [isPregnancyMode, setIsPregnancyMode] = useState<boolean>(() => {
    return localStorage.getItem('ritual_pregnancy_mode') === 'true';
  });

  const userGender = typeof window !== 'undefined' ? (localStorage.getItem('ritual_user_gender') || 'unspecified') : 'unspecified';

  useEffect(() => { localStorage.setItem('ritual_day_focus', dailyFocus); }, [dailyFocus]);
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

  const status = { title: getShineLabel(shineScore, dataQuality), color: getShineColor(shineScore, dataQuality) };

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
    <div className="w-full max-w-md mx-auto flex flex-col gap-7 select-none relative">
      
      {/* Page tabs */}
      <div className="flex items-center gap-4">
        {['Сегодня', 'Чтение'].map((title, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPage(idx)}
            className={`text-[13px] font-semibold transition-colors duration-300 ${
              currentPage === idx ? 'text-white' : 'text-white/50 hover:text-white/50'
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentPage === 0 && (
          <motion.div
            key="page-today"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-7"
          >
            {/* ===== HERO: SHINE SCORE ===== */}
            <section 
              onClick={() => setIsHealthOpen(true)}
              className="relative cursor-pointer rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop"
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/60 via-[#0a1628]/40 to-[#070709]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col items-center pt-10 pb-8 px-6">
                <span className="text-[11px] tracking-[0.25em] text-white/80 uppercase font-semibold mb-4">Сияние</span>

                <div className="relative w-64 h-36">
                  <svg className="w-full h-full" viewBox="0 0 200 100">
                    <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="rgba(255,255,255,0.08)" strokeLinecap="round" strokeWidth="1.5" />
                    {dataQuality !== 'none' && (
                      <motion.path 
                        d="M 20 90 A 80 80 0 0 1 180 90" 
                        fill="none" stroke="rgba(255,255,255,0.85)" strokeLinecap="round" strokeWidth="2"
                        initial={{ strokeDasharray: 251, strokeDashoffset: 251 }}
                        animate={{ strokeDashoffset: 251 - (251 * (shineScore / 100)) }}
                        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <circle cx="20" cy="90" r="2" fill="rgba(255,255,255,0.2)" />
                    <circle cx="180" cy="90" r="2" fill="rgba(255,255,255,0.2)" />
                    <text x="16" y="98" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="Inter" textAnchor="middle">0</text>
                    <text x="184" y="98" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="Inter" textAnchor="middle">100</text>
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                    {dataQuality !== 'none' ? (
                      <motion.span 
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-[56px] font-semibold text-white leading-none tracking-tight"
                      >
                        {shineScore}
                      </motion.span>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <span className="text-[20px] font-semibold text-white/40 leading-none">—</span>
                        <span className="text-[10px] text-white/40">нет данных</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    openIntentionModal();
                  }}
                  className="flex flex-col items-center mt-4 gap-1.5 group cursor-pointer hover:scale-[1.02] transition-all duration-300 relative z-20"
                >
                  <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold font-sans">
                    Намерение на день
                  </span>
                  <span className="text-[22px] italic font-semibold text-center px-4 animate-fade-in tracking-tight leading-snug" style={{ fontFamily: 'var(--font-display)', color: status.color }}>
                    {dailyFocus ? `«${dailyFocus}»` : 'Твоё намерение на день'}
                  </span>
                  <span className="text-[9px] text-white/45 font-medium group-hover:text-white/70 transition-colors">
                    {dailyFocus ? 'нажмите, чтобы изменить' : 'нажмите для выбора'}
                  </span>
                </motion.div>
              </div>
            </section>

            {/* ===== EVENING REFLECTION ===== */}
            {showReflectionCard && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-5 flex flex-col gap-4 text-center backdrop-blur-xl relative overflow-hidden"
              >
                {/* Background glow decoration */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-500/10 blur-[30px] rounded-full pointer-events-none" />

                <div className="flex flex-col gap-1.5 items-center relative z-10">
                  <div className="w-8 h-8 rounded-full bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-300 mb-1">
                    <Heart className="w-4 h-4 fill-purple-300/10" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-white tracking-tight leading-snug">
                    Вечерняя рефлексия
                  </h4>
                  <p className="text-[13px] text-white/70 px-2 leading-relaxed">
                    Удалось ли сегодня возвращаться к своему намерению?
                  </p>
                  <p className="text-[12px] italic text-[#e6b85c] font-semibold">
                    «{dailyFocus}»
                  </p>
                </div>

                {reflection.answer === null ? (
                  <div className="grid grid-cols-3 gap-2 mt-1.5 relative z-10">
                    <button
                      onClick={() => handleReflectionAnswer('yes')}
                      className="py-2.5 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-95 transition-all text-xs font-semibold text-white/80"
                    >
                      Да
                    </button>
                    <button
                      onClick={() => handleReflectionAnswer('partially')}
                      className="py-2.5 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-95 transition-all text-xs font-semibold text-white/80"
                    >
                      Частично
                    </button>
                    <button
                      onClick={() => handleReflectionAnswer('no')}
                      className="py-2.5 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-95 transition-all text-xs font-semibold text-white/80"
                    >
                      Не сегодня
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col gap-2 items-center text-center mt-1 relative z-10"
                  >
                    <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Ответ зафиксирован · {
                        reflection.answer === 'yes' ? 'Да' :
                        reflection.answer === 'partially' ? 'Частично' : 'Не сегодня'
                      }
                    </p>
                    <p className="text-[13px] text-white/80 leading-relaxed max-w-[280px]">
                      {reflection.reactionText}
                    </p>
                    <span className="text-[9px] text-white/30 font-mono mt-1">
                      Нейропетля замкнута. Завтра появится новое намерение.
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ===== RING PURCHASE BANNER ===== */}
            <RingPurchaseBanner
              source={healthSource ?? 'none'}
              onConnect={handleConnectHealth}
              onBuyRing={() => window.open('https://ritual.store', '_blank')}
            />

            {/* ===== RECOMMENDATION ===== */}
            <section className="flex flex-col gap-2.5">
              <span className="text-[11px] text-white/60 tracking-wider font-semibold px-1">Биометрическая рекомендация</span>
              <motion.div 
                onClick={() => onSelectPractice(recommendedPractice)}
                className="relative cursor-pointer rounded-[20px] overflow-hidden border border-white/[0.06] p-5 flex flex-col justify-between min-h-[170px]"
                whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0">
                  <img 
                    src={
                      recommendedPractice.id === 'start-day' ? 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=600&auto=format&fit=crop' :
                      recommendedPractice.id === 'calm-down' ? 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop' :
                      recommendedPractice.id === 'restore' ? 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop' :
                      recommendedPractice.id === 'pause' ? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop' :
                      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop'
                    }
                    alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12]/95 via-[#0d0d12]/70 to-[#0d0d12]/30" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-amber-300 font-mono tracking-wider uppercase">АВТОМАТИЧЕСКИЙ ПОДБОР</span>
                      <h3 className="text-base font-semibold text-white mt-1">{recommendedPractice.title}</h3>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
                    </div>
                  </div>

                  <p className="text-[11px] text-white/70 leading-relaxed max-w-xs font-medium">
                    {
                      shineScore === 0 ? 'Подключите датчик или умное кольцо для индивидуального подбора.' : 'Рекомендуемая практика на основе вашего состояния.'
                    }
                  </p>
                </div>
              </motion.div>
            </section>

            {/* ===== QUICK START ===== */}
            <section className="flex flex-col gap-2.5">
              <span className="text-[11px] text-white/60 tracking-wider font-semibold px-1">Быстрый старт</span>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory px-1">
                {practices.map((p) => (
                  <div key={p.id} className="snap-start flex-shrink-0">
                    <QuickStartCard 
                      practice={p} 
                      onClick={() => onSelectPractice(p)} 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ===== DAILY FLOW (ТЕЧЕНИЕ ДНЯ) ===== */}
            <section className="flex flex-col gap-2.5">
              <span className="text-[11px] text-white/60 tracking-wider font-semibold px-1">Течение дня</span>
              <motion.div layout className="relative flex flex-col gap-1.5">
                {(() => {
                  const now = new Date();
                  const currentMin = now.getHours() * 60 + now.getMinutes();
                  const firstMin = getMinutes(slots[0]?.time || '00:00');
                  const lastMin = getMinutes(slots[slots.length - 1]?.time || '23:59');
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
                                        onClick={() => canInteract && onSelectPractice(assignedPractice)}
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
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                        isCompleted ? 'bg-[#E6B85C]/10 border border-[#E6B85C]/20' : 'bg-white/[0.03] border border-white/[0.05]'
                      }`}>
                        {art.emoji}
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
      <AnimatePresence>
        {isHealthOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#070709]/98 backdrop-blur-2xl flex flex-col">
            <header className="flex flex-col gap-3 w-full max-w-md mx-auto px-5 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60 uppercase tracking-wider">Здоровье</span>
                <button onClick={() => { setIsHealthOpen(false); setExpandedMetric(null); }} className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-white/[0.03] p-0.5 rounded-xl">
                {['Обзор', 'Показатели', 'Тренды'].map((label, idx) => (
                  <button key={idx} onClick={() => setHealthPage(idx)} className={`py-1.5 rounded-lg text-[10px] transition-all ${healthPage === idx ? 'bg-white/10 text-white/90 font-medium' : 'text-white/60 hover:text-white/50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <main className="flex-1 w-full max-w-md mx-auto pt-5 pb-20 overflow-y-auto hide-scrollbar px-5">
              <AnimatePresence mode="wait">
                {/* TAB: Обзор */}
                {healthPage === 0 && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 items-center text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-white/60 py-1 px-3 rounded-full border border-white/[0.06]">{dailyFocus ? `«${dailyFocus}»` : status.title}</span>
                      {dataQuality !== 'none' ? (
                        <>
                          <h3 className="text-5xl font-semibold text-white/90 mt-4">{shineScore}%</h3>
                          <span className="text-[10px] text-white/50 mt-1">Индекс Сияния</span>
                          <span className="text-[9px] text-white/15 mt-0.5">
                            {dataQuality === 'full' ? 'Полный набор данных' : 
                             dataQuality === 'partial' ? 'Частичные данные' : 'Минимальные данные'}
                          </span>
                        </>
                      ) : (
                        <>
                          <h3 className="text-5xl font-semibold text-white/40 mt-4">—</h3>
                          <span className="text-[10px] text-white/50 mt-1">Индекс Сияния</span>
                          <span className="text-[9px] text-white/15 mt-0.5">Подключите данные для расчёта</span>
                        </>
                      )}
                    </div>

                    <div className="flex bg-white/[0.03] p-0.5 rounded-full text-xs w-full max-w-[240px]">
                      <button onClick={() => setShowNarrative(true)} className={`flex-1 py-1.5 rounded-full text-[10px] transition-all ${showNarrative ? 'bg-white/10 text-white/90 font-medium' : 'text-white/60'}`}>Нарратив</button>
                      <button onClick={() => setShowNarrative(false)} className={`flex-1 py-1.5 rounded-full text-[10px] transition-all ${!showNarrative ? 'bg-white/10 text-white/90 font-medium' : 'text-white/60'}`}>Статистика</button>
                    </div>

                    {healthSource === 'none' && (
                      <div className="rounded-2xl border border-[#e8e0d4]/[0.12] bg-[#e8e0d4]/[0.04] p-5 text-left w-full">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-[#e8e0d4]/[0.08] flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-[#e8e0d4]/60" />
                          </div>
                          <span className="text-xs font-medium text-[#e8e0d4]/80">Данные здоровья</span>
                        </div>
                        <p className="text-[11px] text-white/35 leading-relaxed mb-4">
                          Подключите приложение здоровья (Apple Health / Google Health Connect) или приобретите кольцо Ritual для автоматического расчёта Индекса Сияния.
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button onClick={handleConnectHealth} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.06] text-[11px] text-white/60">
                              <Smartphone className="w-3.5 h-3.5" />
                              Подключить
                            </button>
                            <button onClick={() => window.open('https://ritual.store', '_blank')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#e8e0d4]/[0.1] border border-[#e8e0d4]/[0.15] text-[11px] text-[#e8e0d4]/80 font-medium">
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Купить кольцо
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {showNarrative ? (
                      <>
                        {/* ===== INTENTION BLOCK ===== */}
                        <div 
                          onClick={() => {
                            if (!isFocusLockedToday) {
                              openIntentionModal();
                            }
                          }}
                          className={`bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 text-left w-full flex flex-col gap-3 transition-colors ${!isFocusLockedToday ? 'cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.08]' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider block font-mono">Намерение дня</span>
                            {!isFocusLockedToday ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openIntentionModal();
                                }}
                                className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] text-white/55 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all font-mono"
                                title="Выбрать или написать намерение"
                              >
                                <Sparkles className="w-3 h-3 text-amber-300 mr-0.5" />
                                <span>Выбрать</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-white/[0.02] border border-white/[0.02] text-[9px] text-white/30 font-mono">
                                <Lock className="w-2.5 h-2.5 text-white/20 mr-0.5" />
                                <span>Выбрано на сегодня</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm text-white/85 flex items-center justify-between gap-2 transition-colors font-medium">
                            <span className="italic">«{dailyFocus || 'Твоё намерение на день'}»</span>
                            {!isFocusLockedToday ? (
                              <Edit2 className="w-3.5 h-3.5 text-white/20 hover:text-white/40 flex-shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-white/10 flex-shrink-0" />
                            )}
                          </div>

                          {isFocusLockedToday && (
                            <span className="text-[9px] text-white/35 font-mono uppercase tracking-[0.1em]">
                              Следующий выбор будет доступен завтра после 24:00
                            </span>
                          )}
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 text-left w-full">
                          <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-3">Персональный нарратив</span>
                        
                        {/* Cycle / Pregnancy toggle for non-male */}
                        <div className="flex justify-end mb-3">
                          {userGender !== 'male' ? (
                            <button onClick={() => setIsCycleOpen(true)} className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.04] text-[10px] text-white/40">
                              {isPregnancyMode ? 'Беременность' : 'Женский цикл'}
                            </button>
                          ) : (
                            <span className="text-[9px] text-white/40 uppercase tracking-wider">Мужской профиль</span>
                          )}
                        </div>

                        <div className="space-y-3 text-sm font-normal text-white/70 leading-relaxed">
                          {userGender === 'male' ? (
                            <>
                              <p className="text-[#6ee7b7] text-xs font-medium">Циркадный ритм · Стабильный тонус</p>
                              <p>Суточный баланс кортизола и testosterone в оптимальных границах. Утренний пик завершился гармонично.</p>
                              <p>Ночной сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. ВСР {healthMetrics.hrv !== null ? `${metricHrv} мс` : 'данные недоступны'}{healthMetrics.hrv !== null ? ' — высокая адаптивность' : ''}.</p>
                              <p className="text-white/50">Рекомендация: вечерний ритуал «Тишина» или дыхательная сессия.</p>
                            </>
                          ) : isPregnancyMode ? (
                            <>
                              <p className="text-amber-300/80 text-xs font-medium">Режим «Беременность» · Второй триместр</p>
                              <p>Твой организм адаптируется. Гормональный фон выравнивается, самочувствие улучшается.</p>
                              <p>Ночью сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. Пульс покоя {healthMetrics.restingHR !== null ? `${metricPulse} уд/мин` : 'данные недоступны'}{healthMetrics.restingHR !== null ? ' — естественный сдвиг' : ''}.</p>
                              <p className="text-white/50">Рекомендация: «Сканирование тела» или «Точка спокойствия».</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[#93c5fd] text-xs font-medium">{cyclePhase === 'follicular' ? 'Фолликулярная фаза' : cyclePhase === 'luteal' ? 'Лютеиновая фаза' : cyclePhase === 'ovulatory' ? 'Овуляторная фаза' : 'Менструальная фаза'}, {cycleDay}-й день</p>
                              <p>
                                {cyclePhase === 'follicular' ? 'Эстроген растёт. Растут энергия и ясность ума.'
                                  : cyclePhase === 'luteal' ? 'Прогестерон перестраивает организм на сохранение энергии.'
                                  : cyclePhase === 'ovulatory' ? 'Эстроген и тестостерон максимально активны.'
                                  : 'Эстроген и прогестерон на минимуме. Организм занят обновлением.'}
                              </p>
                              <p>Ночью сон {healthMetrics.sleepHours !== null ? `${Math.floor(healthMetrics.sleepHours)} ч ${Math.round((healthMetrics.sleepHours % 1) * 60)} мин` : 'данные недоступны'}. ВСР стабильна на {healthMetrics.hrv !== null ? `${metricHrv} мс` : 'данные недоступны'}.</p>
                              <p className="text-white/50">Рекомендация: {cyclePhase === 'follicular' ? '«Утреннее пробуждение» или «Квадратное дыхание».' : cyclePhase === 'luteal' ? 'Мягкие ритуалы «Тишины» и «Дыхание 4-7-8».' : cyclePhase === 'ovulatory' ? 'Отличное время для активных ритуалов.' : 'Лёгкие ритуалы: «Самосострадание» или «Точка спокойствия».'}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 text-left w-full">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-4">Сравнение за 7 дней</span>
                        <div className="flex flex-col gap-3">
                          {[
                            { label: 'Вариабельность (ВСР)', val: healthMetrics.hrv, unit: 'мс', avg: 48, color: '#6ee7b7' },
                            { label: 'Качество сна', val: healthMetrics.sleepHours, unit: 'ч', avg: 7.1, color: '#a78bfa' },
                            { label: 'Дневная активность', val: healthMetrics.steps, unit: 'шагов', avg: 8000, color: '#e8e0d4' },
                            { label: 'Пульс покоя', val: healthMetrics.restingHR, unit: 'уд/м', avg: 65, color: '#fca5a5' }
                          ].map((item, idx) => {
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
                              <div key={idx} className="flex flex-col gap-1.5 pb-3 last:border-0 last:pb-0 border-b border-white/[0.04]">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-white/50">{item.label}</span>
                                  {hasData ? (
                                    <div className="flex gap-2 text-[11px]">
                                      <span className="text-white/70">{formatted}</span>
                                      <span className="text-white/15">/ {item.avg.toLocaleString()} {item.unit}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      Нет данных
                                    </span>
                                  )}
                                </div>
                                {hasData && (
                                  <div className="w-full h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.5 }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {dataQuality !== 'none' && (
                          <div className="mt-4 pt-4 border-t border-white/[0.04]">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-3">Вклад в Сияние</span>
                            <div className="flex flex-col gap-2">
                              {[
                                { label: 'ВСР', score: shine?.hrv ?? 0, weight: '30%', color: '#6ee7b7' },
                                { label: 'Сон', score: shine?.sleep ?? 0, weight: '25%', color: '#a78bfa' },
                                { label: 'Активность', score: shine?.activity ?? 0, weight: '25%', color: '#e8e0d4' },
                                { label: 'Пульс', score: shine?.restingHR ?? 0, weight: '20%', color: '#fca5a5' },
                              ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-[10px] text-white/40 w-20">{item.label}</span>
                                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color, opacity: 0.6 }} />
                                  </div>
                                  <span className="text-[10px] text-white/60 w-8 text-right">{item.score}</span>
                                  <span className="text-[9px] text-white/15 w-6">{item.weight}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB: Показатели */}
                {healthPage === 1 && (
                  <motion.div key="metrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-normal text-white/60">Показатели</h4>
                    </div>

                    {healthSource === 'none' && (
                      <div className="rounded-2xl border border-[#e8e0d4]/[0.12] bg-[#e8e0d4]/[0.04] p-5 flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-5 h-5 text-[#e8e0d4]/50" />
                          <span className="text-[13px] font-medium text-[#e8e0d4]/80">Данные недоступны</span>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          Подключите приложение здоровья или кольцо Ritual для автоматического отслеживания показателей.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleConnectHealth} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-white/70 hover:bg-white/[0.10] transition-all">
                            <Smartphone className="w-3.5 h-3.5" />
                            Подключить
                          </button>
                          <button onClick={() => window.open('https://ritual.store', '_blank')} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[11px] font-medium text-amber-300 hover:bg-amber-400/15 transition-all">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Купить кольцо
                          </button>
                        </div>
                      </div>
                    )}

                    {[
                      { key: 'sleep', title: 'Сон', rawVal: healthMetrics.sleepHours, icon: Moon, unit: 'ч', baseline: 7.1, insight: 'Твой сон стабилен. Глубокие фазы в норме.', color: '#a78bfa' },
                      { key: 'hrv', title: 'ВСР (Покой)', rawVal: healthMetrics.hrv, icon: Activity, unit: 'мс', baseline: 48, insight: 'Ключевой драйвер самочувствия. Высокая вариабельность = отличная кардиорегуляция.', color: '#6ee7b7' },
                      { key: 'hr', title: 'Пульс покоя', rawVal: healthMetrics.restingHR, icon: Heart, unit: 'уд/м', baseline: 65, insight: 'Пульс снижается — сердце разгружается.', inverted: true, color: '#fca5a5' },
                      { key: 'activity', title: 'Активность', rawVal: healthMetrics.steps, icon: Zap, unit: 'шагов', baseline: 8000, insight: (healthMetrics.steps ?? 0) >= 8000 ? 'Дневная норма выполнена.' : 'Продолжай накапливать активность.', color: '#fcd34d' },
                      { key: 'resp', title: 'Дыхание', rawVal: healthMetrics.respiratoryRate, icon: Wind, unit: 'дых/мин', baseline: 14, insight: 'Дыхание ровное, без признаков гипоксии.', color: '#38bdf8' },
                      { key: 'oxygen', title: 'SpO₂', rawVal: healthMetrics.spo2, icon: Eye, unit: '%', baseline: 97, insight: 'Идеальное насыщение крови кислородом.', color: '#2dd4bf' },
                      { key: 'temp', title: 'Температура', rawVal: healthMetrics.temperature, icon: Thermometer, unit: '°C', baseline: 36.4, insight: 'Терморегуляция спокойна.', color: '#f87171' },
                    ].map((metric) => {
                      const MIcon = metric.icon;
                      const isExpanded = expandedMetric === metric.key;
                      const hasData = metric.rawVal !== null && metric.rawVal !== undefined;
                      const val = metric.rawVal;
                      const healthMetricKey = metricKeyMap[metric.key];
                      const availability = healthMetricKey ? availabilityByMetric[healthMetricKey] : 'unavailable';

                      const formattedVal = hasData
                        ? metric.key === 'sleep'
                          ? `${Math.floor(val!)}ч ${Math.round((val! % 1) * 60)}м`
                          : metric.key === 'activity'
                            ? val!.toLocaleString()
                            : metric.key === 'oxygen'
                              ? `${val}%`
                              : metric.key === 'temp'
                                ? `${val} °C`
                                : `${val} ${metric.unit}`
                        : null;

                      return (
                        <div key={metric.key} className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
                          {/* Collapsed row */}
                          <div
                            onClick={() => {
                              if (hasData) {
                                setExpandedMetric(isExpanded ? null : metric.key);
                              } else {
                                setLockedMetric({ title: metric.title, status: availability });
                              }
                            }}
                            className="flex items-center justify-between p-3.5 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                <MIcon className={`w-4 h-4 ${hasData ? 'text-white/40' : 'text-white/15'}`} strokeWidth={2} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] text-white/40">{metric.title}</span>
                                {hasData ? (
                                  <span className="text-sm font-normal text-white/80">{formattedVal}</span>
                                ) : (
                                  <span className="text-[10px] text-white/40">{getAvailabilityLabel(availability)}</span>
                                )}
                              </div>
                            </div>
                            {hasData ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-medium ${val! > metric.baseline ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                                  {val! > metric.baseline ? '↑' : '↓'}
                                </span>
                                <svg className={`w-3 h-3 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                  <path d="M4.5 2.5L8 6L4.5 9.5" />
                                </svg>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3 text-white/15" />
                              </div>
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
                                <div className="px-4 pt-3 pb-5 border-t border-white/[0.04]">
                                  <div className="flex justify-between items-center mb-4">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-white/50 uppercase tracking-wide">Текущее</span>
                                      <span className="text-xs text-white/70 font-medium">{formattedVal}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[9px] text-white/50 uppercase tracking-wide">Базовая линия</span>
                                      <span className="text-xs text-white/40">{metric.baseline} {metric.unit}</span>
                                    </div>
                                  </div>

                                  {/* Custom 7-day Line Chart styled like Trends with labeled points */}
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
                                        <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 mb-4">
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
                                      <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 mb-4 flex flex-col items-center">
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
                                              stroke={metric.color || '#e8e0d4'}
                                              strokeWidth="3"
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

                                  {/* Insight */}
                                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                                    <p className="text-[12px] text-white/50 leading-relaxed font-normal pl-2 border-l border-white/[0.06]">{metric.insight}</p>
                                  </div>
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
                  const daysCount = activeAnalyticsList.length;

                  const points = activeAnalyticsList.map((dVal, i) => {
                    const x = daysCount === 7 
                      ? 20 + i * (260 / 6)
                      : 10 + i * (280 / (daysCount - 1));
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
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }} 
                      className="flex flex-col gap-6 px-1"
                    >
                      {/* Period selector - minimal inline tabs with active underline */}
                      <div className="flex justify-center gap-8 py-2 border-b border-white/[0.03]">
                        {(['7', '30', '90'] as const).map((key) => (
                          <button 
                            key={key} 
                            onClick={() => {
                              setAnalyticsPeriod(key);
                              setSelectedTrendDay(null); // reset selected index when switching periods
                            }} 
                            className={`text-[10px] font-mono tracking-widest uppercase transition-all relative pb-2.5 ${
                              analyticsPeriod === key 
                                ? 'text-[#E6B85C] font-bold' 
                                : 'text-white/40 hover:text-white/75'
                            }`}
                          >
                            {key === '7' ? 'Неделя' : key === '30' ? '30 дней' : '90 дней'}
                            {analyticsPeriod === key && (
                              <span className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-[#E6B85C]" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Main Chart Container - Completely unboxed minimalist layout */}
                      <div className="flex flex-col gap-5 relative select-none">
                        
                        {/* Header metrics */}
                        <div className="flex justify-between items-baseline">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Индекс Сияния и Практики</span>
                            <span className="text-xs text-white/50 font-normal mt-0.5">
                              {analyticsPeriod === '7' ? 'Детальный 7-дневный баланс' : `Динамика за ${analyticsPeriod} дней`}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[9px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E6B85C]" />
                              <span className="text-white/40">Сияние</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-sm bg-white/15" />
                              <span className="text-white/40">Практики</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive SVG Chart */}
                        <div className="w-full relative py-2">
                          {!hasEnoughTrendData && (
                            <div className="absolute inset-x-4 top-8 z-10 rounded-2xl border border-white/[0.05] bg-[#070709]/85 p-4 text-center">
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
                                    x1="5" 
                                    y1={yCoord} 
                                    x2={width - 5} 
                                    y2={yCoord} 
                                    stroke="rgba(255,255,255,0.4)" 
                                    strokeWidth="0.5" 
                                    strokeDasharray="2,2"
                                  />
                                  <text 
                                    x={width - 15} 
                                    y={yCoord - 3} 
                                    className="text-[7px] font-mono fill-white text-right"
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
                                stroke="#E6B85C"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="opacity-70"
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
                                <stop offset="0%" stopColor="#E6B85C" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#E6B85C" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Active Point Vertical Hairline */}
                            <line 
                              x1={points[selectedIndex].x} 
                              y1="10" 
                              x2={points[selectedIndex].x} 
                              y2="95" 
                              stroke="#E6B85C" 
                              strokeWidth="0.6" 
                              strokeDasharray="2,2"
                              className="opacity-40"
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
                                    fill={isSelected ? '#E6B85C' : '#070709'} 
                                    stroke="#E6B85C" 
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
                                  className={`text-[8px] font-mono transition-all duration-300 ${
                                    isSelected 
                                      ? 'fill-white font-medium' 
                                      : p.isToday 
                                        ? 'fill-[#E6B85C] font-semibold' 
                                        : 'fill-white/20'
                                  }`}
                                  textAnchor="middle"
                                >
                                  {p.label}
                                </text>
                              );
                            })}

                            {/* Clickable Overlay Columns across full SVG height */}
                            {points.map((p) => {
                              const colWidth = daysCount === 7 
                                ? (260 / 6)
                                : (280 / (daysCount - 1));
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
                      </div>

                      {/* SELECTED DAY DETAIL VIEW - Redesigned without cards/borders, using pure text layout and precise hairline separator */}
                      <div className="h-[1px] bg-white/[0.04] my-1" />
                      
                      <motion.div 
                        key={`detail-${currentSelectedDay.dateStr}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-4 py-1"
                      >
                        {/* Header info */}
                        <div className="flex justify-between items-baseline">
                          <span className="text-[13px] font-medium text-white/95">
                            {formatFriendlyDate(currentSelectedDay.dateStr, currentSelectedDay.isToday, currentSelectedDay.dayOfWeek)}
                          </span>
                          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Дневная сводка</span>
                        </div>

                        {/* Core indicators columns - separated by thin vertical lines, no card border/bg */}
                        <div className="grid grid-cols-2 gap-6 py-3 border-y border-white/[0.03]">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Индекс Сияния</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-semibold font-mono text-[#E6B85C]">
                                {currentSelectedDay.shineScore === null ? '—' : `${currentSelectedDay.shineScore}%`}
                              </span>
                              <span className="text-[9px] text-emerald-400/80 font-mono">
                                {currentSelectedDay.shineScore === null ? 'нет данных' : 'тонус'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 border-l border-white/[0.04] pl-6">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Выполнено сессий</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-semibold font-mono text-white">
                                {currentSelectedDay.practicesCount}
                              </span>
                              <span className="text-[10px] text-white/40 font-normal">
                                {currentSelectedDay.practicesCount === 1 ? 'сессия' : currentSelectedDay.practicesCount >= 2 && currentSelectedDay.practicesCount <= 4 ? 'сессии' : 'сессий'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Completed practices listed as clean inline rows */}
                        <div className="flex flex-col gap-1.5">
                          {dayPractices.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Выполненные ритуалы</span>
                              <div className="flex flex-col gap-1.5">
                                {dayPractices.map((p, pIdx) => (
                                  <div key={pIdx} className="flex items-center justify-between text-xs text-white/80 py-1 border-b border-white/[0.01]">
                                    <span className="flex items-center gap-2">
                                      <span className="text-white/40">🧘</span>
                                      <span className="font-medium">{p.practiceTitle}</span>
                                    </span>
                                    <span className="text-white/30 font-mono text-[10px]">{p.minutes} мин</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-white/35 italic leading-relaxed">
                              В этот день дыхательных практик и осознанных сессий не зафиксировано.
                            </p>
                          )}
                        </div>

                        {/* Bio-feedback advice */}
                        <p className="text-[11px] text-white/50 leading-relaxed font-normal">
                          {getShineAdvice(currentSelectedDay.shineScore)}
                        </p>
                      </motion.div>

                      {/* EDUCATIONAL GUIDE - Editorial help section with zero borders or backgrounds */}
                      <div className="h-[1px] bg-white/[0.04] my-2" />
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 text-[9px] font-mono font-bold">i</div>
                          <h5 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest font-mono">Расчет показателей</h5>
                        </div>
                        
                        <div className="flex flex-col gap-3 text-[11px] text-white/45 leading-relaxed font-normal">
                          <p>
                            Метрики объединяют биологическую обратную связь и поведенческие маркеры:
                          </p>
                          
                          <div className="flex flex-col gap-2.5 pl-0.5">
                            <div className="flex gap-2">
                              <span className="text-white/30 font-mono select-none">•</span>
                              <div>
                                <strong className="text-white/70 font-normal">Индекс Сияния (золотая линия):</strong> физиологический тонус (0-100%), рассчитанный только по реальным дневным данным HealthKit, Health Connect или кольца. Дни без биометрии не дорисовываются.
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <span className="text-white/30 font-mono select-none">•</span>
                              <div>
                                <strong className="text-white/70 font-normal">Осознанная активность (бары):</strong> накопленный объем сессий. Дыхание регулирует тонус блуждающего нерва, формируя физический буфер против стресса.
                              </div>
                            </div>
                          </div>

                          <p className="border-t border-white/[0.02] pt-2.5 text-[10px] text-white/30">
                            💡 Нажмите на любую точку графика для просмотра детальной истории за выбранную дату.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

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
      <AnimatePresence>
        {isIntentionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setIsIntentionModalOpen(false)} />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#0e0e16]/95 border-t border-white/10 rounded-t-[40px] px-6 pt-5 pb-8 shadow-2xl z-10 overflow-hidden flex flex-col gap-5 text-center"
            >
              {/* Grab bar */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-2" />

              {/* Header */}
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs text-white/40 uppercase tracking-widest font-mono">Намерение на день</span>
                <button
                  onClick={() => setIsIntentionModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Proposed intention display */}
              <div className="flex flex-col items-center gap-4 py-4 min-h-[140px] justify-center">
                <span className="text-[10px] text-amber-300 font-mono tracking-widest uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 animate-pulse">
                  Рекомендация по состоянию ({shineScore}%)
                </span>
                
                {isCustomInput ? (
                  <div className="w-full flex flex-col gap-2">
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Напишите своё намерение на сегодня..."
                      maxLength={100}
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/40 font-sans resize-none text-center"
                      autoFocus
                    />
                    <span className="text-[9px] text-white/30 self-end mr-2">
                      {customText.length}/100 символов
                    </span>
                  </div>
                ) : (
                  <motion.p
                    key={modalIntention}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg italic font-semibold text-white/90 leading-relaxed px-4"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    «{modalIntention}»
                  </motion.p>
                )}
              </div>

              {/* Action Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleNextIntention}
                  className="h-12 rounded-xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-xs font-semibold text-white/80 active:scale-95 transition-all"
                >
                  Другое
                </button>
                <button
                  onClick={() => setIsCustomInput(true)}
                  className={`h-12 rounded-xl border text-xs font-semibold active:scale-95 transition-all ${
                    isCustomInput
                      ? 'bg-amber-400/[0.04] border-amber-400 text-amber-300'
                      : 'bg-white/[0.04] border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-white/80'
                  }`}
                >
                  Написать своё
                </button>
              </div>

              {/* Confirm Action Button */}
              <button
                onClick={() => {
                  const selectedText = isCustomInput ? customText.trim() : modalIntention;
                  if (selectedText) {
                    setDailyFocus(selectedText);
                    const todayStr = getTodayDateString();
                    localStorage.setItem('ritual_day_focus', selectedText);
                    localStorage.setItem('ritual_day_focus_date', todayStr);
                    setFocusDate(todayStr);
                    // Clear previous evening reflection when setting new intention
                    localStorage.removeItem('ritual_reflection_date');
                    localStorage.removeItem('ritual_reflection_answer');
                    localStorage.removeItem('ritual_reflection_reaction');
                    setReflection({ answer: null, reactionText: '' });
                  }
                  setIsIntentionModalOpen(false);
                }}
                disabled={isCustomInput && !customText.trim()}
                className="w-full h-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-black font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none mt-2 shadow-lg shadow-amber-500/10 flex items-center justify-center text-sm"
              >
                Подтвердить
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <span>•</span>
                    <span className="text-xl">{activeArticle.emoji}</span>
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
                {lockedMetric.status === 'permission_denied'
                  ? 'Разрешите чтение этого показателя в Apple Health или Google Health Connect, затем обновите синхронизацию.'
                  : lockedMetric.status === 'no_recent_data'
                    ? 'Интеграция подключена, но за последние 7 дней этот показатель не передавался.'
                    : lockedMetric.status === 'unsupported'
                      ? 'Текущее устройство или источник здоровья не поддерживает этот показатель.'
                      : 'Этот показатель пока недоступен из подключенных источников.'}
              </p>

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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
