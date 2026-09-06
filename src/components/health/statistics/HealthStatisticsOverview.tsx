import React, { useEffect, useMemo, useState } from 'react';
import type { ShineBreakdown } from '../../../services/health/shine';
import type { HealthMetrics } from '../../../services/health/types';
import type { RingDailySummary } from '../../../services/health/x6RingPlugin';
import { bleRingService } from '../../../services/health/ring';
import { defaultSelectedDate } from '../useHealthCategoryData';
import type { HealthSection } from '../types';
import HealthAlertsBanner from '../HealthAlertsBanner';
import HealthMetricsStack, { type HealthMetricStackItem } from '../HealthMetricsStack';
import { buildAttentionAlerts } from './buildStatisticsData';

interface HealthStatisticsOverviewProps {
  shine?: ShineBreakdown;
  healthMetrics: HealthMetrics;
  hasRing: boolean;
  metricItems: HealthMetricStackItem[];
  getSparklinePoints: (uiKey: string) => number[];
  formatValue: (uiKey: string, val: number, unit: string) => string;
  onOpenSection: (section: HealthSection) => void;
  onMetricPress: (uiKey: string, hasValue: boolean) => void;
}

export default function HealthStatisticsOverview({
  shine,
  healthMetrics,
  hasRing,
  metricItems,
  getSparklinePoints,
  formatValue,
  onOpenSection,
  onMetricPress,
}: HealthStatisticsOverviewProps) {
  const [sleepSummary, setSleepSummary] = useState<RingDailySummary | null>(null);

  useEffect(() => {
    if (!hasRing) {
      setSleepSummary(null);
      return;
    }
    let cancelled = false;
    bleRingService.getDailySummary(defaultSelectedDate())
      .then(summary => {
        if (!cancelled) setSleepSummary(summary);
      })
      .catch(() => {
        if (!cancelled) setSleepSummary(null);
      });
    return () => { cancelled = true; };
  }, [hasRing, healthMetrics.lastSync]);

  const alerts = useMemo(
    () => buildAttentionAlerts(healthMetrics, sleepSummary),
    [healthMetrics, sleepSummary],
  );

  return (
    <div className="flex flex-col gap-5 pt-2 border-t border-[rgba(242,239,232,0.1)]">
      <HealthAlertsBanner alerts={alerts} onOpenSection={onOpenSection} />

      <HealthMetricsStack
          items={metricItems}
          shine={shine}
          getSparklinePoints={getSparklinePoints}
          formatValue={formatValue}
          onMetricPress={onMetricPress}
          defaultExpandPrimary={false}
        />
    </div>
  );
}
