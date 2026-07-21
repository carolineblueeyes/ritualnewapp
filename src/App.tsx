import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Activity, Mic, X, Send, User, BookOpen } from 'lucide-react';
import { Practice, UserStats, ActiveTab } from './types';
import RitualDashboard from './components/RitualDashboard';
import PracticesList from './components/PracticesList';
import StatsPanel from './components/StatsPanel';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import SubscriptionModal from './components/SubscriptionModal';
import PracticePlayer from './components/PracticePlayer';
import { useHealthData } from './hooks/useHealthData';
import { updateMetricsAfterPractice } from './services/health/manager';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { notificationService, rescheduleAll, scheduleSocialInvite, scheduleSubscriptionWarning } from './services/notifications';
import { deriveRealStats, EMPTY_USER_STATS, parseStoredStats } from './services/progressStats';
import {
  PRIVACY_SAFE_SYNC_EVENT,
  syncPrivacySafeState,
  pullAllFromSupabase,
  requestPrivacySafeSync,
} from './services/supabase/privacySync';

import BreathingTool from './components/BreathingTool';
import ActivityTool from './components/ActivityTool';
import FocusTool from './components/FocusTool';
import AtmosphereTool from './components/AtmosphereTool';

import { scheduleSessionComplete } from './services/notifications';

interface PracticeLaunchContext {
  timelineSlotId?: string;
}

const INITIAL_PRACTICES: Practice[] = [
  {
    id: 'start-day',
    title: 'Начать день',
    mood: 'Энергия',
    iconName: 'Sun',
    duration: '2 мин',
    durationSec: 135,
    color: '#E67E22',
    accentClass: 'text-amber-500',
    bgGlowClass: 'from-amber-500/20',
    description: 'Активирующее дыхание для ясного ума и прилива сил на весь день.',
    breathingPattern: { inhale: 4, hold: 2, exhale: 4, holdEmpty: 0 },
    completed: false,
    rituals: [
      'Стакан теплой воды с лимоном',
      'Суставная разминка 2 мин',
      'Контрастный душ 3 мин'
    ]
  },
  {
    id: 'important-moment',
    title: 'Перед важным моментом',
    mood: 'Уверенность',
    iconName: 'Shield',
    duration: '3 мин',
    durationSec: 160,
    color: '#D4AF37',
    accentClass: 'text-amber-400',
    bgGlowClass: 'from-amber-400/20',
    description: 'Заземление и тактическое дыхание для ясности мыслей и преодоления волнения.',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
    completed: false,
    rituals: [
      'Расслабить челюсть и плечи',
      'Фокус на дыхании заземления',
      'Аффирмация: «Я спокоен и собран»'
    ]
  },
  {
    id: 'calm-down',
    title: 'Успокоиться',
    mood: 'Покой',
    iconName: 'Wind',
    duration: '3 мин',
    durationSec: 170,
    color: '#7A9BBA',
    accentClass: 'text-blue-400',
    bgGlowClass: 'from-blue-400/20',
    description: 'Успокаивающая практика для снятия мгновенного стресса или паники.',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
    completed: false,
    rituals: [
      'Удобное сидячее положение',
      'Ориентация: 5 предметов вокруг',
      'Выдох длиннее вдоха на 2 сек'
    ]
  },
  {
    id: 'pause',
    title: 'Пауза',
    mood: 'Баланс',
    iconName: 'Coffee',
    duration: '2 мин',
    durationSec: 95,
    color: '#9E9E9E',
    accentClass: 'text-slate-400',
    bgGlowClass: 'from-slate-400/20',
    description: 'Быстрый перезапуск нервной системы во время напряженной работы.',
    breathingPattern: { inhale: 3, hold: 3, exhale: 3, holdEmpty: 3 },
    completed: false,
    rituals: [
      'Отойти от стола и экранов',
      'Сделать несколько потягиваний',
      'Взгляд в окно вдаль на 1 мин'
    ]
  },
  {
    id: 'focus',
    title: 'Сосредоточиться',
    mood: 'Фокус',
    iconName: 'Brain',
    duration: '3 мин',
    durationSec: 152,
    color: '#A8D5E5',
    accentClass: 'text-sky-300',
    bgGlowClass: 'from-sky-300/20',
    description: 'Специальная ритмичная задержка дыхания для максимальной концентрации.',
    breathingPattern: { inhale: 5, hold: 5, exhale: 5, holdEmpty: 0 },
    completed: false,
    rituals: [
      'Закрыть лишние вкладки, режим DND',
      'Ровная осанка, опущенные плечи',
      'Запись 1 главной задачи сессии'
    ]
  },
  {
    id: 'restore',
    title: 'Восстановиться',
    mood: 'Сила',
    iconName: 'Zap',
    duration: '3 мин',
    durationSec: 152,
    color: '#E6B85C',
    accentClass: 'text-yellow-500',
    bgGlowClass: 'from-yellow-500/20',
    description: 'Глубокая вентиляция легких после физической или эмоциональной нагрузки.',
    breathingPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
    completed: false,
    rituals: [
      'Проветрить комнату',
      'Лечь на спину или позу ребенка',
      'Мышечное сканирование тела'
    ]
  },
  {
    id: 'end-day',
    title: 'Закончить день',
    mood: 'Сон',
    iconName: 'Moon',
    duration: '3 мин',
    durationSec: 190,
    color: '#8A2BE2',
    accentClass: 'text-purple-400',
    bgGlowClass: 'from-purple-400/20',
    description: 'Дыхание "4-7-8" для мягкого погружения в глубокий восстанавливающий сон.',
    breathingPattern: { inhale: 4, hold: 7, exhale: 8, holdEmpty: 0 },
    completed: false,
    rituals: [
      'Убрать гаджеты за 1 час',
      'Вспомнить и записать 3 благодарности',
      'Световое затенение: приглушить свет'
    ]
  }
];

const INITIAL_STATS: UserStats = { ...EMPTY_USER_STATS };

export default function App() {
  const {
    metrics: healthMetrics,
    source: healthSource,
    refresh: refreshHealth,
    shine,
    historyByMetric,
    availabilityByMetric,
  } = useHealthData();
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'today') {
      history.pushState({ tab }, '', `#${tab}`);
    } else {
      history.pushState({ tab: 'today' }, '', '#');
    }
  };
  const [practices, setPractices] = useState<Practice[]>(() => {
    const savedVersion = localStorage.getItem('ritual_practices_version');
    const CURRENT_VERSION = '2';
    if (savedVersion === CURRENT_VERSION) {
      const saved = localStorage.getItem('ritual_practices');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length === INITIAL_PRACTICES.length && parsed[0].id === INITIAL_PRACTICES[0].id && parsed.every((p: any) => p.rituals)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    localStorage.setItem('ritual_practices_version', CURRENT_VERSION);
    localStorage.setItem('ritual_practices', JSON.stringify(INITIAL_PRACTICES));
    return INITIAL_PRACTICES;
  });
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('ritual_stats');
    return saved ? parseStoredStats(saved) : INITIAL_STATS;
  });

  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('ritual_onboarding_completed') === 'true';
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    return localStorage.getItem('ritual_is_subscribed') === 'true';
  });

  const [showSubscription, setShowSubscription] = useState(false);
  const [activeTool, setActiveTool] = useState<'breathing' | 'activity' | 'focus' | 'atmosphere' | null>(null);
  const [activeAtmosphereDuration, setActiveAtmosphereDuration] = useState<number>(0);

  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [selectedTimelineSlotId, setSelectedTimelineSlotId] = useState<string | null>(null);
  const practiceCompletionHandledRef = useRef(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceReply, setVoiceReply] = useState('Привет! Как ты себя чувствуешь? Скажи мне, например: "я устал", "хочу спать" или "нужен фокус".');
  const [isListening, setIsListening] = useState(false);

  const isAnyOverlayOpen = showSubscription || activeTool !== null || selectedPractice !== null || isVoiceOpen || !onboardingCompleted;

  const syncPrivacySafeStateForCurrentUser = useCallback(async () => {
    if (!onboardingCompleted) return;

    await syncPrivacySafeState({
      stats: deriveRealStats(stats),
      shine,
      healthSource,
      onboardingCompleted,
    });
  }, [healthSource, onboardingCompleted, shine, stats]);

  const syncNotificationSchedule = useCallback(async (includeSocialInvite = false) => {
    if (!onboardingCompleted || !notificationService.isNotificationsEnabled()) return;
    if (!await notificationService.ensureReady()) return;

    await rescheduleAll();
    if (includeSocialInvite) {
      await scheduleSocialInvite();
    }
  }, [onboardingCompleted]);

  const requestNotificationAccessAfterOnboarding = useCallback(async () => {
    if (!notificationService.isNotificationsEnabled()) return;

    const granted = await notificationService.requestNotificationAccess();
    if (!granted) return;

    await rescheduleAll();
    await scheduleSocialInvite();
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
    window.setTimeout(() => {
      refreshHealth().catch(e => console.warn('[App] Failed to refresh health after onboarding:', e));
    }, 1200);
    window.setTimeout(() => {
      refreshHealth().catch(e => console.warn('[App] Failed to refresh health after onboarding settle:', e));
    }, 3500);
    window.setTimeout(() => {
      requestNotificationAccessAfterOnboarding()
        .catch(e => console.warn('[App] Failed to request notification access after onboarding:', e));
    }, 350);
  }, [refreshHealth, requestNotificationAccessAfterOnboarding]);

  useEffect(() => {
    document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isAnyOverlayOpen]);

  // StatusBar immersive mode
  useEffect(() => {
    const setupStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#00000000' });
      } catch (e) {}
    };
    setupStatusBar();
  }, []);

  // Initialize notifications on app start
  useEffect(() => {
    notificationService.init(
      (data) => {
        console.log('[App] Notification received in foreground:', data);
      },
      (data) => {
        console.log('[App] Notification opened with data:', data);
        const practiceId = data?.practiceId as string | undefined;
        const screen = data?.screen as string | undefined;
        const href = data?.href as string | undefined;
        
        if (practiceId) {
          try {
            const savedPractices = JSON.parse(localStorage.getItem('ritual_practices') || '[]');
            const found = savedPractices.find((p: any) => p.id === practiceId);
            if (found) {
              setSelectedTimelineSlotId(null);
              setSelectedPractice(found);
              return;
            }
          } catch (e) {
            console.warn('[App] Failed to find practice for notification:', e);
          }
        }

        if (screen === 'FocusTool') {
          setActiveTool('focus');
        } else if (screen === 'BreathingTool') {
          setActiveTool('breathing');
        } else if (screen === 'AtmosphereTool') {
          setActiveTool('atmosphere');
        } else if (screen === 'Dashboard') {
          setActiveTab('today');
        } else if (screen === 'Profile') {
          setActiveTab('profile');
        } else if (screen === 'Subscription') {
          setShowSubscription(true);
        } else if (href === '#today') {
          setActiveTab('today');
        } else if (href === '#practices') {
          setActiveTab('practices');
        } else if (href === '#progress') {
          setActiveTab('progress');
        } else if (href === '#profile') {
          setActiveTab('profile');
        }
      }
    )
      .then(async () => {
        if (localStorage.getItem('ritual_onboarding_completed') !== 'true') return;
        if (!notificationService.isNotificationsEnabled()) return;
        if (!await notificationService.ensureReady()) return;
        await rescheduleAll();
      })
      .catch(e => console.warn('[App] Notification init failed:', e));
  }, []);

  // Pull user preferences from Supabase on app start
  useEffect(() => {
    if (!onboardingCompleted) return;
    pullAllFromSupabase()
      .then(() => {
        const sub = localStorage.getItem('ritual_is_subscribed') === 'true';
        setIsSubscribed(sub);
      })
      .catch(() => {});
  }, [onboardingCompleted]);

  // Reschedule notifications when onboarding completes
  useEffect(() => {
    syncNotificationSchedule(true).catch(e => console.warn('[App] Failed to reschedule notifications:', e));
  }, [syncNotificationSchedule]);

  // Restore reminder schedule when the app returns to foreground.
  useEffect(() => {
    const handler = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      syncNotificationSchedule().catch(e => console.warn('[App] Failed to restore notifications:', e));
    });

    return () => { handler.then(h => h.remove()); };
  }, [syncNotificationSchedule]);

  // Check subscription expiry
  useEffect(() => {
    if (isSubscribed) {
      const expiresStr = localStorage.getItem('ritual_subscription_expires');
      if (expiresStr) {
        const expires = new Date(expiresStr);
        const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3 && daysLeft > 0) {
          scheduleSubscriptionWarning(daysLeft);
        }
      }
    }
  }, [isSubscribed]);

  // Back button handler for Android
  useEffect(() => {
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (showSubscription) {
        setShowSubscription(false);
      } else if (activeTool !== null) {
        setActiveTool(null);
      } else if (selectedPractice !== null) {
        setSelectedTimelineSlotId(null);
        setSelectedPractice(null);
      } else if (isVoiceOpen) {
        setIsVoiceOpen(false);
        setIsListening(false);
      } else if (activeTab !== 'today') {
        switchTab('today');
      } else {
        CapApp.exitApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [showSubscription, activeTool, selectedPractice, isVoiceOpen, activeTab]);

  useEffect(() => {
    localStorage.setItem('ritual_practices', JSON.stringify(practices));
  }, [practices]);

  useEffect(() => {
    localStorage.setItem('ritual_stats', JSON.stringify(deriveRealStats(stats)));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('ritual_onboarding_completed', onboardingCompleted ? 'true' : 'false');
  }, [onboardingCompleted]);

  useEffect(() => {
    localStorage.setItem('ritual_is_subscribed', isSubscribed ? 'true' : 'false');
    if (onboardingCompleted) {
      requestPrivacySafeSync();
    }
  }, [isSubscribed, onboardingCompleted]);

  useEffect(() => {
    if (!onboardingCompleted) return;

    const timeoutId = window.setTimeout(() => {
      syncPrivacySafeStateForCurrentUser()
        .catch(e => console.warn('[App] Privacy-safe Supabase sync failed:', e));
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [onboardingCompleted, syncPrivacySafeStateForCurrentUser]);

  useEffect(() => {
    const handler = () => {
      syncPrivacySafeStateForCurrentUser()
        .catch(e => console.warn('[App] Privacy-safe Supabase sync failed:', e));
    };

    window.addEventListener(PRIVACY_SAFE_SYNC_EVENT, handler);
    return () => window.removeEventListener(PRIVACY_SAFE_SYNC_EVENT, handler);
  }, [syncPrivacySafeStateForCurrentUser]);

  const getTodayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const markTimelineSlotCompleted = (slotId: string) => {
    const storageKey = `ritual_completed_slots_${getTodayDateKey()}`;
    try {
      const saved = localStorage.getItem(storageKey);
      const completedSlots = saved ? JSON.parse(saved) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...completedSlots, [slotId]: true }));
    } catch {
      localStorage.setItem(storageKey, JSON.stringify({ [slotId]: true }));
    }
  };

  const closeSelectedPractice = () => {
    setSelectedTimelineSlotId(null);
    setSelectedPractice(null);
  };

  const handleSelectPractice = (practice: Practice, context?: PracticeLaunchContext) => {
    practiceCompletionHandledRef.current = false;
    setSelectedTimelineSlotId(context?.timelineSlotId ?? null);
    setSelectedPractice(practice);
  };

  const getCompletedPracticeMinutes = (practice: Practice, _elapsedSeconds?: number) => {
    const fallbackSeconds = Number(practice.durationSec) || 60;
    return Math.max(1, Math.round((fallbackSeconds / 60) * 10) / 10);
  };

  const handleCompletePractice = (elapsedSeconds?: number) => {
    if (!selectedPractice) return;
    if (practiceCompletionHandledRef.current) return;
    practiceCompletionHandledRef.current = true;

    const updatedPractices = practices.map((p) => {
      if (p.id === selectedPractice.id) {
        return { ...p, completed: true };
      }
      return p;
    });
    setPractices(updatedPractices);

    const mins = getCompletedPracticeMinutes(selectedPractice, elapsedSeconds);
    addPracticeMinutes(mins, selectedPractice.id, selectedPractice.title);
    if (selectedTimelineSlotId) {
      markTimelineSlotCompleted(selectedTimelineSlotId);
    }
    closeSelectedPractice();
  };

  const addPracticeMinutes = (mins: number, practiceId: string, title: string) => {
    const now = new Date();
    const timeStr = `Сегодня, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Update persistent health metrics based on practice
    updateMetricsAfterPractice(practiceId, mins);
    // Refresh health data hook to update shine score and metrics immediately
    refreshHealth();

    // Calculate practice points based on duration (more minutes = more points)
    const practicePoints = Math.min(15, Math.floor(mins / 15));
    
    setStats((prev) => {
      const newShineScore = Math.min(100, prev.shineScore + practicePoints);
      return deriveRealStats({
        shineScore: newShineScore,
        completedCount: prev.completedCount,
        streakDays: prev.streakDays,
        totalMinutes: prev.totalMinutes,
        history: [
          {
            date: timeStr,
            practiceId: practiceId,
            practiceTitle: title,
            minutes: mins
          },
          ...prev.history
        ]
      });
    });
  };

  const handleVoiceSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voiceQuery.trim()) return;

    const query = voiceQuery.toLowerCase().trim();
    setVoiceQuery('');
    setIsListening(false);

    if (query.includes('устал') || query.includes('устала') || query.includes('сил нет')) {
      setVoiceReply('Понимаю. Твоему телу нужно восстановиться. Попробуй «Восстановиться» — 7 минут дыхания.');
    } else if (query.includes('спать') || query.includes('сон') || query.includes('ночь') || query.includes('заснуть')) {
      setVoiceReply('Перед сном важно замедлить ритм. Попробуй «Закончить день» — дыхание 4-7-8.');
    } else if (query.includes('фокус') || query.includes('сосредоточ') || query.includes('работать') || query.includes('учеба')) {
      setVoiceReply('Для концентрации подходит «Сосредоточиться» — 10 минут ритмичного дыхания.');
    } else if (query.includes('важн') || query.includes('выступлен') || query.includes('встреч') || query.includes('собеседов') || query.includes('экзамен') || query.includes('волнен')) {
      setVoiceReply('Перед важным событием нужно заземлиться. Попробуй «Перед важным моментом» — 4 минуты заземления и силы.');
    } else if (query.includes('тревога') || query.includes('нерв') || query.includes('успоко')) {
      setVoiceReply('Сделай вдох на 4 счёта и выдох на 4. Или запусти «Успокоиться» — 8 минут.');
    } else if (query.includes('привет') || query.includes('здравствуй')) {
      setVoiceReply(`Привет! Твой индекс Сияния: ${shine.total}%. Какое у тебя настроение?`);
    } else {
      setVoiceReply('Попробуй «Паузу» — 3 минуты для перезапуска нервной системы.');
    }
  };

  const startListeningDemo = () => {
    setIsListening(true);
    setVoiceQuery('');
    setVoiceReply('Слушаю...');
    
    setTimeout(() => {
      const demoQueries = ['я устал', 'хочу спать', 'нужен фокус', 'как успокоиться'];
      const randomQuery = demoQueries[Math.floor(Math.random() * demoQueries.length)];
      setVoiceQuery(randomQuery);
    }, 2500);
  };

  const handleResetAll = () => {
    if (window.confirm('Вы действительно хотите полностью сбросить профиль и начать сначала?')) {
      setPractices(INITIAL_PRACTICES);
      setStats(INITIAL_STATS);
      setOnboardingCompleted(false);
      setIsSubscribed(false);
      localStorage.clear();
      setActiveTab('today');
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col justify-between overflow-x-hidden font-sans">
      
      {/* Subtle background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black" />

      {!selectedPractice && (
        <>
          {/* Top header */}
          <header className="relative z-10 w-full max-w-md mx-auto pt-[calc(env(safe-area-inset-top)+1.5rem)] px-6 flex justify-between items-center">
            <button 
              onClick={() => switchTab('profile')}
              className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <User className="w-4 h-4 text-white/40" strokeWidth={2} />
            </button>
            <button 
              onClick={() => setShowSubscription(true)}
              className={`text-[11px] font-medium tracking-wide transition-colors ${
                isSubscribed ? 'text-white/60 hover:text-white/80' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              {isSubscribed ? 'Plus' : 'Lite →'}
            </button>
          </header>

          {/* Main content */}
          <main className="relative flex-1 w-full max-w-md mx-auto px-5 pt-4 pb-24">
            <AnimatePresence mode="wait">
              {activeTab === 'today' && (
                <motion.div
                  key="today"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <RitualDashboard 
                    practices={practices}
                    stats={stats}
                    onSelectPractice={handleSelectPractice}
                    shine={shine}
                    healthSource={healthSource}
                    healthMetrics={healthMetrics}
                    historyByMetric={historyByMetric}
                    availabilityByMetric={availabilityByMetric}
                    onRefreshHealth={refreshHealth}
                  />
                </motion.div>
              )}

              {activeTab === 'practices' && (
                <motion.div
                  key="practices"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PracticesList 
                    practices={practices}
                    onSelectPractice={handleSelectPractice}
                    onSelectTool={(toolId) => setActiveTool(toolId)}
                  />
                </motion.div>
              )}

              {activeTab === 'progress' && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <StatsPanel 
                    stats={stats}
                    practices={practices}
                    onAddMinutes={(mins) => addPracticeMinutes(mins, 'path-attention', 'Путь Внимания')}
                  />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Profile 
                    isSubscribed={isSubscribed}
                    onOpenSubscription={() => setShowSubscription(true)}
                    onResetAll={handleResetAll}
                    onSignOut={() => setOnboardingCompleted(false)}
                    stats={stats}
                    healthSource={healthSource}
                    onRefreshHealth={refreshHealth}
                    onSyncMetrics={(newMetrics) => {
                      refreshHealth();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Bottom navigation */}
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] left-1/2 -translate-x-1/2 w-full max-w-[340px] px-4 z-[15] flex items-center gap-2">
            {/* Main nav pill */}
            <nav className="flex items-center h-[52px] flex-1 px-2 bg-[#111114]/90 backdrop-blur-xl rounded-full border border-white/[0.06]">
              
              <button 
                onClick={() => switchTab('today')}
                className={`flex flex-col items-center justify-center gap-[2px] flex-1 transition-colors duration-300 ${
                  activeTab === 'today' ? 'text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Sun className="w-[17px] h-[17px]" strokeWidth={2.5} />
                <span className="text-[9px] font-medium tracking-wider">Сегодня</span>
              </button>

              <button 
                onClick={() => switchTab('practices')}
                className={`flex flex-col items-center justify-center gap-[2px] flex-1 transition-colors duration-300 ${
                  activeTab === 'practices' ? 'text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                <BookOpen className="w-[17px] h-[17px]" strokeWidth={2.5} />
                <span className="text-[9px] font-medium tracking-wider">Практики</span>
              </button>

              <button 
                onClick={() => switchTab('progress')}
                className={`flex flex-col items-center justify-center gap-[2px] flex-1 transition-colors duration-300 ${
                  activeTab === 'progress' ? 'text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Activity className="w-[17px] h-[17px]" strokeWidth={2.5} />
                <span className="text-[9px] font-medium tracking-wider">Прогресс</span>
              </button>
            </nav>

            {/* Mic pill — separate */}
            <button 
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-white/[0.08] border border-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white active:scale-95 transition-all flex-shrink-0"
            >
              <Mic className="w-[18px] h-[18px]" strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      {/* Practice player overlay */}
      {selectedPractice && (
        <PracticePlayer
          practice={selectedPractice}
          onClose={closeSelectedPractice}
          onComplete={handleCompletePractice}
        />
      )}

      {/* Tools overlays */}
      <AnimatePresence>
        {activeTool === 'breathing' && (
          <BreathingTool 
            onClose={() => setActiveTool(null)} 
            onAddMinutes={addPracticeMinutes}
          />
        )}
        {activeTool === 'activity' && (
          <ActivityTool onClose={() => setActiveTool(null)} />
        )}
        {activeTool === 'focus' && (
          <FocusTool 
            onClose={() => setActiveTool(null)} 
            onAddMinutes={addPracticeMinutes}
          />
        )}
        {activeTool === 'atmosphere' && (
          <AtmosphereTool 
            onClose={() => setActiveTool(null)} 
            onAddMinutes={addPracticeMinutes}
          />
        )}
      </AnimatePresence>

      {/* Onboarding */}
      <AnimatePresence>
        {!onboardingCompleted && (
          <Onboarding onComplete={handleOnboardingComplete} onRefreshHealth={refreshHealth} />
        )}
      </AnimatePresence>

      {/* Subscription modal */}
      <AnimatePresence>
        {showSubscription && (
          <SubscriptionModal 
            onClose={() => setShowSubscription(false)} 
            onSubscribe={() => {
              setIsSubscribed(true);
              setShowSubscription(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* AI voice assistant overlay */}
      <AnimatePresence>
        {isVoiceOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#070709]/98 backdrop-blur-2xl flex flex-col justify-end p-6"
          >
            {/* Header */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
              <span className="text-[10px] tracking-[0.2em] text-white/60 uppercase">Ассистент</span>
              <button 
                onClick={() => {
                  setIsVoiceOpen(false);
                  setIsListening(false);
                }}
                className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Sound wave + reply */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="flex items-center justify-center gap-1 h-16">
                {[...Array(7)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{
                      height: isListening 
                        ? [16, Math.random() * 50 + 16, 16] 
                        : [16, Math.sin(i) * 8 + 16, 16]
                    }}
                    transition={{
                      duration: isListening ? 0.6 : 1.5,
                      repeat: Infinity,
                      delay: i * 0.08
                    }}
                    className="w-1 rounded-full bg-[#e8e0d4]/40"
                    style={{ opacity: isListening ? 0.7 : 0.25 }}
                  />
                ))}
              </div>

              <div className="max-w-sm text-center px-4">
                <motion.div 
                  key={voiceReply}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5 text-sm leading-relaxed text-white/80"
                >
                  <p>{voiceReply}</p>
                </motion.div>
                
                {isListening && (
                  <span className="text-xs text-[#e8e0d4]/60 tracking-wider mt-4 block">
                    Слушаю...
                  </span>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="w-full max-w-md mx-auto flex flex-col gap-3 pb-6">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button 
                  onClick={() => {
                    setVoiceQuery('я устал');
                    setTimeout(() => handleVoiceSubmit(), 10);
                  }}
                  className="flex-none px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] text-xs text-white/50 transition-all"
                >
                  Я устал
                </button>
                <button 
                  onClick={() => {
                    setVoiceQuery('хочу спать');
                    setTimeout(() => handleVoiceSubmit(), 10);
                  }}
                  className="flex-none px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] text-xs text-white/50 transition-all"
                >
                  Хочу спать
                </button>
                <button 
                  onClick={() => {
                    setVoiceQuery('нужен фокус');
                    setTimeout(() => handleVoiceSubmit(), 10);
                  }}
                  className="flex-none px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] text-xs text-white/50 transition-all"
                >
                  Нужен фокус
                </button>
              </div>

              <form onSubmit={handleVoiceSubmit} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={startListeningDemo}
                  className="h-11 w-11 rounded-2xl bg-[#e8e0d4] text-[#070709] flex items-center justify-center active:scale-95 transition-all"
                >
                  <Mic className="w-[18px] h-[18px] stroke-[2]" />
                </button>

                <div className="flex-1 relative flex items-center">
                  <input 
                    type="text"
                    value={voiceQuery}
                    onChange={(e) => setVoiceQuery(e.target.value)}
                    placeholder="Состояние..."
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] font-sans"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/60 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
