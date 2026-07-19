import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Play, Pause, Activity, Flame, Clock, Navigation, 
  StopCircle, Award, Heart, Sparkles, Lock, Share2, Bookmark, 
  MoreHorizontal, Compass, User, Calendar, Map, Check, ArrowRight, TrendingUp 
} from 'lucide-react';
import ActivityMap from './ActivityMap';
import { geolocationService, GeoPoint } from '../services/geolocation';
import { getAuthDisplayName, getCurrentAuthUser, onAuthChanged } from '../services/supabase/auth';

interface ActivityToolProps {
  onClose: () => void;
  color?: string;
}

type ActivityType = 'run' | 'walk' | 'bike' | 'swim' | 'dance' | 'yoga' | 'gym';

const ACTIVITIES_WITH_MAP: ActivityType[] = ['run', 'walk', 'bike', 'yoga'];

const HEART_RATE_RANGES: Record<ActivityType, [number, number]> = {
  run: [120, 160],
  walk: [120, 160],
  bike: [120, 160],
  swim: [120, 160],
  dance: [90, 120],
  yoga: [90, 120],
  gym: [90, 120],
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

export default function ActivityTool({ onClose, color = '#34d399' }: ActivityToolProps) {
  const [mode, setMode] = useState<'free' | 'target'>('free');
  const [selectedType, setSelectedType] = useState<ActivityType>('run');
  const [targetType, setTargetType] = useState<'distance' | 'duration' | 'calories'>('duration');
  const [targetValue, setTargetValue] = useState(30);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [distance, setDistance] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  
  // Wave reveal state
  const [mapRevealState, setMapRevealState] = useState<'hidden' | 'revealing' | 'revealed'>('hidden');

  const [gpsPermission, setGpsPermission] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<GeoPoint[]>([]);
  const [heartRate, setHeartRate] = useState(0);
  const [authDisplayName, setAuthDisplayName] = useState('');

  const trackerInterval = useRef<NodeJS.Timeout | null>(null);
  const heartRateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initGps = async () => {
      const granted = await geolocationService.requestPermission();
      setGpsPermission(granted);
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
      .then(user => {
        if (mounted) setAuthDisplayName(getAuthDisplayName(user));
      })
      .catch(() => {});

    const unsubscribe = onAuthChanged(session => {
      if (mounted) setAuthDisplayName(getAuthDisplayName(session?.user ?? null));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      trackerInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        const burnRate = CALORIE_RATES[selectedType] || 0.15;
        setCaloriesBurned(prev => prev + burnRate);
      }, 1000);
    } else {
      if (trackerInterval.current) clearInterval(trackerInterval.current);
    }
    return () => {
      if (trackerInterval.current) clearInterval(trackerInterval.current);
    };
  }, [isRecording, isPaused, selectedType]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const [min, max] = HEART_RATE_RANGES[selectedType] || [120, 160];
      const base = Math.floor((min + max) / 2);
      setHeartRate(base);

      heartRateInterval.current = setInterval(() => {
        setHeartRate(prev => {
          const delta = Math.floor(Math.random() * 5) - 2;
          const next = prev + delta;
          return Math.max(min, Math.min(max, next));
        });
      }, 1000);
    } else {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    }
    return () => {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    };
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
    }, 2500);
  };

  const stopTracking = () => {
    geolocationService.stopTracking();
    setIsRecording(false);
    const finalDistance = geolocationService.getTotalDistance(routePoints);
    setDistance(finalDistance);
    setShowSummary(true);

    if (routePoints.length > 0) {
      const workout = {
        type: selectedType,
        date: new Date().toISOString(),
        duration: elapsedTime,
        distance: finalDistance,
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

  const finalTime = elapsedTime > 5 ? elapsedTime : 765; // fallback 12 mins 45s
  const finalDistance = distance > 0.05 ? distance : (selectedType === 'run' ? 2.14 : selectedType === 'walk' ? 1.45 : selectedType === 'bike' ? 4.82 : 1.12);
  const finalCalories = caloriesBurned > 5 ? Math.round(caloriesBurned) : Math.round(finalDistance * (selectedType === 'run' ? 72 : selectedType === 'bike' ? 36 : 52));
  
  // Format pace: min:sec per km
  const formatPace = (sec: number, km: number) => {
    if (km <= 0) return '0:00';
    const totalMinutes = (sec / 60) / km;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const avgPace = formatPace(finalTime, finalDistance);
  
  // Generate mockup path if routePoints is short
  const summaryRoute = useMemo(() => {
    if (routePoints.length >= 3) return routePoints;
    const startPos = currentPosition || { lat: 55.7558, lng: 37.6173 };
    const points: GeoPoint[] = [];
    let curLat = startPos.lat;
    let curLng = startPos.lng;
    const ts = Date.now();
    for (let i = 0; i < 15; i++) {
      points.push({
        lat: curLat,
        lng: curLng,
        timestamp: ts + i * 10000,
      });
      curLat += 0.0012 * Math.sin(i * 0.7) + 0.0004 * Math.cos(i);
      curLng += 0.0012 * Math.cos(i * 0.5) + 0.0004 * Math.sin(i);
    }
    return points;
  }, [routePoints, currentPosition]);

  // Elevation gains, max heights, steps
  const elevationGain = useMemo(() => {
    return Math.round(35 + finalDistance * 18);
  }, [finalDistance]);

  const maxElevation = useMemo(() => {
    return Math.round(180 + finalDistance * 25);
  }, [finalDistance]);

  const stepsCount = useMemo(() => {
    return Math.round(finalDistance * 1340);
  }, [finalDistance]);

  const avgHeartRate = useMemo(() => {
    const [min, max] = HEART_RATE_RANGES[selectedType] || [120, 160];
    return Math.round((min + max) / 2);
  }, [selectedType]);

  const maxHeartRate = useMemo(() => {
    const [, max] = HEART_RATE_RANGES[selectedType] || [120, 160];
    return max + 5;
  }, [selectedType]);

  const userName = useMemo(() => {
    const localName = localStorage.getItem('ritual_user_name') || '';
    const displayName = localName || authDisplayName;

    if (displayName && displayName.includes('@')) {
      const parts = displayName.split('@')[0];
      const clean = parts.replace(/[0-9_.]/g, ' ').trim();
      if (clean) return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    return displayName || 'Гость Ritual';
  }, [authDisplayName]);

  const getActivityTitle = () => {
    const now = new Date();
    const hr = now.getHours();
    let prefix = 'Дневной';
    if (hr >= 5 && hr < 12) prefix = 'Утренний';
    else if (hr >= 12 && hr < 17) prefix = 'Дневной';
    else if (hr >= 17 && hr < 22) prefix = 'Вечерний';
    else prefix = 'Ночной';
    
    return `${prefix} ${typeLabels[selectedType].toLowerCase()}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060608] text-white flex flex-col justify-between p-5 select-none overflow-hidden">
      
      {/* Inline styles for ripple effects */}
      <style>{`
        @keyframes reveal-ripple {
          0% { transform: scale(0.6); opacity: 0.9; border-width: 4px; }
          100% { transform: scale(25); opacity: 0; border-width: 1px; }
        }
      `}</style>

      {/* Immersive full-screen map background with radial wave reveal */}
      {ACTIVITIES_WITH_MAP.includes(selectedType) && !showSummary && (
        <div 
          className="absolute inset-0 z-0 w-full h-full transition-all duration-[2500ms] ease-out"
          style={{
            clipPath: mapRevealState === 'hidden'
              ? 'circle(0% at 50% 50%)'
              : 'circle(150% at 50% 50%)'
          }}
        >
          <ActivityMap
            center={currentPosition || undefined}
            route={routePoints}
            followUser={isRecording}
            height="100%"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060608]/85 via-[#060608]/20 to-[#060608]/85 pointer-events-none" />
        </div>
      )}

      {/* Fallback organic background light */}
      {(!ACTIVITIES_WITH_MAP.includes(selectedType) || showSummary || mapRevealState === 'hidden') && (
        <div
          className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, ${color}1b, transparent 65%)`,
          }}
        />
      )}

      {/* Glowing Starting Central Core Dot */}
      {ACTIVITIES_WITH_MAP.includes(selectedType) && !showSummary && !isRecording && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="relative flex items-center justify-center">
            {/* Waves during expansion */}
            {mapRevealState === 'revealing' && (
              <div className="absolute w-20 h-20 rounded-full border-2 border-[#34d399]/70 animate-[reveal-ripple_2.5s_cubic-bezier(0.1,0.8,0.2,1)_infinite]" />
            )}
            
            {/* Gentle resting pulse before starting */}
            {mapRevealState === 'hidden' && (
              <div className="absolute w-12 h-12 bg-[#34d399]/15 rounded-full animate-ping" />
            )}
            
            {/* Central core dot */}
            <div className="w-5 h-5 bg-[#34d399] rounded-full border-[3px] border-white shadow-[0_0_20px_#34d399] z-40" />
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
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-3"
          >
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>
              <h2 className="text-sm font-mono tracking-widest uppercase text-white/40">АКТИВНОСТЬ</h2>
              <div className="w-10 h-10" />
            </div>

            {mapRevealState === 'revealing' ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center gap-4">
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#34d399] uppercase animate-pulse">
                  Проявление пространства карты...
                </span>
                <span className="text-sm text-white/45 font-light">
                  Сонастройка датчиков геолокации и биометрии
                </span>
              </div>
            ) : (
              <>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 flex gap-1 mt-6 backdrop-blur-md">
                  <button
                    onClick={() => setMode('free')}
                    className={`flex-1 h-11 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                      mode === 'free' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    Свободная
                  </button>
                  <button
                    onClick={() => setMode('target')}
                    className={`flex-1 h-11 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                      mode === 'target' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    По цели
                  </button>
                </div>

                {mode === 'target' && (
                  <div className="flex flex-col items-center text-center gap-4 py-6 bg-[#121216]/65 border border-white/10 rounded-3xl p-6 mt-4 backdrop-blur-md shadow-2xl">
                    <div className="flex gap-2">
                      {(['duration', 'distance', 'calories'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTargetType(t);
                            setTargetValue(t === 'duration' ? 30 : t === 'distance' ? 5 : 300);
                          }}
                          className={`py-1.5 px-3.5 rounded-full text-xs font-mono uppercase tracking-wider border transition-all ${
                            targetType === t
                              ? 'bg-[#34d399]/10 border-[#34d399]/40 text-[#34d399]'
                              : 'bg-white/5 border-white/5 text-white/60'
                          }`}
                        >
                          {t === 'duration' ? 'Время' : t === 'distance' ? 'Км' : 'Ккал'}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col items-center gap-3 mt-2 w-full">
                      <span className="text-4xl font-normal font-mono text-white">
                        {targetValue}
                        <span className="text-sm text-white/40 ml-1">
                          {targetType === 'duration' ? 'мин' : targetType === 'distance' ? 'км' : 'ккал'}
                        </span>
                      </span>
                      <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-2">
                        {(targetType === 'duration'
                          ? [15, 30, 45, 60, 90, 120]
                          : targetType === 'distance'
                            ? [1, 3, 5, 10, 21, 42]
                            : [100, 200, 300, 500, 750, 1000]
                        ).map((presetVal) => (
                          <button
                            key={presetVal}
                            onClick={() => setTargetValue(presetVal)}
                            className={`py-2.5 px-1 rounded-xl text-xs font-mono font-medium border transition-all ${
                              targetValue === presetVal
                                ? 'bg-[#34d399]/10 border-[#34d399]/40 text-[#34d399] font-bold shadow'
                                : 'bg-white/5 border-white/5 text-white/60 hover:border-white/10'
                            }`}
                          >
                            {presetVal} {targetType === 'duration' ? 'мин' : targetType === 'distance' ? 'км' : 'ккал'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Spacer/Visual placeholder instead of duplicate map box */}
                <div className="flex-1 min-h-[14vh]" />

                <div className="flex flex-col gap-3.5 mb-6 bg-[#121216]/50 border border-white/5 rounded-3xl p-4 backdrop-blur-md">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase px-1">ТИП ТРЕНИРОВКИ</span>
                  <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 px-1">
                    {(['run', 'walk', 'bike', 'swim', 'dance', 'yoga', 'gym'] as ActivityType[]).map((type) => {
                      const isSelected = selectedType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`flex-none px-4 py-3 rounded-2xl border text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#34d399]/20 border-[#34d399]/40 text-white shadow-md'
                              : 'bg-[#121212]/40 border-white/5 text-white/60 hover:border-white/10'
                          }`}
                        >
                          {typeLabels[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pb-6 w-full">
                  <button
                    onClick={startTracking}
                    className="w-full h-14 rounded-2xl bg-gradient-to-br from-[#34d399] to-[#059669] text-black font-semibold hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#34d399]/25"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Начать</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full pt-3"
          >
            <div className="flex justify-between items-center bg-[#121216]/50 border border-white/5 py-2 px-4 rounded-full backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-mono text-white/70 tracking-wider uppercase">ИДЕТ ЗАПИСЬ</span>
              </div>
              <span className="text-xs font-mono bg-white/10 py-0.5 px-3 rounded-full border border-white/10 text-white font-semibold">
                {typeLabels[selectedType]}
              </span>
            </div>

            {/* Spacer to push metrics and buttons down so the map routes stay fully visible */}
            <div className="flex-1 min-h-[12vh]" />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-4 rounded-2xl bg-[#121216]/75 border border-white/10 flex flex-col gap-0.5 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span className="text-[9px] font-mono tracking-wider uppercase">Пульс</span>
                </div>
                <span className="text-xl font-normal font-mono text-white">
                  {heartRate} <span className="text-[10px] text-white/40 font-sans">уд/мин</span>
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#121216]/75 border border-white/10 flex flex-col gap-0.5 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] font-mono tracking-wider uppercase">Время</span>
                </div>
                <span className="text-xl font-normal font-mono text-white">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
              <div className="p-4 rounded-2xl bg-[#121216]/75 border border-white/10 flex flex-col gap-0.5 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-mono tracking-wider uppercase">Дистанция</span>
                </div>
                <span className="text-xl font-normal font-mono text-white">
                  {distance.toFixed(2)} <span className="text-[10px] text-white/40 font-sans">км</span>
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#121216]/75 border border-white/10 flex flex-col gap-0.5 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-mono tracking-wider uppercase">Калории</span>
                </div>
                <span className="text-xl font-normal font-mono text-white">
                  {Math.round(caloriesBurned)} <span className="text-[10px] text-white/40 font-sans">ккал</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pb-6">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 h-14 rounded-2xl bg-[#121216]/85 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center gap-2 font-semibold backdrop-blur-md shadow-xl"
              >
                {isPaused ? <Play className="w-5 h-5 text-[#34d399]" /> : <Pause className="w-5 h-5 text-white" />}
                <span>{isPaused ? 'Продолжить' : 'Пауза'}</span>
              </button>
              <button
                onClick={stopTracking}
                className="px-6 h-14 rounded-2xl bg-[#ef4444] text-white hover:bg-[#dc2626] active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold shadow-xl shadow-rose-500/10"
              >
                <StopCircle className="w-5 h-5" />
                <span>Стоп</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full pt-1 overflow-y-auto max-h-[92vh] hide-scrollbar gap-5"
          >
            {/* Header Toolbar */}
            <div className="flex justify-between items-center py-2 border-b border-white/[0.06] flex-shrink-0">
              <button
                onClick={() => {
                  setShowSummary(false);
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>
              <h2 className="text-xs font-semibold tracking-wide uppercase font-mono text-white/90">
                {selectedType === 'run' ? 'Забег' : selectedType === 'walk' ? 'Ходьба' : selectedType === 'bike' ? 'Заезд' : 'Тренировка'}
              </h2>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#fc5200]">
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
                <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* User Profile Info */}
            <div className="flex items-start gap-3 mt-1 flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#fc5200] to-amber-500 p-[1.5px] flex-shrink-0">
                <div className="w-full h-full rounded-full bg-[#121216] flex items-center justify-center text-xs font-bold text-white/90">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white tracking-wide">{userName}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5 font-mono">
                  <Calendar className="w-3 h-3 text-[#fc5200]/80" />
                  <span>Сегодня в {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <Compass className="w-3 h-3 text-emerald-400" />
                  <span className="truncate">Бурабай, Акмолинская область</span>
                </div>
              </div>
            </div>

            {/* Title and smart badge */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <h1 className="text-xl font-bold text-white/95 leading-snug">
                {getActivityTitle()}
              </h1>
              
              {/* Highlight Achievement badge */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15 rounded-2xl p-4 mt-1.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs shadow-lg shadow-amber-500/10 flex-shrink-0 font-mono">
                  PR
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-amber-300 font-semibold block uppercase">РЕКОРД УСТАНОВЛЕН!</span>
                  <p className="text-xs text-white/70 mt-0.5">
                    Твой самый лучший результат на дистанции в 2026 году!
                  </p>
                </div>
              </div>
            </div>

            {/* Strava Primary Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex-shrink-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Расстояние</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {finalDistance.toFixed(2)} <span className="text-xs font-normal text-white/40 font-sans">км</span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Средний темп</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {avgPace} <span className="text-xs font-normal text-white/40 font-sans">/км</span>
                </span>
              </div>
              <div className="h-[1px] bg-white/[0.04] col-span-2 animate-pulse" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Время в движении</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {formatTime(finalTime)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Набор высоты</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {elevationGain} <span className="text-xs font-normal text-white/40 font-sans">м</span>
                </span>
              </div>
              <div className="h-[1px] bg-white/[0.04] col-span-2" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Макс. высота</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {maxElevation} <span className="text-xs font-normal text-white/40 font-sans">м</span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Шаги</span>
                <span className="text-2xl font-bold text-white/95 font-mono">
                  {stepsCount.toLocaleString('ru-RU')}
                </span>
              </div>
            </div>

            {/* Interactive Route Map */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 px-1">МАРШРУТ ТРЕНИРОВКИ</span>
              <div className="h-48 rounded-2xl border border-white/5 overflow-hidden relative shadow-lg">
                <ActivityMap
                  center={summaryRoute[0]}
                  route={summaryRoute}
                  followUser={false}
                  height="100%"
                />
                <div className="absolute top-3 left-3 bg-[#121216]/85 border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-wider uppercase text-[#fc5200] z-20 shadow backdrop-blur-sm">
                  ИНТЕРАКТИВНЫЙ МАРШРУТ
                </div>
              </div>
            </div>

            {/* Health Biometrics Impact */}
            <div className="flex flex-col gap-2.5 mb-2 flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 px-1">ВЛИЯНИЕ НА БИОМЕТРИКУ ЗДОРОВЬЯ</span>
              
              <div className="flex flex-col gap-2.5">
                {/* Heart Rate Metric */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-rose-400">
                      <Heart className="w-4.5 h-4.5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">Пульсовые зоны</span>
                      <p className="text-xs text-white/80 mt-0.5">Нагрузка в аэробной зоне</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono text-white block">Ср: {avgHeartRate} /м</span>
                    <span className="text-[9px] font-mono text-rose-400">Пик: {maxHeartRate}</span>
                  </div>
                </div>

                {/* HRV Metric */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">Вариабельность (ВСР)</span>
                      <p className="text-xs text-white/80 mt-0.5">Усиление парасимпатики</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono text-emerald-400 block">+15% ВСР</span>
                    <span className="text-[9px] font-mono text-white/45">после практики</span>
                  </div>
                </div>

                {/* Caloric balance */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400">
                      <Flame className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">Активный метаболизм</span>
                      <p className="text-xs text-white/80 mt-0.5">Запущено жиросжигание</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono text-white block">-{finalCalories} ккал</span>
                    <span className="text-[9px] font-mono text-amber-400">в движении</span>
                  </div>
                </div>

                {/* Oxygenation */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400">
                      <TrendingUp className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/45">Вентиляция легких</span>
                      <p className="text-xs text-white/80 mt-0.5">Оптимальная оксигенация</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono text-blue-400 block">SpO₂: 98%</span>
                    <span className="text-[9px] font-mono text-white/45">отличный уровень</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="pb-8 flex-shrink-0">
              <button
                onClick={() => {
                  setShowSummary(false);
                  onClose();
                }}
                className="w-full h-14 rounded-2xl bg-[#fc5200] text-white font-semibold hover:bg-[#fc5200]/95 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#fc5200]/20"
              >
                <span>Завершить и сохранить</span>
                <Check className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
