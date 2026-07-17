import React from 'react';
import { motion } from 'motion/react';
import {
  Activity, Moon, Zap, Heart, Eye, Thermometer, Wind,
  Lock, ShoppingBag, Smartphone
} from 'lucide-react';
import { DataSource } from '../services/health/manager';

interface HealthMetricCardProps {
  metricKey: string;
  label: string;
  value: number | null;
  unit: string;
  source: DataSource;
  trend?: number;
  baseline?: number;
  data?: number[];
  color?: string;
  onConnect?: () => void;
  onBuyRing?: () => void;
}

const ICONS: Record<string, React.ComponentType<any>> = {
  activity: Activity,
  moon: Moon,
  zap: Zap,
  heart: Heart,
  eye: Eye,
  thermometer: Thermometer,
  wind: Wind,
};

const METRIC_ICONS: Record<string, string> = {
  hrv: 'activity',
  sleepHours: 'moon',
  steps: 'zap',
  restingHR: 'heart',
  spo2: 'eye',
  temperature: 'thermometer',
  respiratoryRate: 'wind',
};

function MiniChart({ data, color = '#e8e0d4' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 60;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-40">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HealthMetricCard({
  metricKey,
  label,
  value,
  unit,
  source,
  trend,
  baseline,
  data,
  color = '#e8e0d4',
  onConnect,
  onBuyRing,
}: HealthMetricCardProps) {
  const iconName = METRIC_ICONS[metricKey] || 'activity';
  const Icon = ICONS[iconName] || Activity;

  const hasData = value !== null && value !== undefined;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/90 overflow-hidden shadow-2xl transition-all hover:border-white/15">
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
            <Icon className="w-4.5 h-4.5 text-white/40" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium tracking-wide uppercase text-white/40 block">{label}</span>
            <span className="text-xs font-normal text-white/30">Нет данных</span>
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Lock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <span className="text-[10px] text-white/50 leading-relaxed">
              Подключите приложение здоровья или кольцо
            </span>
          </div>

          <div className="flex gap-2">
            {onConnect && (
              <button
                onClick={onConnect}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[10px] font-medium tracking-wide text-white/70 hover:bg-white/[0.08] active:scale-95 transition-all"
              >
                <Smartphone className="w-3 h-3" />
                Подключить
              </button>
            )}
            {onBuyRing && (
              <button
                onClick={onBuyRing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#d4a853]/[0.08] border border-[#d4a853]/[0.15] text-[10px] font-medium tracking-wide text-[#d4a853] hover:bg-[#d4a853]/[0.12] active:scale-95 transition-all"
              >
                <ShoppingBag className="w-3 h-3" />
                Купить кольцо
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const formattedValue = metricKey === 'steps'
    ? value.toLocaleString()
    : metricKey === 'sleepHours'
      ? `${Math.floor(value)}ч ${Math.round((value % 1) * 60)}м`
      : String(value);

  const trendUp = trend !== undefined ? trend > 0 : undefined;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/95 overflow-hidden shadow-xl hover:border-white/15 transition-all">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
            <Icon className="w-4.5 h-4.5 text-white/50" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-white/40">{label}</span>
            <span className="text-base font-semibold tracking-tight text-white mt-0.5">
              {formattedValue} <span className="text-xs font-normal text-white/40 ml-0.5">{unit}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trendUp !== undefined && (
            <span className={`text-xs font-bold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trendUp ? '↑' : '↓'}
            </span>
          )}
          {data && data.length > 1 && (
            <MiniChart data={data} color={color} />
          )}
        </div>
      </div>

      {baseline !== undefined && (
        <div className="px-4 pb-3 border-t border-white/[0.04]">
          <div className="flex justify-between items-center pt-2.5">
            <span className="text-[9px] tracking-wide text-white/40 uppercase">Базовая: {baseline} {unit}</span>
            {hasData && (
              <span className={`text-[10px] font-medium ${value! > baseline ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                {value! > baseline ? '↑ Выше' : '↓ Ниже'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
