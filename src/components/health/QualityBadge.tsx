import React from 'react';
import { getQualityMeta, type QualityTier } from './healthQuality';

export default function QualityBadge({ tier }: { tier: QualityTier }) {
  const meta = getQualityMeta(tier);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide"
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
    >
      {meta.label}
    </span>
  );
}
