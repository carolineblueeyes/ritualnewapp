import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import QualityBadge from '../QualityBadge';
import { alertHeadline, tierAccent, type AttentionAlertItem } from './buildStatisticsData';
import type { HealthSection } from '../types';

interface AttentionAlertsCardProps {
  alerts: AttentionAlertItem[];
  onOpenSection?: (section: HealthSection) => void;
}

export default function AttentionAlertsCard({ alerts, onOpenSection }: AttentionAlertsCardProps) {
  const headline = alertHeadline(alerts);
  const worst = alerts.filter(a => a.tier === 3);
  const shown = worst.length > 0 ? worst.slice(0, 3) : alerts.slice(0, 3);
  const isOk = headline.worstTier === 1 || alerts.length === 0;

  return (
    <div
      className={`rounded-[22px] border p-4 flex flex-col gap-3 h-full min-h-[168px] ${
        isOk
          ? 'border-[rgba(123,198,126,0.22)] bg-[rgba(123,198,126,0.06)]'
          : headline.worstTier === 3
            ? 'border-[rgba(232,104,90,0.28)] bg-[rgba(232,104,90,0.06)]'
            : 'border-[rgba(230,184,92,0.22)] bg-[rgba(230,184,92,0.06)]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isOk ? (
          <CheckCircle2 className="w-4 h-4 text-[#7BC67E] shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tierAccent(headline.worstTier) }} />
        )}
        <div className="min-w-0">
          <span className="text-[13px] text-[#F2EFE8]/70 block leading-snug">{headline.label}</span>
          {!isOk && shown.length > 0 && (
            <span className="text-[11px] text-[#F2EFE8]/35 mt-0.5 block">Нажмите, чтобы открыть</span>
          )}
        </div>
      </div>

      {shown.length > 0 && !isOk ? (
        <div className="flex flex-col gap-1.5">
          {shown.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenSection?.(item.section)}
              className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-xl bg-black/20 border border-white/[0.06] text-left active:scale-[0.98] transition-transform"
            >
              <div className="min-w-0">
                <span className="text-[12px] text-[#F2EFE8]/75 block truncate">{item.label}</span>
                <span className="text-[11px] text-[#F2EFE8]/40 tabular-nums">{item.value}</span>
              </div>
              <QualityBadge tier={item.tier} />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <QualityBadge tier={1} />
        </div>
      )}
    </div>
  );
}
