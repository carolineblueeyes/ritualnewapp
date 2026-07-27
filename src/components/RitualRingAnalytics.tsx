import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Battery, Heart, Moon, RefreshCw, Thermometer, Zap } from 'lucide-react';
import { bleRingService } from '../services/health/ring';
import type { RingDailySummary, RingDataType, RingPoint } from '../services/health/x6RingPlugin';

type Period = 1 | 7 | 30;
type SeriesMap = Partial<Record<RingDataType, RingPoint[]>>;

const isoDay = (offset = 0) => {
  const value = new Date();
  value.setDate(value.getDate() - offset);
  return value.toISOString().slice(0, 10);
};

function Sparkline({ points, color }: { points: RingPoint[]; color: string }) {
  const values = points.map(point => point.value).filter(Number.isFinite);
  if (values.length < 2) return <p className="py-5 text-[10px] text-white/30">Недостаточно точек для графика</p>;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const coords = values.map((value, index) => `${(index / (values.length - 1)) * 100},${38 - ((value - min) / range) * 32}`).join(' ');
  return <svg viewBox="0 0 100 42" className="h-20 w-full" preserveAspectRatio="none"><polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function scoreRecovery(summary: RingDailySummary | null) {
  if (!summary) return null;
  const values: number[] = [];
  if (summary.hrv) values.push(Math.min(100, summary.hrv / 55 * 100));
  if (summary.sleepHours) values.push(Math.min(100, summary.sleepHours / 8 * 100));
  if (summary.restingHR) values.push(Math.max(0, Math.min(100, 130 - summary.restingHR)));
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

function scoreLoad(summary: RingDailySummary | null) {
  if (!summary) return null;
  const steps = Math.min(100, (summary.steps || 0) / 10000 * 100);
  const active = Math.min(100, (summary.activeMinutes || 0) / 60 * 100);
  return Math.round((steps + active) / 2);
}

export default function RitualRingAnalytics() {
  const [period, setPeriod] = useState<Period>(7);
  const [summary, setSummary] = useState<RingDailySummary | null>(null);
  const [days, setDays] = useState<RingDailySummary[]>([]);
  const [series, setSeries] = useState<SeriesMap>({});
  const [capabilities, setCapabilities] = useState<RingDataType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const info = await bleRingService.getDeviceInfo();
      const daily = await Promise.all(Array.from({ length: 30 }, (_, index) => bleRingService.getDailySummary(isoDay(index))));
      const types: RingDataType[] = ['heartRate', 'hrv', 'spo2', 'temperature', 'activity'];
      const values = await Promise.all(types.map(type => bleRingService.getSeries(type, period, period === 1 ? 'raw' : 'hour')));
      setCapabilities(info?.capabilities || []);
      setSummary(daily[0]);
      setDays(daily.filter((item): item is RingDailySummary => Boolean(item)));
      setSeries(Object.fromEntries(types.map((type, index) => [type, values[index]])) as SeriesMap);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [period]);

  const recovery = scoreRecovery(summary);
  const loadScore = scoreLoad(summary);
  const sleepRegularity = useMemo(() => {
    const starts = days.slice(0, period).map(day => day.sleepStart ? new Date(day.sleepStart).getHours() * 60 + new Date(day.sleepStart).getMinutes() : null).filter((v): v is number => v !== null);
    if (starts.length < 2) return null;
    const average = starts.reduce((a, b) => a + b, 0) / starts.length;
    const deviation = starts.reduce((total, value) => total + Math.abs(value - average), 0) / starts.length;
    return Math.max(0, Math.round(100 - deviation / 1.2));
  }, [days, period]);
  const has = (type: RingDataType) => capabilities.includes(type);
  const emptyText = loading ? 'Синхронизация…' : 'Кольцо ещё не передало этот показатель за выбранный период';

  return (
    <section className="mb-4 flex flex-col gap-3 rounded-3xl border border-emerald-300/[0.10] bg-emerald-300/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-medium text-white/80">Аналитика Ritual Ring</p><p className="mt-1 text-[10px] text-white/35">{summary?.lastSync ? `Синхронизация ${new Date(summary.lastSync).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Ожидается первая синхронизация'}</p></div>
        <div className="flex items-center gap-2"><span className="flex items-center gap-1 text-[10px] text-white/45"><Battery className="h-3.5 w-3.5" />{summary?.batteryLevel != null && summary.batteryLevel >= 0 ? `${summary.batteryLevel}%` : '—'}</span><button onClick={() => void load()} className="rounded-lg bg-white/[0.05] p-2"><RefreshCw className={`h-3.5 w-3.5 text-white/45 ${loading ? 'animate-spin' : ''}`} /></button></div>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/20 p-1">{([1, 7, 30] as Period[]).map(value => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg py-2 text-[10px] ${period === value ? 'bg-white/10 text-white/80' : 'text-white/35'}`}>{value === 1 ? 'Сегодня' : `${value} дней`}</button>)}</div>
      <div className="grid grid-cols-3 gap-2">{[{ label: 'Восстановление', value: recovery, color: 'text-emerald-200' }, { label: 'Регулярность сна', value: sleepRegularity, color: 'text-violet-200' }, { label: 'Нагрузка дня', value: loadScore, color: 'text-amber-200' }].map(item => <div key={item.label} className="rounded-2xl bg-white/[0.025] p-3 text-center"><p className={`text-lg ${item.color}`}>{item.value == null ? '—' : item.value}</p><p className="mt-1 text-[9px] leading-tight text-white/35">{item.label}</p></div>)}</div>

      {has('sleep') && <div className="rounded-2xl bg-white/[0.025] p-4"><div className="flex items-center gap-2"><Moon className="h-4 w-4 text-violet-200/70"/><p className="text-xs text-white/65">Сон</p></div>{summary?.sleepHours ? <><div className="mt-3 flex justify-between text-[11px] text-white/55"><span>{summary.sleepStart ? new Date(summary.sleepStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} → {summary.sleepEnd ? new Date(summary.sleepEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span><span>{Math.floor(summary.sleepHours)}ч {Math.round(summary.sleepHours % 1 * 60)}м</span></div><div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/5">{summary.sleepStages.filter(stage => stage.minutes > 0).map(stage => <div key={stage.stage} title={`${stage.stage}: ${stage.minutes} мин`} style={{ flex: stage.minutes, background: stage.stage === 'deep' ? '#7c3aed' : stage.stage === 'rem' ? '#c084fc' : stage.stage === 'light' ? '#8b5cf6' : '#475569' }} />)}</div><div className="mt-2 flex flex-wrap gap-3 text-[9px] text-white/35">{summary.sleepStages.filter(stage => stage.minutes > 0).map(stage => <span key={stage.stage}>{stage.stage}: {stage.minutes}м</span>)}</div></> : <p className="mt-3 text-[10px] text-white/30">{emptyText}</p>}</div>}

      {has('heartRate') && <div className="rounded-2xl bg-white/[0.025] p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-white/65"><Heart className="h-4 w-4 text-rose-200/70"/>Сердце</span><span className="text-[10px] text-white/35">Ritual Ring</span></div>{summary?.restingHR ? <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]"><div>min<br/><b>{summary.heartRateMin ?? '—'}</b></div><div>avg<br/><b>{summary.restingHR}</b></div><div>max<br/><b>{summary.heartRateMax ?? '—'}</b></div></div> : <p className="mt-3 text-[10px] text-white/30">{emptyText}</p>}<Sparkline points={series.heartRate || []} color="#fda4af"/><div className="mt-2 flex justify-between text-[10px] text-white/40"><span>HRV</span><span>{summary?.hrv ? `${summary.hrv} мс` : '—'}</span></div><Sparkline points={series.hrv || []} color="#6ee7b7"/></div>}

      {(has('spo2') || has('temperature')) && <div className="grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/[0.025] p-3"><Activity className="h-4 w-4 text-cyan-200/70"/><p className="mt-2 text-[10px] text-white/35">SpO₂ min / avg / max</p><p className="mt-1 text-sm text-white/70">{summary?.spo2 ? `${summary.spo2Min ?? '—'} / ${summary.spo2} / ${summary.spo2Max ?? '—'}%` : '—'}</p></div><div className="rounded-2xl bg-white/[0.025] p-3"><Thermometer className="h-4 w-4 text-orange-200/70"/><p className="mt-2 text-[10px] text-white/35">Температура min / avg / max</p><p className="mt-1 text-sm text-white/70">{summary?.temperature ? `${summary.temperatureMin ?? '—'} / ${summary.temperature} / ${summary.temperatureMax ?? '—'}°` : '—'}</p></div></div>}

      {has('activity') && <div className="rounded-2xl bg-white/[0.025] p-4"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-200/70"/><p className="text-xs text-white/65">Активность</p></div><div className="mt-3 grid grid-cols-4 gap-2 text-center"><div><b>{summary?.steps?.toLocaleString() ?? '—'}</b><small>шаги</small></div><div><b>{summary?.distance != null ? summary.distance.toFixed(1) : '—'}</b><small>км</small></div><div><b>{summary?.calories != null ? Math.round(summary.calories) : '—'}</b><small>ккал</small></div><div><b>{summary?.activeMinutes ?? '—'}</b><small>мин</small></div></div><Sparkline points={series.activity || []} color="#fcd34d"/>{summary?.workouts?.length ? <p className="text-[10px] text-white/40">Тренировок: {summary.workouts.length}</p> : null}</div>}
      <p className="text-[9px] leading-relaxed text-white/25">Оценки Ritual отражают личные тренды и не являются медицинским заключением.</p>
    </section>
  );
}
