import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Mic, Compass, Award, ShieldAlert, ArrowRight, Apple, Chrome, User, Smartphone, Activity, ShoppingBag } from 'lucide-react';
import { connectHealthSource, HealthConnectSourceType } from '../services/health/connectFlow';
import { healthService } from '../services/health/health.service';
import ConnectHealthModal from './ConnectHealthModal';

interface OnboardingProps {
  onComplete: () => void;
  onRefreshHealth?: () => void | Promise<void>;
}

export default function Onboarding({ onComplete, onRefreshHealth }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthSyncProgress, setHealthSyncProgress] = useState(0);
  const [healthSyncStep, setHealthSyncStep] = useState('');
  const [showHealthInfoModal, setShowHealthInfoModal] = useState(false);

  // Auto transition from Step 0 (Logo Splash) to Step 1 after 1.5 seconds
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const connectSource = async (type: HealthConnectSourceType) => {
    if (!healthService.isNative()) {
      setHealthSyncStep('Подключение доступно в мобильном приложении');
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
      setStep(5);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08080a] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Background Image / Ambient Glow */}
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
            className="flex-1 flex flex-col justify-between p-6 z-10 max-w-md mx-auto w-full"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <h2 className="text-2xl md:text-3xl font-normal font-display tracking-tight text-white leading-snug">
                Внимание к себе – это прекрасно.<br />
                <span className="text-amber-200">Все начинается здесь.</span>
              </h2>
              <p className="text-sm text-white/40 max-w-[280px]">
                Войдите в пространство тишины и осознанности, чтобы начать свой путь.
              </p>
            </div>

            <div className="flex flex-col gap-3 pb-8">
              <button
                onClick={() => setStep(2)}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Apple className="w-5 h-5 fill-current" />
                <span>Войти через Apple</span>
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Chrome className="w-5 h-5" />
                <span>Войти через Google</span>
              </button>
              <button
                onClick={() => setStep(2)}
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
                Это необходимо для верного расчёта индекса Сияния и фильтрации специфических медицинских показателей в аналитике.
              </p>

              <div className="flex flex-col gap-3.5 w-full max-w-[280px] mt-4">
                <button
                  onClick={() => {
                    localStorage.setItem('ritual_user_gender', 'male');
                    setStep(3);
                  }}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span>👨 Мужчина</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('ritual_user_gender', 'female');
                    setStep(3);
                  }}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span>👩 Женщина</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('ritual_user_gender', 'unspecified');
                    setStep(3);
                  }}
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
                Мир перегружен уведомлениями, суетой и чужими целями.
              </h2>
              <p className="text-xs font-mono text-center tracking-widest text-white/40 uppercase mb-8">
                Ritual создан для возврата контроля
              </p>

              {/* Bento Feature Cards */}
              <div className="grid grid-cols-1 gap-3.5 mb-6">
                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Сияние</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      Ritual считывает состояние твоего тела, чтобы предложить практику, которая нужна именно сейчас.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mic className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Голос</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      Расскажи, что ты чувствуешь, — и Ritual подберет практику под твой индивидуальный запрос.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Compass className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Практики</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      Аудио-, дыхательные, телесные и ментальные практики. Сессии от 2 до 20 минут.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Кристалл</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">
                      Прогресс обретает форму. Кристалл отражает твой путь — очищается от практик и сияет ярче.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pb-4">
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-amber-400/5 border border-amber-400/10 max-w-xs mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono tracking-widest text-amber-200/80 uppercase">Основано на научных исследованиях</span>
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
                Сияние рассчитывается на основе данных здоровья. Подключите источник для начала расчёта.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-[300px] mt-4">
                <button
                  onClick={() => connectSource('healthkit')}
                  disabled={isHealthSyncing}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Apple className="w-5 h-5 fill-current" />
                  <span>Apple HealthKit</span>
                </button>
                <button
                  onClick={() => connectSource('healthconnect')}
                  disabled={isHealthSyncing}
                  className="w-full h-13 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-300/30 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Подключить Health Connect</span>
                </button>
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
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">твой первый шаг</span>
              <h2 className="text-3xl font-normal font-display tracking-tight text-white leading-tight">
                Путь внимания
              </h2>
              <p className="text-sm text-white/60 max-w-[320px] leading-relaxed">
                Это трансформирующее путешествие, которое сменит фокус с внешнего на внутренний рост, усовершенствовав ценности и восприятие. Основа для будущих практик. Твой кристалл родится здесь.
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
