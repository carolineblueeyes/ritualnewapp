import React, { useId, useMemo } from 'react';

interface HealthSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export default function HealthSparkline({
  data,
  color = '#74B6A0',
  height = 100,
  className = '',
}: HealthSparklineProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `spark-fill-${uid}`;

  const path = useMemo(() => {
    if (data.length < 2) return null;
    const width = 320;
    const padY = 8;
    const innerH = height - padY * 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    const points = data.map((value, index) => {
      const x = index * step;
      const y = padY + innerH - ((value - min) / range) * innerH;
      return { x, y };
    });

    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area, width, last: points[points.length - 1] };
  }, [data, height]);

  if (!path) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white/[0.03] ${className}`}
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${path.width} ${height}`}
      className={`w-full ${className}`}
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.22"
        style={{ filter: 'blur(6px)' }}
      />
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={path.last.x} cy={path.last.y} r="8" fill={color} opacity="0.22" />
      <circle cx={path.last.x} cy={path.last.y} r="3" fill="#08090A" stroke={color} strokeWidth="2" />
    </svg>
  );
}
