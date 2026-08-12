import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Play, Pause,
  StopCircle, Check,
} from 'lucide-react';
import ActivityMap from './ActivityMap';
import { geolocationService, GeoPoint } from '../services/geolocation';
import { getAuthDisplayName, getCurrentAuthUser, onAuthChanged } from '../services/supabase/auth';
import GlassSurface from './ui/GlassSurface';

interface ActivityToolProps {
  onClose: () => void;
  color?: string;
}

type ActivityType = 'run' | 'walk' | 'bike' | 'swim' | 'dance' | 'yoga' | 'gym';

const ACTIVITIES_WITH_MAP: ActivityType[] = ['run', 'walk', 'bike', 'yoga'];

const HEART_RATE_RANGES: Record<ActivityType, [number, number]> = {
  run: [120, 160],
  walk: [100, 130],
  bike: [115, 150],
  swim: [120, 155],
  dance: [90, 120],
  yoga: [70, 100],
  gym: [90, 130],
};

const CALORIE_RATES: Record<ActivityType, number> = {
  run: 0.22,
  walk: 0.08,
  bike: 0.18,
  swim: 0.25,
  dance: 0.15,
  yoga: 0.1,
  gym: 0.2,
};

const typeLabels: Record<ActivityType, string> = {
  run: 'Бег',
  walk: 'Ходьба',
  bike: 'Велосипед',
  swim: 'Плавание',
  dance: 'Танцы',
  yoga: 'Йога',
  gym: 'Силовая',
};

const ACCENT = '#C56855';
const AMBER = '#C59A55';

const intensityLabels = { easy: 'Лёгкая', steady: 'Ровная', hard: 'Интенсивная' };

const TARGET_TYPE_LABELS: Record<'duration' | 'distance' | 'calories' | 'heartZone', string> = {
  duration: 'Время',
  distance: 'Дистанция',
  calories: 'Калории',
  heartZone: 'Пульсовая зона',
};

const TARGET_UNITS: Record<'duration' | 'distance' | 'calories' | 'heartZone', string> = {
  duration: 'мин',
  distance: 'км',
  calories: 'ккал',
  heartZone: 'зона',
};

const TARGET_VALUES: Record<'duration' | 'distance' | 'calories' | 'heartZone', number[]> = {
  duration: [15, 20, 30, 45, 60, 75, 90, 120],
  distance: [1, 3, 5, 7, 10, 15, 21, 42],
  calories: [100, 200, 300, 400, 500, 750, 1000],
  heartZone: [1, 2, 3, 4, 5],
};

function TargetValuePicker({
  targetType,
  value,
  onChange,
  accent,
}: {
  targetType: 'duration' | 'distance' | 'calories' | 'heartZone';
  value: number;
  onChange: (value: number) => void;
  accent: string;
}) {
  const values = TARGET_VALUES[targetType];
  const unit = TARGET_UNITS[targetType];

  return (
    <section className="flex flex-col gap-4 py-2">
      <div>
        <span className="text-[13px] text-[#F2EFE8]/42">{TARGET_TYPE_LABELS[targetType]}</span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[56px] font-light leading-none tabular-nums" style={{ color: accent }}>
            {value}
          </span>
          <span className="text-[15px] text-[#F2EFE8]/42 pb-1">{unit}</span>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1 overscroll-x-contain touch-pan-x">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-none min-w-[52px] px-3 py-2.5 rounded-full text-[13px] tabular-nums transition-colors duration-[160ms] ${
              option === value
                ? 'bg-white/[0.10] text-[#F2EFE8]/92'
                : 'text-[#F2EFE8]/42 border border-[rgba(242,239,232,0.12)]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-4 border-b border-[rgba(242,239,232,0.12)]">
      <span className="text-[13px] text-[#F2EFE8]/42">{label}</span>
      <span className="font-display text-2xl font-light tabular-nums text-[#F2EFE8]/90 text-right">
        {value}
        {unit ? <span className="text-[13px] text-[#F2EFE8]/42 ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

export default function ActivityTool({ onClose }: ActivityToolProps) {
  const [mode, setMode] = useState<'free' | 'target'>('free');
  const [selectedType, setSelectedType] = useState<ActivityType>('run');
  const [targetType, setTargetType] = useState<'distance' | 'duration' | 'calories' | 'heartZone'>('duration');
  const [targetValue, setTargetValue] = useState(30);
  const [intensity, setIntensity] = useState<'easy' | 'steady' | 'hard'>('steady');

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [distance, setDistance] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [mapRevealState, setMapRevealState] = useState<'hidden' | 'revealing' | 'revealed'>('hidden');

  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<GeoPoint[]>([]);
  const [heartRate, setHeartRate] = useState(0);
  const [authDisplayName, setAuthDisplayName] = useState('');

  const trackerInterval = useRef<NodeJS.Timeout | null>(null);
  const heartRateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initGps = async () => {
      const granted = await geolocationService.requestPermission();
      if (granted) {
        const pos = await geolocationService.getCurrentPosition();
        if (pos) setCurrentPosition(pos);
      }
    };
    initGps();
  }, []);

  useEffect(() => {
    let mounted = true;
    getCurrentAuthUser()
      .then(user => { if (mounted) setAuthDisplayName(getAuthDisplayName(user)); })
      .catch(() => {});
    const unsubscribe = onAuthChanged(session => {
      if (mounted) setAuthDisplayName(getAuthDisplayName(session?.user ?? null));
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      trackerInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        const burnRate = CALORIE_RATES[selectedType] || 0.15;
        setCaloriesBurned(prev => prev + burnRate);
      }, 1000);
    } else if (trackerInterval.current) {
      clearInterval(trackerInterval.current);
    }
    return () => { if (trackerInterval.current) clearInterval(trackerInterval.current); };
  }, [isRecording, isPaused, selectedType]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const [min, max] = HEART_RATE_RANGES[selectedType] || [120, 160];
      setHeartRate(Math.floor((min + max) / 2));
      heartRateInterval.current = setInterval(() => {
        setHeartRate(prev => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.max(min, Math.min(max, prev + delta));
        });
      }, 1000);
    } else if (heartRateInterval.current) {
      clearInterval(heartRateInterval.current);
    }
    return () => { if (heartRateInterval.current) clearInterval(heartRateInterval.current); };
  }, [isRecording, isPaused, selectedType]);

  useEffect(() => {
    if (isRecording && !isPaused && routePoints.length > 0) {
      setDistance(geolocationService.getTotalDistance(routePoints));
    }
  }, [routePoints, isRecording, isPaused]);

  const onPointReceived = useCallback((point: GeoPoint) => {
    setRoutePoints(prev => [...prev, point]);
    setCurrentPosition({ lat: point.lat, lng: point.lng });
  }, []);

  const startTracking = () => {
    setMapRevealState('revealing');
    setTimeout(() => {
      setIsRecording(true);
      setIsPaused(false);
      setElapsedTime(0);
      setCaloriesBurned(0);
      setDistance(0);
      setRoutePoints([]);
      setHeartRate(0);
      setShowSummary(false);
      setMapRevealState('revealed');
      geolocationService.startTracking(onPointReceived);
    }, 1800);
  };

  const stopTracking = () => {
    geolocationService.stopTracking();
    setIsRecording(false);
    setDistance(geolocationService.getTotalDistance(routePoints));
    setShowSummary(true);

    if (routePoints.length > 0 || elapsedTime > 5) {
      const workout = {
        type: selectedType,
        date: new Date().toISOString(),
        duration: elapsedTime,
        distance: geolocationService.getTotalDistance(routePoints),
        calories: Math.round(caloriesBurned),
        route: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
      };
      const saved = localStorage.getItem('ritual_workouts');
      const workouts = saved ? JSON.parse(saved) : [];
      workouts.unshift(workout);
      localStorage.setItem('ritual_workouts', JSON.stringify(workouts.slice(0, 50)));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 && hrs > 0 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const finalTime = elapsedTime > 5 ? elapsedTime : 765;
  const finalDistance = distance > 0.05 ? distance : 0;
  const finalCalories = caloriesBurned > 5 ? Math.round(caloriesBurned) : 0;

  const formatPace = (sec: number, km: number) => {
    if (km <= 0) return '—';
    const totalMinutes = (sec / 60) / km;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const summaryRoute = useMemo(() => {
    if (routePoints.length >= 3) return routePoints;
    if (!currentPosition) return [];
    const points: GeoPoint[] = [];
    let curLat = currentPosition.lat;
    let curLng = currentPosition.lng;
    const ts = Date.now();
    for (let i = 0; i < 12; i++) {
      points.push({ lat: curLat, lng: curLng, timestamp: ts + i * 10000 });
      curLat += 0.0008 * Math.sin(i * 0.7);
      curLng += 0.0008 * Math.cos(i * 0.5);
    }
    return points;
  }, [routePoints, currentPosition]);

  const userName = useMemo(() => {
    const localName = localStorage.getItem('ritual_user_name') || '';
    const displayName = localName || authDisplayName;
    if (displayName?.includes('@')) {
      const clean = displayName.split('@')[0].replace(/[0-9_.]/g, ' ').trim();
      if (clean) return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return displayName || 'Гость';
  }, [authDisplayName]);

  const getActivityTitle = () => {
    const hr = new Date().getHours();
    const prefix = hr >= 5 && hr < 12 ? 'Утренний' : hr >= 17 && hr < 22 ? 'Вечерний' : hr >= 22 || hr < 5 ? 'Ночной' : 'Дневной';
    return `${prefix} ${typeLabels[selectedType].toLowerCase()}`;
  };

  const targetGoalUnit = mode === 'target' ? TARGET_UNITS[targetType] : undefined;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[180] h-[100dvh] bg-[#08090A] text-[#F2EFE8] flex flex-col select-none overflow-hidden">
      <style>{`
        @keyframes reveal-ripple {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(22); opacity: 0; }
        }
      `}</style>

      {ACTIVITIES_WITH_MAP.includes(selectedType) && !showSummary && (
        <div
          className="absolute inset-0 z-0 transition-all duration-[1800ms] ease-out"
          style={{ clipPath: mapRevealState === 'hidden' ? 'circle(0% at 50% 55%)' : 'circle(150% at 50% 55%)' }}
        >
          <ActivityMap center={currentPosition || undefined} route={routePoints} followUser={isRecording} height="100%" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08090A]/90 via-[#08090A]/30 to-[#08090A]/95 pointer-events-none" />
        </div>
      )}

      {(!ACTIVITIES_WITH_MAP.includes(selectedType) || showSummary || mapRevealState === 'hidden') && !isRecording && (
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle at 50% 25%, ${ACCENT}33, transparent 60%)` }}
        />
      )}

      {ACTIVITIES_WITH_MAP.includes(selectedType) && !showSummary && !isRecording && mapRevealState !== 'revealing' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative flex items-center justify-center">
            {mapRevealState === 'hidden' && (
              <div className="absolute w-10 h-10 rounded-full border border-[#C56855]/40 animate-[reveal-ripple_2s_ease-out_infinite]" />
            )}
            <div className="w-4 h-4 rounded-full border-2 border-[#F2EFE8]/80" style={{ backgroundColor: ACCENT }} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isRecording && !showSummary ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex flex-1 flex-col min-h-0 max-w-md mx-auto w-full"
          >
            <header className="shrink-0 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-4 flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                aria-label="Назад"
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
              >
                <ChevronLeft className="w-4 h-4 text-[#F2EFE8]/60" />
              </button>
              <span className="text-[13px] text-[#F2EFE8]/42">Активность</span>
              <div className="w-9" />
            </header>

            {mapRevealState === 'revealing' ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center gap-3 px-5">
                <p className="font-display text-[22px] font-light text-[#F2EFE8]/85">Готовим пространство</p>
                <p className="text-[13px] text-[#F2EFE8]/42">Сонастройка геолокации</p>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain hide-scrollbar px-5 pb-4">
                  <GlassSurface className="p-1 grid grid-cols-2 gap-1 mb-6">
                    {(['free', 'target'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`py-2.5 rounded-[18px] text-[13px] font-medium transition-colors duration-[160ms] ${
                          mode === m ? 'bg-white/[0.10] text-[#F2EFE8]/92' : 'text-[#F2EFE8]/42'
                        }`}
                      >
                        {m === 'free' ? 'Свободная' : 'По цели'}
                      </button>
                    ))}
                  </GlassSurface>

                  {mode === 'target' && (
                    <div className="mb-8 flex flex-col gap-6">
                      <div className="flex gap-4 overflow-x-auto hide-scrollbar border-b border-[rgba(242,239,232,0.12)] overscroll-x-contain touch-pan-x">
                        {(['duration', 'distance', 'calories', 'heartZone'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTargetType(t);
                              setTargetValue(TARGET_VALUES[t][Math.min(2, TARGET_VALUES[t].length - 1)]);
                            }}
                            className={`flex-none pb-3 text-[13px] border-b transition-colors duration-[160ms] ${
                              targetType === t
                                ? 'border-[#F2EFE8]/70 text-[#F2EFE8]/92'
                                : 'border-transparent text-[#F2EFE8]/42'
                            }`}
                          >
                            {TARGET_TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>

                      <TargetValuePicker
                        targetType={targetType}
                        value={targetValue}
                        onChange={setTargetValue}
                        accent={ACCENT}
                      />

                      <div>
                        <span className="text-[13px] text-[#F2EFE8]/42 block mb-3">Интенсивность</span>
                        <div className="flex border-b border-[rgba(242,239,232,0.12)]">
                          {(['easy', 'steady', 'hard'] as const).map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setIntensity(item)}
                              className={`flex-1 py-3 text-[13px] border-b transition-colors duration-[160ms] ${
                                intensity === item
                                  ? 'border-[#F2EFE8]/70 text-[#F2EFE8]/92'
                                  : 'border-transparent text-[#F2EFE8]/42'
                              }`}
                            >
                              {intensityLabels[item]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <span className="text-[13px] text-[#F2EFE8]/42 block mb-3">Тип</span>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 overscroll-x-contain touch-pan-x">
                      {(['run', 'walk', 'bike', 'swim', 'dance', 'yoga', 'gym'] as ActivityType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(type)}
                          className={`flex-none px-4 py-2.5 rounded-full text-[13px] transition-colors duration-[160ms] ${
                            selectedType === type
                              ? 'bg-white/[0.10] text-[#F2EFE8]/92'
                              : 'text-[#F2EFE8]/42 border border-[rgba(242,239,232,0.12)]'
                          }`}
                        >
                          {typeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <footer className="shrink-0 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] border-t border-[rgba(242,239,232,0.12)] bg-[#08090A]/95 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={startTracking}
                    className="w-full h-12 rounded-[18px] bg-[#F2EFE8] text-[#08090A] text-[15px] font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Начать
                  </button>
                </footer>
              </>
            )}
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
          >
            <div className="flex justify-between items-center py-2 border-b border-[rgba(242,239,232,0.12)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C56855] animate-pulse" />
                <span className="text-[13px] text-[#F2EFE8]/60">Запись</span>
              </div>
              <span className="text-[13px] text-[#F2EFE8]/70">{typeLabels[selectedType]}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="font-display text-[72px] font-light leading-none tabular-nums">{formatTime(elapsedTime)}</span>
              <span className="text-[13px] text-[#F2EFE8]/42 mt-2">время в движении</span>
            </div>

            <div className="border-t border-[rgba(242,239,232,0.12)]">
              <MetricRow label="Пульс" value={String(heartRate)} unit="уд/мин" />
              <MetricRow label="Дистанция" value={distance.toFixed(2)} unit="км" />
              <MetricRow label="Калории" value={String(Math.round(caloriesBurned))} unit="ккал" />
              <MetricRow
                label="Цель"
                value={mode === 'target' ? String(targetValue) : '—'}
                unit={targetGoalUnit}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 h-12 rounded-[18px] bg-white/[0.06] border border-white/10 text-[15px] font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
              >
                {isPaused ? <Play className="w-4 h-4" style={{ color: AMBER }} /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Продолжить' : 'Пауза'}
              </button>
              <button
                type="button"
                onClick={stopTracking}
                className="px-5 h-12 rounded-[18px] bg-[#C56855] text-[#F2EFE8] font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
              >
                <StopCircle className="w-4 h-4" />
                Стоп
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] overflow-y-auto hide-scrollbar"
          >
            <div className="flex justify-between items-center mb-6">
              <button
                type="button"
                onClick={() => { setShowSummary(false); onClose(); }}
                aria-label="Назад"
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform duration-[160ms]"
              >
                <ChevronLeft className="w-4 h-4 text-[#F2EFE8]/60" />
              </button>
              <span className="text-[13px] text-[#F2EFE8]/42">Итог</span>
              <div className="w-9" />
            </div>

            <p className="font-display text-[28px] font-light leading-tight text-[#F2EFE8]/92 mb-1">{getActivityTitle()}</p>
            <p className="text-[13px] text-[#F2EFE8]/42 mb-8">{userName} · {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>

            <div className="flex items-end gap-2 mb-8">
              <span className="font-display text-[88px] font-light leading-none tabular-nums" style={{ color: ACCENT }}>
                {formatTime(finalTime)}
              </span>
            </div>

            <div className="mb-8 border-y border-[rgba(242,239,232,0.12)]">
              <MetricRow
                label="Дистанция"
                value={finalDistance > 0 ? finalDistance.toFixed(2) : '—'}
                unit={finalDistance > 0 ? 'км' : undefined}
              />
              <MetricRow
                label="Темп"
                value={formatPace(finalTime, finalDistance)}
                unit={finalDistance > 0 ? '/км' : undefined}
              />
              <MetricRow
                label="Калории"
                value={finalCalories > 0 ? String(finalCalories) : '—'}
              />
              <MetricRow
                label="Пульс"
                value={heartRate > 0 ? String(heartRate) : '—'}
                unit={heartRate > 0 ? 'уд/мин' : undefined}
              />
            </div>

            {summaryRoute.length >= 3 && ACTIVITIES_WITH_MAP.includes(selectedType) && (
              <div className="mb-8">
                <span className="text-[13px] text-[#F2EFE8]/42 block mb-3">Маршрут</span>
                <div className="h-44 border-y border-[rgba(242,239,232,0.12)] overflow-hidden">
                  <ActivityMap center={summaryRoute[0]} route={summaryRoute} followUser={false} height="100%" />
                </div>
              </div>
            )}

            <p className="text-[15px] text-[#F2EFE8]/65 leading-relaxed mb-8">
              {finalCalories > 150
                ? 'Нагрузка заметная — сегодня вечером поможет мягкий ритуал восстановления.'
                : 'Движение зафиксировано. Это добавит вклад в ваш ритм практики.'}
            </p>

            <button
              type="button"
              onClick={() => { setShowSummary(false); onClose(); }}
              className="w-full h-12 rounded-[18px] bg-[#F2EFE8] text-[#08090A] text-[15px] font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
            >
              Сохранить и закрыть
              <Check className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
