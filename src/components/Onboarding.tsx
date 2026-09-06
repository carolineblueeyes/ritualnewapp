import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Apple,
  Smartphone,
  ArrowRight,
  Activity,
  ShoppingBag,
  Loader2,
  Bluetooth,
} from 'lucide-react';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import { clearHealthCache } from '../services/health/manager';
import ConnectHealthModal from './ConnectHealthModal';
import RingConnectionWizard from './RingConnectionWizard';
import PracticeCrystal from './PracticeCrystal';
import ThoughtSequence from './onboarding/ThoughtSequence';
import FlashWordsField from './onboarding/FlashWordsField';
import RailPreview from './onboarding/RailPreview';
import ShineTodayPreview from './onboarding/ShineTodayPreview';
import RitualsLibraryPreview from './onboarding/RitualsLibraryPreview';
import SparkMark from './onboarding/SparkMark';
import {
  getCurrentAuthSession,
  signInWithProvider,
} from '../services/supabase/auth';
import { ensureAnonymousSession } from '../services/supabase/client';
import { APP_NAME, CORE_NAME, MANTRA_LINE_1, MANTRA_LINE_2, STORE_URL } from '../constants/brand';

interface OnboardingProps {
  onComplete: () => void;
  onRefreshHealth?: () => void | Promise<void>;
}

const ATTENTION_THOUGHTS = [
  'То, куда направлено внимание, формирует состояние.',
  'Состояние определяет решения.',
  'Решения создают качество жизни.',
  `${APP_NAME} — управление вниманием и состоянием.`,
];

const RAIL_THOUGHTS = [
  'Привет. Я Rail.',
  'Я создан, чтобы помочь тебе лучше понимать себя.',
  'Скажи: «Мне тревожно» — я предложу ритуал.',
  'Скажи: «Нет сил» — помогу разобраться почему.',
  'Или поставь цель — больше спать, больше энергии, восстановление или хорошая форма.',
  'Я анализирую сигналы твоего тела, замечаю закономерности в твоём состоянии — и строю для тебя уникальный путь к твоим целям.',
];

const SHINE_THOUGHTS = [
  'Сияние отражает твоё состояние.',
  'Один показатель помогает понять, как чувствует себя тело прямо сейчас.',
];

const PRACTICES_THOUGHTS = [
  'Ритуалы помогают управлять состоянием.',
  'Дыхательные, телесные и ментальные практики, которые помогают восстановиться, сфокусироваться или расслабиться.',
];

const CRYSTAL_THOUGHTS = [
  'Кристалл отражает твой путь.',
  'Он развивается от ритуалов.',
  'Становится чище от практик и сияет от твоего состояния.',
];

const FLASH_WORDS = ['Скроллинг.', 'Уведомления.', 'Чужие цели.', 'Сравнение.', 'Тревога.'];

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
      className={`w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] text-[17px] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.97] transition-transform duration-[160ms] flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100 ${className}`}
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
      className="min-h-11 text-center text-[13px] tracking-[0.16em] text-white/40 hover:text-white/60 uppercase disabled:opacity-40"
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
      : 'Health Connect';
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
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center z-10 px-6"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.94, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[48px] font-light tracking-[0.16em] text-[#F2EFE8]"
            >
              {APP_NAME}
            </motion.span>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <h1 className="font-display text-[32px] leading-[1.08] font-light text-[#F2EFE8] text-balance">
                {MANTRA_LINE_1}
              </h1>
              <p className="mt-4 text-[17px] leading-relaxed text-white/55 max-w-[280px]">
                {MANTRA_LINE_2}
              </p>
            </div>

            <div className="flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {showAppleSignIn && healthPlatform === 'ios' && (
                <button
                  onClick={() => void handleProviderAuth('apple')}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] text-[17px] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.97] transition-transform duration-[160ms] flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Apple className="w-5 h-5 fill-current" />}
                  <span>Войти</span>
                </button>
              )}
              {showAndroidSignIn && healthPlatform === 'android' && (
                <button
                  onClick={() => void handleProviderAuth('google')}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] text-[17px] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.97] transition-transform duration-[160ms] flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                  <span>Войти</span>
                </button>
              )}
              {healthPlatform === 'web' && (
                <>
                  {showAppleSignIn && (
                    <button
                      onClick={() => void handleProviderAuth('apple')}
                      disabled={authLoading}
                      className="w-full h-14 rounded-2xl bg-[#F2EFE8] text-[#08090A] text-[17px] font-semibold hover:bg-[#F2EFE8]/90 active:scale-[0.97] transition-transform duration-[160ms] flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Apple className="w-5 h-5 fill-current" />}
                      <span>Войти с Apple</span>
                    </button>
                  )}
                  {showAndroidSignIn && (
                    <button
                      onClick={() => void handleProviderAuth('google')}
                      disabled={authLoading}
                      className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/12 text-[#F2EFE8] text-[17px] font-semibold hover:bg-white/10 active:scale-[0.97] transition-transform duration-[160ms] flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                      <Smartphone className="w-5 h-5" />
                      <span>Войти с Android</span>
                    </button>
                  )}
                </>
              )}
              {authError && <p className="text-[13px] text-[#C56855] text-center leading-relaxed">{authError}</p>}
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
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col justify-center">
              <FlashWordsField
                words={FLASH_WORDS}
                onComplete={() => setFlashDone(true)}
              />
              <div className="mt-8 min-h-[140px] flex items-center justify-center">
                {flashDone && (
                  <ThoughtSequence
                    thoughts={ATTENTION_THOUGHTS}
                    pauseMs={2200}
                    thoughtClassName="text-[22px] leading-[1.35] font-display font-light text-[#F2EFE8] text-center px-2"
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
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full relative"
          >
            <RailPreview thoughts={RAIL_THOUGHTS} onThoughtsComplete={() => setRailThoughtsDone(true)} />
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
            <ShineTodayPreview thoughts={SHINE_THOUGHTS} onThoughtsComplete={() => setShineThoughtsDone(true)} />
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
            className="flex-1 flex flex-col z-10 max-w-md mx-auto w-full"
          >
            <RitualsLibraryPreview
              thoughts={PRACTICES_THOUGHTS}
              onThoughtsComplete={() => setPracticesThoughtsDone(true)}
            />
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
              <h2 className="font-display text-[32px] leading-[1.08] font-light text-[#F2EFE8] text-center text-balance mb-8">
                Твой прогресс обретает форму
              </h2>
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
              <div className="mt-8 min-h-[120px] w-full">
                <ThoughtSequence
                  thoughts={CRYSTAL_THOUGHTS}
                  pauseMs={2200}
                  initialDelay={600}
                  thoughtClassName="text-[17px] leading-[1.45] text-[#F2EFE8]/85 text-center"
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
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full relative"
          >
            <div className="flex-1 flex flex-col justify-center gap-8">
              <h2 className="font-display text-[32px] leading-[1.08] font-light text-[#F2EFE8] text-center text-balance">
                Подключи источник данных
              </h2>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (healthPlatform === 'android') {
                      setShowRingWizard(true);
                      return;
                    }
                    window.open(STORE_URL, '_blank');
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07] active:scale-[0.97] transition-transform duration-[160ms]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#74B6A0]/15 flex items-center justify-center flex-shrink-0">
                      <Bluetooth className="w-5 h-5 text-[#74B6A0]" />
                    </div>
                    <div>
                      <p className="text-[17px] font-semibold text-[#F2EFE8]">{CORE_NAME}</p>
                      <p className="text-[13px] text-white/45 mt-1 leading-relaxed">Умное кольцо</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void connectSource(healthSourceType)}
                  disabled={isHealthSyncing}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07] active:scale-[0.97] transition-transform duration-[160ms] disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      {healthSourceType === 'healthkit'
                        ? <Apple className="w-5 h-5 fill-[#F2EFE8]" />
                        : <Activity className="w-5 h-5 text-[#F2EFE8]" />}
                    </div>
                    <div>
                      <p className="text-[17px] font-semibold text-[#F2EFE8]">{healthSourceLabel}</p>
                      <p className="text-[13px] text-white/45 mt-1 leading-relaxed">Быстрый старт</p>
                    </div>
                  </div>
                </button>

                {healthPlatform !== 'android' && (
                  <button
                    type="button"
                    onClick={() => window.open(STORE_URL, '_blank')}
                    className="w-full min-h-12 rounded-2xl border border-white/8 text-[13px] text-white/50 hover:text-white/70 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Узнать о {CORE_NAME}</span>
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
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
              <SparkMark />
              <div className="space-y-4">
                <h2 className="font-display text-[32px] leading-[1.08] font-light text-[#F2EFE8]">
                  Действие меняет жизнь
                </h2>
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
                  className="mt-0.5 accent-[#C59A55] w-5 h-5"
                />
                <span className="text-[13px] text-white/50 leading-relaxed">
                  Я разрешаю {APP_NAME} обрабатывать дневные агрегаты здоровья для расчёта Сияния и персональных рекомендаций.
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
            console.warn('[Onboarding] NŌW Core refresh failed:', error);
          });
        }}
      />
    </div>
  );
}
