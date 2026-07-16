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
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
        <div className="p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Icon className="w-4 h-4 text-white/40" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-white/60 block">{label}</span>
            <span className="text-sm font-normal text-white/40">Нет данных</span>
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
            <Lock className="w-3 h-3 text-white/60 flex-shrink-0" />
            <span className="text-[10px] text-white/50 leading-relaxed">
              Подключите приложение здоровья или кольцо
            </span>
          </div>

          <div className="flex gap-2">
            {onConnect && (
              <button
                onClick={onConnect}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-[10px] text-white/50 hover:bg-white/[0.08] transition-all"
              >
                <Smartphone className="w-3 h-3" />
                Подключить
              </button>
            )}
            {onBuyRing && (
              <button
                onClick={onBuyRing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#e8e0d4]/[0.08] border border-[#e8e0d4]/[0.12] text-[10px] text-[#e8e0d4]/70 hover:bg-[#e8e0d4]/[0.12] transition-all"
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
    <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Icon className="w-4 h-4 text-white/40" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-white/40">{label}</span>
            <span className="text-sm font-normal text-white/80">
              {formattedValue} <span className="text-[10px] text-white/60">{unit}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trendUp !== undefined && (
            <span className={`text-[11px] font-medium ${trendUp ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
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
          <div className="flex justify-between items-center pt-2">
            <span className="text-[9px] text-white/40">Базовая: {baseline}{unit}</span>
            {hasData && (
              <span className={`text-[10px] ${value! > baseline ? 'text-emerald-400/50' : 'text-rose-400/50'}`}>
                {value! > baseline ? '↑Above' : '↓Below'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
