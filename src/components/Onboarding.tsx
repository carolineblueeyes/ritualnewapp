import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Apple,
  Smartphone,
  ArrowRight,
  Activity,
  ShoppingBag,
  Loader2,
  Bluetooth,
  BookOpen,
} from 'lucide-react';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import { clearHealthCache } from '../services/health/manager';
import ConnectHealthModal from './ConnectHealthModal';
import RingConnectionWizard from './RingConnectionWizard';
import PracticeCrystal from './PracticeCrystal';
import SilkShaderBackground from './SilkShaderBackground';
import ThoughtSequence from './onboarding/ThoughtSequence';
import FlashWordsField from './onboarding/FlashWordsField';
import {
  getCurrentAuthSession,
  signInWithProvider,
} from '../services/supabase/auth';
import { ensureAnonymousSession } from '../services/supabase/client';

interface OnboardingProps {
  onComplete: () => void;
  onRefreshHealth?: () => void | Promise<void>;
}

const TOTAL_STEPS = 8;

const ATTENTION_THOUGHTS = [
  'То, чему уделяешь внимание, становится твоим состоянием.',
  'Состояние определяет решения.',
  'Решения формируют качество жизни.',
  'Ritual помогает понимать своё состояние и управлять им.',
];

const RAIL_THOUGHTS = [
  'Привет. Я Rail.',
  'Я создан, чтобы помочь тебе лучше понимать себя.',
  'Я анализирую сигналы организма, замечаю закономерности в твоём состоянии и предлагаю ритуалы, которые нужны именно сейчас.',
  'Скажи: «Мне тревожно» — я предложу практику.',
  'Скажи: «Нет сил» — помогу разобраться почему.',
  'Или поставь цель — больше спать, больше энергии, восстановление или хорошая форма.',
  'Я помогу построить путь и буду сопровождать тебя каждый день.',
];

const SHINE_THOUGHTS = [
  'Сияние отражает твоё состояние.',
  'Один показатель помогает понять, как чувствует себя организм прямо сейчас.',
];

const PRACTICES_THOUGHTS = [
  'Ритуалы помогают управлять состоянием.',
  'Дыхательные, телесные и ментальные практики, которые помогают восстановиться, сфокусироваться или расслабиться.',
];

const CRYSTAL_THOUGHTS = [
  'Кристалл отражает твой путь.',
  'Он развивается.',
  'Становится чище от практик и сияет от твоего состояния.',
];

function StepProgress({ step }: { step: number }) {
  if (step <= 0 || step >= TOTAL_STEPS) return null;
  const label = String(step).padStart(2, '0');
  const total = String(TOTAL_STEPS - 1).padStart(2, '0');
  return (
    <span className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-6 z-20 text-[11px] tracking-[0.2em] text-white/35 tabular-nums">
      {label} / {total}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

function TextButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-center text-xs tracking-[0.18em] text-white/40 hover:text-white/60 uppercase disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function Onboarding({ onComplete, onRefreshHealth }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthSyncProgress, setHealthSyncProgress] = useState(0);
  const [healthSyncStep, setHealthSyncStep] = useState('');
  const [showRingWizard, setShowRingWizard] = useState(false);
  const [showHealthInfoModal, setShowHealthInfoModal] = useState(false);
  const [flashDone, setFlashDone] = useState(false);
  const [attentionThoughtsDone, setAttentionThoughtsDone] = useState(false);
  const [railThoughtsDone, setRailThoughtsDone] = useState(false);
  const [shineThoughtsDone, setShineThoughtsDone] = useState(false);
  const [practicesThoughtsDone, setPracticesThoughtsDone] = useState(false);
  const [crystalThoughtsDone, setCrystalThoughtsDone] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const healthPlatform = healthService.getPlatform();
  const healthSourceType: HealthConnectSourceType = healthPlatform === 'ios' ? 'healthkit' : 'healthconnect';
  const healthSourceLabel = healthPlatform === 'ios'
    ? 'Apple Health'
    : healthPlatform === 'android'
      ? 'Health Connect'
      : 'Мобильное приложение';
  const showAppleSignIn = healthPlatform === 'ios' || healthPlatform === 'web';
  const showAndroidSignIn = healthPlatform === 'android' || healthPlatform === 'web';

  useEffect(() => {
    if (step !== 0) return;
    const timer = window.setTimeout(() => setStep(1), 1500);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    getCurrentAuthSession()
      .then((session) => {
        if (session && !session.user.is_anonymous) setStep(2);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 2) {
      setFlashDone(false);
      setAttentionThoughtsDone(false);
    }
    if (step === 3) setRailThoughtsDone(false);
    if (step === 4) setShineThoughtsDone(false);
    if (step === 5) setPracticesThoughtsDone(false);
    if (step === 6) setCrystalThoughtsDone(false);
  }, [step]);

  const handleAuthSuccess = useCallback(() => {
    setAuthError('');
    setStep(2);
  }, []);

  const handleProviderAuth = async (provider: 'apple' | 'google') => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось открыть вход.');
      setAuthLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await ensureAnonymousSession();
      handleAuthSuccess();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось продолжить.');
    } finally {
      setAuthLoading(false);
    }
  };

  const connectSource = async (type: HealthConnectSourceType) => {
    if (!healthService.isNative()) {
      setHealthSyncProgress(0);
      setHealthSyncStep('Подключение доступно только в мобильном приложении');
      setShowHealthInfoModal(true);
      return;
    }

    const result = await connectHealthSource(type, {
      onRefresh: onRefreshHealth,
      onSyncing: setIsHealthSyncing,
      onProgress: setHealthSyncProgress,
      onStep: setHealthSyncStep,
    });

    if (result.ok) {
      window.setTimeout(() => onRefreshHealth?.(), 1200);
      window.setTimeout(() => onRefreshHealth?.(), 3500);
    }
  };

  const completeOnboarding = () => {
    if (!privacyConsent) return;
    localStorage.setItem('ritual_privacy_consent_version', '2026-07-28');
    onComplete();
  };

  const advance = (next: number) => () => setStep(next);

  return (
    <div className="fixed inset-0 z-50 ritual-flow text-[#F2EFE8] flex flex-col overflow-hidden select-none">
      <StepProgress step={step} />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center z-10 px-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="w-[88px] h-[88px] rounded-full border border-white/10 flex items-center justify-center relative">
                <div className="absolute inset-[-20%] rounded-full bg-[#C59A55]/15 blur-2xl" />
                <span className="text-[42px] font-display text-[#F2EFE8] leading-none">R</span>
              </div>
              <h1 className="mt-8 text-[28px] font-display tracking-[0.35em] text-[#F2EFE8]">RITUAL</h1>
            </motion.div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <h2 className="text-[34px] leading-[1.08] font-display text-[#F2EFE8] text-balance">
                Внимание к себе — это прекрасно.
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-white/55 max-w-[300px]">
                Всё начинается здесь.
              </p>
            </div>

            <div className="flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {showAppleSignIn && (
                <button
                  onClick={() => void handleProviderAuth('apple')}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Apple className="w-5 h-5 fill-current" />}
                  <span>Продолжить с Apple</span>
                </button>
              )}
              {showAndroidSignIn && (
                <button
                  onClick={() => void handleProviderAuth('google')}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/12 text-[#F2EFE8] font-semibold hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Продолжить с Android</span>
                </button>
              )}
              {authError && <p className="text-xs text-[#C56855] text-center leading-relaxed">{authError}</p>}
              <TextButton onClick={() => void handleGuestAuth()} disabled={authLoading}>
                продолжить без входа
              </TextButton>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="attention"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full overflow-y-auto hide-scrollbar"
          >
            <div className="flex-1 flex flex-col justify-center pt-8">
              <FlashWordsField
                words={['Скроллинг.', 'Чужие цели.', 'Новости.', 'Давление.']}
                onComplete={() => setFlashDone(true)}
              />

              <div className="mt-10 min-h-[180px]">
                {flashDone && (
                  <ThoughtSequence
                    thoughts={ATTENTION_THOUGHTS}
                    pauseMs={2200}
                    thoughtClassName="text-[22px] leading-[1.35] font-display text-[#F2EFE8] text-center px-2"
                    onComplete={() => setAttentionThoughtsDone(true)}
                  />
                )}
              </div>
            </div>

            <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(3)} disabled={!attentionThoughtsDone}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="rail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full"
          >
            <div className="flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Sparkles className="h-4 w-4 text-[#C59A55]" />
                </div>
                <span className="text-sm font-medium text-[#F2EFE8]">Rail</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 gap-8">
              <div className="flex h-14 items-end justify-center gap-1">
                {Array.from({ length: 9 }).map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{ height: [12, 18 + Math.sin(index * 0.9) * 14, 12] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.07, ease: 'easeInOut' }}
                    className="w-[3px] rounded-full bg-[#F2EFE8]/35"
                  />
                ))}
              </div>

              <div className="min-h-[220px] w-full flex items-center justify-center">
                <ThoughtSequence
                  thoughts={RAIL_THOUGHTS}
                  pauseMs={2400}
                  initialDelay={600}
                  thoughtClassName="text-[19px] leading-[1.45] font-display text-[#F2EFE8]/90 text-center px-1"
                  onComplete={() => setRailThoughtsDone(true)}
                />
              </div>
            </div>

            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(4)} disabled={!railThoughtsDone}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="shine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full"
          >
            <div className="relative flex-1 flex flex-col">
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <SilkShaderBackground accentColor="#C59A55" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#08090A]/20 via-transparent to-[#08090A]" />
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-10">
                <span className="text-[11px] tracking-[0.22em] text-white/70 uppercase mb-6">Сегодня</span>

                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-[-40%] rounded-full bg-[#C59A55]/25 blur-3xl"
                  />
                  <motion.span
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative text-[112px] leading-[0.85] font-display text-[#F2EFE8] tabular-nums"
                  >
                    82
                  </motion.span>
                </div>

                <div className="mt-12 min-h-[100px] w-full max-w-[320px]">
                  <ThoughtSequence
                    thoughts={SHINE_THOUGHTS}
                    pauseMs={2600}
                    initialDelay={900}
                    thoughtClassName="text-[20px] leading-[1.4] font-display text-[#F2EFE8]/85 text-center"
                    onComplete={() => setShineThoughtsDone(true)}
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(5)} disabled={!shineThoughtsDone}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="practices"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full overflow-hidden"
          >
            <div className="px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4 text-white/50" />
                <span className="text-sm text-white/70">Библиотека практик</span>
              </div>

              <div className="grid grid-cols-2 gap-2 opacity-80 pointer-events-none">
                {['Исток', 'Тишина', 'Энергия', 'Ясность'].map((name, i) => (
                  <div
                    key={name}
                    className="h-24 rounded-xl border border-white/8 bg-white/[0.03] p-3 flex flex-col justify-end"
                    style={{ opacity: 1 - i * 0.12 }}
                  >
                    <span className="text-sm font-medium text-[#F2EFE8]/80">{name}</span>
                    <span className="text-[10px] text-white/40 mt-0.5">практики</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex items-center px-6">
              <ThoughtSequence
                thoughts={PRACTICES_THOUGHTS}
                pauseMs={2600}
                initialDelay={500}
                thoughtClassName="text-[20px] leading-[1.4] font-display text-[#F2EFE8] text-center"
                onComplete={() => setPracticesThoughtsDone(true)}
              />
            </div>

            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(6)} disabled={!practicesThoughtsDone}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div
            key="crystal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-between z-10 max-w-md mx-auto w-full p-6"
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <PracticeCrystal
                facets={12}
                color="#C59A55"
                fogPercent={35}
                glowIntensity={0.7}
                rotationSpeed={18}
                hasBeam
                hasSparks
                isPulsing
              />

              <div className="mt-10 min-h-[120px] w-full">
                <ThoughtSequence
                  thoughts={CRYSTAL_THOUGHTS}
                  pauseMs={2200}
                  initialDelay={700}
                  thoughtClassName="text-[20px] leading-[1.4] font-display text-[#F2EFE8] text-center"
                  onComplete={() => setCrystalThoughtsDone(true)}
                />
              </div>
            </div>

            <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(7)} disabled={!crystalThoughtsDone}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col justify-center gap-8">
              <h2 className="text-[28px] leading-[1.15] font-display text-[#F2EFE8] text-center text-balance">
                Чтобы понимать тебя точнее, подключи источник данных
              </h2>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (healthPlatform === 'android') {
                      setShowRingWizard(true);
                      return;
                    }
                    window.open('https://ritual.store', '_blank');
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07] active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#74B6A0]/15 flex items-center justify-center flex-shrink-0">
                      <Bluetooth className="w-5 h-5 text-[#74B6A0]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#F2EFE8]">Ritual Core</p>
                      <p className="text-[13px] text-white/45 mt-1 leading-relaxed">Умное кольцо</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void connectSource(healthSourceType)}
                  disabled={isHealthSyncing}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      {healthSourceType === 'healthkit'
                        ? <Apple className="w-5 h-5 fill-[#F2EFE8]" />
                        : <Activity className="w-5 h-5 text-[#F2EFE8]" />}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#F2EFE8]">{healthSourceLabel}</p>
                      <p className="text-[13px] text-white/45 mt-1 leading-relaxed">Быстрый старт</p>
                    </div>
                  </div>
                </button>

                {healthPlatform !== 'android' && (
                  <button
                    type="button"
                    onClick={() => window.open('https://ritual.store', '_blank')}
                    className="w-full h-12 rounded-2xl border border-white/8 text-[13px] text-white/50 hover:text-white/70 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Узнать о Ritual Core</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PrimaryButton onClick={advance(8)} disabled={isHealthSyncing}>
                <span>Продолжить</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
              <TextButton onClick={advance(8)} disabled={isHealthSyncing}>
                пропустить
              </TextButton>
            </div>

            {healthSyncStep && (
              <div className="absolute left-6 right-6 bottom-28 mx-auto max-w-[300px] rounded-2xl border border-white/8 bg-[#101113]/95 p-3 text-left">
                <div className="flex items-center justify-between gap-3 text-[10px] text-white/55 uppercase tracking-wider">
                  <span>{healthSyncStep}</span>
                  <span>{Math.round(healthSyncProgress)}%</span>
                </div>
                {isHealthSyncing && (
                  <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full bg-[#C59A55]/70 transition-all" style={{ width: `${healthSyncProgress}%` }} />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {step === 8 && (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.75, 0.4] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-[#C59A55]/30 blur-2xl"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Sparkles className="w-14 h-14 text-[#C59A55]" strokeWidth={1.5} />
                </motion.div>
              </div>

              <div className="space-y-4">
                <p className="text-[32px] leading-[1.1] font-display text-[#F2EFE8]">
                  Действие меняет жизнь
                </p>
                <p className="text-[17px] text-white/55 leading-relaxed">
                  Путь начинается сегодня.
                </p>
              </div>
            </div>

            <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 mb-4 text-left">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
                  className="mt-0.5 accent-[#C59A55]"
                />
                <span className="text-[11px] text-white/50 leading-relaxed">
                  Я разрешаю Ritual обрабатывать дневные агрегаты здоровья для расчёта Сияния и персональных рекомендаций.
                </span>
              </label>
              <PrimaryButton onClick={completeOnboarding} disabled={!privacyConsent}>
                <span>Начать</span>
                <ArrowRight className="w-5 h-5" />
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectHealthModal isOpen={showHealthInfoModal} onClose={() => setShowHealthInfoModal(false)} />
      <RingConnectionWizard
        isOpen={showRingWizard}
        onClose={() => setShowRingWizard(false)}
        onConnected={() => {
          clearHealthCache();
          void Promise.resolve(onRefreshHealth?.()).catch((error) => {
            console.warn('[Onboarding] Ritual Ring refresh failed:', error);
          });
        }}
      />
    </div>
  );
}
