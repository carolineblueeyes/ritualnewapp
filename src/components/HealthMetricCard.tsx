import React from 'react';
import {
  Activity, Moon, Zap, Heart, Eye, Thermometer, Wind,
  Lock, ShoppingBag, Smartphone
} from 'lucide-react';
import { DataSource } from '../services/health/manager';
import GlassSurface from './ui/GlassSurface';

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

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
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

function MiniChart({ data, color = '#74B6A0' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 36;
  const w = 72;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-50">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HealthMetricCard({
  metricKey,
  label,
  value,
  unit,
  trend,
  baseline,
  data,
  color = '#74B6A0',
  onConnect,
  onBuyRing,
}: HealthMetricCardProps) {
  const iconName = METRIC_ICONS[metricKey] || 'activity';
  const Icon = ICONS[iconName] || Activity;
  const hasData = value !== null && value !== undefined;

  if (!hasData) {
    return (
      <GlassSurface className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#F2EFE8]/35" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-[#F2EFE8]/42 block">{label}</span>
            <span className="text-[13px] text-[#F2EFE8]/30">Нет данных</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 py-2 px-3 rounded-xl bg-white/[0.03] border border-[rgba(242,239,232,0.08)]">
          <Lock className="w-3.5 h-3.5 text-[#F2EFE8]/30 flex-shrink-0" />
          <span className="text-[11px] text-[#F2EFE8]/42">Подключите приложение здоровья или кольцо</span>
        </div>
        <div className="flex gap-2 mt-3">
          {onConnect && (
            <button
              type="button"
              onClick={onConnect}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-medium text-[#F2EFE8]/70 active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <Smartphone className="w-3 h-3" />
              Подключить
            </button>
          )}
          {onBuyRing && (
            <button
              type="button"
              onClick={onBuyRing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#C59A55]/10 border border-[#C59A55]/20 text-[11px] font-medium text-[#C59A55] active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <ShoppingBag className="w-3 h-3" />
              Купить кольцо
            </button>
          )}
        </div>
      </GlassSurface>
    );
  }

  const formattedValue = metricKey === 'steps'
    ? value.toLocaleString()
    : metricKey === 'sleepHours'
      ? `${Math.floor(value)}ч ${Math.round((value % 1) * 60)}м`
      : String(value);

  const trendUp = trend !== undefined ? trend > 0 : undefined;

  return (
    <GlassSurface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[#F2EFE8]/50" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <span className="text-[13px] text-[#F2EFE8]/42 block">{label}</span>
            <span className="font-display text-3xl font-light text-[#F2EFE8]/92 tabular-nums leading-none mt-1">
              {formattedValue}
              <span className="text-sm font-sans text-[#F2EFE8]/42 ml-1">{unit}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {trendUp !== undefined && (
            <span className={`text-xs font-medium ${trendUp ? 'text-[#74B6A0]' : 'text-[#C56855]'}`}>
              {trendUp ? '↑' : '↓'}
            </span>
          )}
          {data && data.length > 1 && <MiniChart data={data} color={color} />}
        </div>
      </div>
      {baseline !== undefined && (
        <div className="mt-3 pt-3 border-t border-[rgba(242,239,232,0.08)] flex justify-between items-center">
          <span className="text-[11px] text-[#F2EFE8]/42">Базовая: {baseline} {unit}</span>
          <span className={`text-[11px] ${value! > baseline ? 'text-[#74B6A0]/80' : 'text-[#C56855]/80'}`}>
            {value! > baseline ? '↑ Выше' : '↓ Ниже'}
          </span>
        </div>
      )}
    </GlassSurface>
  );
}
