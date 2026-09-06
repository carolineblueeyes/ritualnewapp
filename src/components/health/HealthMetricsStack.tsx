import React from 'react';
import type { ShineBreakdown, ShineDriver } from '../../services/health/shine';
import HealthDriverCard from './HealthDriverCard';
import HealthGroup from './HealthGroup';
import { getDriverInsight, SHINE_DRIVER_TO_UI_KEY } from './driverInsights';

export interface HealthMetricStackItem {
  uiKey: string;
  driver: ShineDriver;
  label: string;
  val: number | null | undefined;
  unit: string;
  color: string;
}

interface HealthMetricsStackProps {
  items: HealthMetricStackItem[];
  shine?: ShineBreakdown;
  getSparklinePoints: (uiKey: string) => number[];
  formatValue: (uiKey: string, val: number, unit: string) => string;
  onMetricPress: (uiKey: string, hasValue: boolean) => void;
  primaryCardRef?: React.RefObject<HTMLDivElement | null>;
  defaultExpandPrimary?: boolean;
}

function resolveDriverRole(
  uiKey: string,
  shine?: ShineBreakdown,
): 'primary' | 'secondary' | null {
  if (!shine?.primaryDriver) return null;
  const primaryUi = SHINE_DRIVER_TO_UI_KEY[shine.primaryDriver];
  const secondaryUi = shine.secondaryDriver ? SHINE_DRIVER_TO_UI_KEY[shine.secondaryDriver] : null;
  if (uiKey === primaryUi) return 'primary';
  if (uiKey === secondaryUi) return 'secondary';
  return null;
}

export default function HealthMetricsStack({
  items,
  shine,
  getSparklinePoints,
  formatValue,
  onMetricPress,
  primaryCardRef,
  defaultExpandPrimary = true,
}: HealthMetricsStackProps) {
  const sorted = [...items].sort((a, b) => {
    const roleA = resolveDriverRole(a.uiKey, shine);
    const roleB = resolveDriverRole(b.uiKey, shine);
    if (roleA === 'primary') return -1;
    if (roleB === 'primary') return 1;
    if (roleA === 'secondary') return -1;
    if (roleB === 'secondary') return 1;
    return 0;
  });

  return (
    <HealthGroup title="Показатели">
      {sorted.map((item) => {
        const role = resolveDriverRole(item.uiKey, shine);
        const sparkline = getSparklinePoints(item.uiKey);
        const driverScore = shine?.scores?.[item.driver];
        const hasValue = item.val != null;

        return (
          <div
            key={item.uiKey}
            ref={role === 'primary' ? primaryCardRef : undefined}
          >
            <HealthDriverCard
              label={item.label}
              value={item.val}
              formattedValue={
                hasValue ? formatValue(item.uiKey, item.val as number, item.unit) : undefined
              }
              sparklineData={sparkline}
              sparklineColor={item.color}
              insight={getDriverInsight(
                item.driver,
                driverScore,
                shine?.state ?? 'waiting',
                shine?.trend ?? 'unknown',
              )}
              driverRole={role}
              shineState={shine?.state}
              defaultExpanded={defaultExpandPrimary && role === 'primary'}
              onPress={() => onMetricPress(item.uiKey, hasValue)}
            />
          </div>
        );
      })}
    </HealthGroup>
  );
}
