import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import QualityBadge from './QualityBadge';
import { alertHeadline, tierAccent, type AttentionAlertItem } from './statistics/buildStatisticsData';
import type { HealthSection } from './types';

interface HealthAlertsBannerProps {
  alerts: AttentionAlertItem[];
  onOpenSection?: (section: HealthSection) => void;
}

export default function HealthAlertsBanner({ alerts, onOpenSection }: HealthAlertsBannerProps) {
  const headline = alertHeadline(alerts);
  const worst = alerts.filter(a => a.tier === 3);
  const shown = worst.length > 0 ? worst.slice(0, 2) : alerts.slice(0, 2);
  const isOk = headline.worstTier === 1 || alerts.length === 0;

  if (isOk) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-[rgba(123,198,126,0.18)] bg-[rgba(123,198,126,0.05)] px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-[#7BC67E] shrink-0" />
        <span className="text-[13px] text-[#F2EFE8]/65">{headline.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 flex flex-col gap-2.5 ${
        headline.worstTier === 3
          ? 'border-[rgba(232,104,90,0.24)] bg-[rgba(232,104,90,0.05)]'
          : 'border-[rgba(230,184,92,0.2)] bg-[rgba(230,184,92,0.05)]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: tierAccent(headline.worstTier) }} />
        <span className="text-[13px] text-[#F2EFE8]/75 leading-snug">{headline.label}</span>
      </div>

      <div className="flex flex-col gap-1">
        {shown.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenSection?.(item.section)}
            className="flex items-center justify-between gap-3 py-2.5 px-1 border-t border-white/[0.06] first:border-t-0 text-left active:opacity-80 transition-opacity"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[13px] text-[#F2EFE8]/80 block truncate">{item.label}</span>
              <span className="text-[11px] text-[#F2EFE8]/38 tabular-nums">{item.value}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <QualityBadge tier={item.tier} />
              <ChevronRight className="w-3.5 h-3.5 text-[#F2EFE8]/25" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
