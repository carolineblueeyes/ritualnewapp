import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Mic, Compass, Award, ArrowRight, Apple, Chrome, User, Smartphone, Activity, ShoppingBag, Mail, Loader2, Shield } from 'lucide-react';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import ConnectHealthModal from './ConnectHealthModal';
import {
  getCurrentAuthSession,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
} from '../services/supabase/auth';
import { ensureAnonymousSession } from '../services/supabase/client';

interface OnboardingProps {
  onComplete: () => void;
  onRefreshHealth?: () => void | Promise<void>;
}

export default function Onboarding({ onComplete, onRefreshHealth }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthSyncProgress, setHealthSyncProgress] = useState(0);
  const [healthSyncStep, setHealthSyncStep] = useState('');
  const [showHealthInfoModal, setShowHealthInfoModal] = useState(false);

  const healthPlatform = healthService.getPlatform();
  const healthSourceType: HealthConnectSourceType = healthPlatform === 'ios' ? 'healthkit' : 'healthconnect';
  const healthSourceLabel = healthPlatform === 'ios'
    ? 'Apple Health'
    : healthPlatform === 'android'
      ? 'Health Connect'
      : 'Мобильное приложение';
  const healthConnectLabel = healthPlatform === 'ios'
    ? 'Подключить Apple Health'
    : healthPlatform === 'android'
      ? 'Подключить Health Connect'
      : 'Подключение в мобильном приложении';
  const showAppleSignIn = healthPlatform === 'ios';

  useEffect(() => {
    if (step !== 0) return;
    const timer = window.setTimeout(() => setStep(1), 1500);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    getCurrentAuthSession()
      .then(session => {
        if (session && !session.user.is_anonymous) setStep(2);
      })
      .catch(() => {});
  }, []);

  const handleAuthSuccess = () => {
    setAuthError('');
    setAuthInfo('');
    setStep(2);
  };

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setAuthError('Введите email и пароль минимум 6 символов.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const result = authMode === 'signin'
        ? await signInWithEmail(trimmedEmail, password)
        : await signUpWithEmail(trimmedEmail, password);

      if (result.session) {
        handleAuthSuccess();
        return;
      }

      setAuthInfo('Аккаунт создан. Проверьте email и подтвердите вход.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось войти.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProviderAuth = async (provider: 'apple' | 'google') => {
    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

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
    setAuthInfo('');

    try {
      await ensureAnonymousSession();
      handleAuthSuccess();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось продолжить как гость.');
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
      window.setTimeout(() => {
        onRefreshHealth?.();
      }, 1200);
      window.setTimeout(() => {
        onRefreshHealth?.();
      }, 3500);
      setStep(5);
    }
  };

  const saveGender = (gender: 'male' | 'female' | 'unspecified') => {
    localStorage.setItem('ritual_user_gender', gender);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08080a] text-white flex flex-col justify-between overflow-hidden select-none">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQK0QprKpBH_G_LRor3NkyGFydwOQr7OIb3gTOGBd8e9fTUEFHmQ3aNbcOceDmnQsjDVlR8X3fXvc-1pF-9W32ykmqpkKscw6WQRU-heixwuZws89Qim-Fej8dextes2I0FYrZ86pd_GZhPL8uNk5LTSnUmByOYGSqMNOWLiog8TsZKwfU3I-mwforEQjaw4BaxrXlWtrAi5ZZXd9rav5tZufCOH9-03AMr08tYIjHuMSmpfsjlZyExZmx2LYTZH6E8_vU7jctcYM"
          alt="Atmospheric Background"
          className="w-full h-full object-cover filter blur-[2px]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-[#08080a]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col items-center justify-center z-10"
          >
            <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center relative shadow-2xl">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
              <span className="text-4xl font-semibold tracking-widest text-amber-300 font-display">R</span>
            </div>
            <h1 className="text-2xl font-normal font-display tracking-[0.3em] text-white mt-6">RITUAL</h1>
            <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase mt-2">внимание к себе</span>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full overflow-y-auto hide-scrollbar"
          >
            <div className="flex flex-col items-center justify-center text-center gap-4 pt-8">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <h2 className="text-2xl md:text-3xl font-normal font-display tracking-tight text-white leading-snug">
                Внимание к себе начинается здесь.<br />
                <span className="text-amber-200">Спокойно и без лишнего шума.</span>
              </h2>
              <p className="text-sm text-white/40 max-w-[280px]">
                Войдите или продолжите как гость, чтобы собрать личный ритм практик и отслеживать состояние.
              </p>
            </div>

            <div className="flex flex-col gap-3 pb-8 pt-8">
              {showAppleSignIn && (
                <button
                  onClick={() => handleProviderAuth('apple')}
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:active:scale-100"
                >
                  <Apple className="w-5 h-5 fill-current" />
                  <span>Войти через Apple</span>
                </button>
              )}
              <button
                onClick={() => handleProviderAuth('google')}
                disabled={authLoading}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:active:scale-100"
              >
                <Chrome className="w-5 h-5" />
                <span>Войти через Google</span>
              </button>

              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 rounded-xl bg-black/20 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthInfo(''); }}
                    className={`h-9 rounded-lg transition-all ${authMode === 'signin' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    Вход
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthInfo(''); }}
                    className={`h-9 rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    Регистрация
                  </button>
                </div>

                <label className="flex items-center gap-2 h-12 rounded-xl bg-black/20 border border-white/10 px-3 focus-within:border-amber-300/40 transition-colors">
                  <Mail className="w-4 h-4 text-white/35 flex-shrink-0" />
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email"
                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/25"
                  />
                </label>

                <label className="flex items-center gap-2 h-12 rounded-xl bg-black/20 border border-white/10 px-3 focus-within:border-amber-300/40 transition-colors">
                  <Shield className="w-4 h-4 text-white/35 flex-shrink-0" />
                  <input
                    type="password"
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="пароль"
                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/25"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleEmailAuth();
                    }}
                  />
                </label>

                {authError && <p className="text-xs text-red-300/90 leading-relaxed">{authError}</p>}
                {authInfo && <p className="text-xs text-amber-200/90 leading-relaxed">{authInfo}</p>}

                <button
                  type="button"
                  onClick={() => void handleEmailAuth()}
                  disabled={authLoading}
                  className="w-full h-12 rounded-xl bg-amber-300 text-black font-semibold hover:bg-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:active:scale-100"
                >
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>{authMode === 'signin' ? 'Войти по email' : 'Создать аккаунт'}</span>
                </button>
              </div>

              <button
                onClick={() => void handleGuestAuth()}
                disabled={authLoading}
                className="text-center text-xs font-mono tracking-widest text-white/40 hover:text-white/60 mt-3 uppercase"
              >
                продолжить как гость
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="gender-question"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <User className="w-8 h-8 text-amber-300" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">персонализация</span>
              <h2 className="text-2xl md:text-3xl font-normal font-display tracking-tight text-white leading-snug">
                Укажите ваш пол<br />
                <span className="text-amber-200">для точной биометрии</span>
              </h2>
              <p className="text-xs text-white/40 max-w-[280px]">
                Это помогает корректнее считать Индекс Сияния и фильтровать показатели здоровья в аналитике.
              </p>

              <div className="flex flex-col gap-3.5 w-full max-w-[280px] mt-4">
                <button
                  onClick={() => saveGender('male')}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Мужчина
                </button>
                <button
                  onClick={() => saveGender('female')}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Женщина
                </button>
                <button
                  onClick={() => saveGender('unspecified')}
                  className="w-full h-11 rounded-2xl border border-transparent text-white/50 hover:text-white/80 font-medium text-xs tracking-wider uppercase font-mono transition-all active:scale-[0.98]"
                >
                  Не указывать
                </button>
              </div>
            </div>

            <div className="pb-4 text-center">
              <span className="text-[9px] font-mono text-white/60 uppercase tracking-widest">
                Вы сможете изменить это в профиле в любой момент
              </span>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="features"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full overflow-y-auto hide-scrollbar"
          >
            <div className="pt-6">
              <h2 className="text-xl font-normal text-center text-white leading-relaxed px-4 mb-2">
                Ritual помогает возвращать контроль над вниманием.
              </h2>
              <p className="text-xs font-mono text-center tracking-widest text-white/40 uppercase mb-8">
                практики, голос и биометрия в одном ритме
              </p>

              <div className="grid grid-cols-1 gap-3.5 mb-6">
                {[
                  { icon: Brain, title: 'Сияние', text: 'Ritual считывает состояние тела, чтобы предложить практику, которая нужна именно сейчас.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { icon: Mic, title: 'Голос', text: 'Расскажите, что чувствуете, и Ritual подберет практику под ваш запрос.', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                  { icon: Compass, title: 'Практики', text: 'Аудио, дыхание, тело и фокус. Сессии от 2 до 20 минут.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { icon: Award, title: 'Кристалл', text: 'Прогресс обретает форму и отражает ваш путь через практики.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                ].map(({ icon: Icon, title, text, color, bg, border }) => (
                  <div key={title} className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-2xl ${bg} border ${border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{title}</h3>
                      <p className="text-xs text-white/50 mt-1 leading-relaxed">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 pb-4">
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-amber-400/5 border border-amber-400/10 max-w-xs mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono tracking-widest text-amber-200/80 uppercase">основано на дневных данных</span>
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Далее</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="health-connect"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Activity className="w-8 h-8 text-amber-300" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">источник данных</span>
              <h2 className="text-2xl md:text-3xl font-normal font-display tracking-tight text-white leading-snug">
                Подключите здоровье<br />
                <span className="text-amber-200">для расчёта Сияния</span>
              </h2>
              <p className="text-xs text-white/40 max-w-[280px]">
                Ritual использует только дневные показатели здоровья, чтобы точнее рассчитать Индекс Сияния и подобрать практики под ваше состояние.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-[300px] mt-4">
                <button
                  onClick={() => connectSource(healthSourceType)}
                  disabled={isHealthSyncing}
                  className="w-full h-13 rounded-2xl bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:active:scale-100 font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {healthSourceType === 'healthkit'
                    ? <Apple className="w-5 h-5 fill-current" />
                    : <Smartphone className="w-5 h-5" />}
                  <span>{isHealthSyncing ? 'Подключение...' : healthConnectLabel}</span>
                </button>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{healthSourceLabel}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                    Вы сами выбираете, какие метрики разрешить. Отказ не заблокирует приложение.
                  </p>
                </div>
                <button
                  onClick={() => window.open('https://ritual.store', '_blank')}
                  className="w-full h-13 rounded-2xl bg-[#e8e0d4]/[0.08] border border-[#e8e0d4]/[0.15] hover:bg-[#e8e0d4]/[0.12] text-[#e8e0d4]/80 font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Купить кольцо Ritual</span>
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={isHealthSyncing}
                  className="text-center text-xs font-mono tracking-widest text-white/40 hover:text-white/60 mt-3 uppercase"
                >
                  пропустить
                </button>
              </div>
            </div>

            <div className="pb-4 text-center">
              <span className="text-[9px] font-mono text-white/60 uppercase tracking-widest">
                Вы сможете подключить это в профиле в любой момент
              </span>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="onboarding-final"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#161616]/40 border border-amber-300/20 flex items-center justify-center shadow-2xl relative">
                <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-xl animate-pulse" />
                <Sparkles className="w-10 h-10 text-amber-300" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">первый шаг</span>
              <h2 className="text-3xl font-normal font-display tracking-tight text-white leading-tight">
                Путь внимания
              </h2>
              <p className="text-sm text-white/60 max-w-[320px] leading-relaxed">
                Ваше пространство практик готово. Начните с короткого ритуала, а данные здоровья можно подключить сейчас или позже.
              </p>
            </div>

            <div className="pb-8">
              <button
                onClick={onComplete}
                className="w-full h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15"
              >
                <span>Начать путь</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && healthSyncStep && (
          <div className="absolute left-6 right-6 bottom-20 z-20 mx-auto max-w-[300px] rounded-2xl border border-white/[0.05] bg-[#121215]/95 p-3 text-left shadow-2xl">
            <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-white/60 uppercase tracking-wider">
              <span>{healthSyncStep}</span>
              <span>{Math.round(healthSyncProgress)}%</span>
            </div>
            {isHealthSyncing && (
              <div className="mt-2 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full bg-amber-300/70 transition-all" style={{ width: `${healthSyncProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <ConnectHealthModal isOpen={showHealthInfoModal} onClose={() => setShowHealthInfoModal(false)} />
    </div>
  );
}
