import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HealthPeriod } from './types';
import {
  alignDateToPeriod,
  dateDayNumber,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isSameWeek,
  monthFull,
  monthShort,
  shiftDate,
  startOfMonth,
  startOfWeek,
  todayIso,
  weekRangeLabel,
  weekdayShort,
} from './format';

interface PeriodRingProps {
  period: HealthPeriod;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
}

interface RingItem {
  id: string;
  primary: string;
  secondary: string;
}

function buildItems(period: HealthPeriod): RingItem[] {
  const today = todayIso();
  const items: RingItem[] = [];

  if (period === 'day') {
    for (let i = 27; i >= 0; i -= 1) {
      const id = shiftDate(today, -i);
      items.push({
        id,
        primary: dateDayNumber(id),
        secondary: weekdayShort(id),
      });
    }
    return items;
  }

  if (period === 'week') {
    const currentStart = startOfWeek(today);
    for (let i = 15; i >= 0; i -= 1) {
      const start = shiftDate(currentStart, -i * 7);
      const id = alignDateToPeriod(endOfWeek(start), 'week');
      const label = weekRangeLabel(id);
      items.push({ id, primary: label.primary, secondary: label.secondary });
    }
    return items;
  }

  const currentMonth = startOfMonth(today);
  for (let i = 11; i >= 0; i -= 1) {
    const cursor = parseMonthOffset(currentMonth, -i);
    const id = alignDateToPeriod(endOfMonth(cursor), 'month');
    items.push({
      id,
      primary: monthFull(id),
      secondary: id.slice(0, 4),
    });
  }
  return items;
}

function parseMonthOffset(iso: string, deltaMonths: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setMonth(date.getMonth() + deltaMonths, 1);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function itemMatches(itemId: string, selectedDate: string, period: HealthPeriod): boolean {
  if (period === 'week') return isSameWeek(itemId, selectedDate);
  if (period === 'month') return isSameMonth(itemId, selectedDate);
  return itemId === selectedDate;
}

export default function PeriodRing({
  period,
  selectedDate,
  onSelectedDateChange,
}: PeriodRingProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticRef = useRef(false);
  const items = useMemo(() => buildItems(period), [period]);
  const [edgePad, setEdgePad] = useState(96);

  const scrollToSelected = useCallback((smooth: boolean) => {
    const root = scrollerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>('[data-ring-active="true"]');
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    programmaticRef.current = true;
    const left = target.offsetLeft - (root.clientWidth - target.offsetWidth) / 2;
    root.scrollTo({
      left: Math.max(0, left),
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    });
    window.setTimeout(() => {
      programmaticRef.current = false;
    }, smooth && !reduceMotion ? 280 : 80);
  }, []);

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;
    const measure = () => {
      setEdgePad(Math.max(48, root.clientWidth / 2 - 38));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [period, items]);

  useLayoutEffect(() => {
    scrollToSelected(false);
  }, [period, items, selectedDate, edgePad, scrollToSelected]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;
    let timer = 0;

    const commitNearest = () => {
      if (programmaticRef.current) return;
      const bounds = root.getBoundingClientRect();
      const center = bounds.left + bounds.width / 2;
      let nearestId = items[items.length - 1]?.id;
      let nearestDist = Number.POSITIVE_INFINITY;
      root.querySelectorAll<HTMLElement>('[data-ring-id]').forEach(node => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - center);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = node.dataset.ringId;
        }
      });
      if (nearestId && !itemMatches(nearestId, selectedDate, period)) {
        onSelectedDateChange(nearestId);
      }
    };

    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(commitNearest, 80);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener('scroll', onScroll);
    };
  }, [items, onSelectedDateChange, period, selectedDate]);

  return (
    <div
      ref={scrollerRef}
      onContextMenu={(event) => event.preventDefault()}
      className="flex gap-1 overflow-x-auto snap-x snap-mandatory hide-scrollbar overscroll-x-contain select-none -mx-5"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="shrink-0" style={{ width: edgePad }} aria-hidden="true" />
      {items.map(item => {
        const active = itemMatches(item.id, selectedDate, period);
        return (
          <button
            key={item.id}
            type="button"
            data-ring-id={item.id}
            data-ring-active={active ? 'true' : 'false'}
            aria-pressed={active}
            aria-label={period === 'day' ? `${item.secondary} ${item.primary}` : `${item.primary} ${item.secondary}`}
            onClick={() => {
              onSelectedDateChange(item.id);
              requestAnimationFrame(() => scrollToSelected(true));
            }}
            className={`snap-center shrink-0 min-w-[4.7rem] px-2 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-[color,background-color,transform] duration-[160ms] ease-out active:scale-[0.97] ${
              active
                ? 'bg-white/[0.10] text-[#F2EFE8]'
                : 'text-[#F2EFE8]/38'
            }`}
          >
            <span className={`text-[10px] leading-none tracking-wide ${active ? 'text-[#F2EFE8]/55' : 'text-[#F2EFE8]/28'}`}>
              {item.secondary}
            </span>
            <span className={`leading-none ${active ? 'font-display text-[22px] font-light' : 'text-[15px] font-medium tabular-nums'}`}>
              {period === 'month' && !active ? monthShort(item.id) : item.primary}
            </span>
          </button>
        );
      })}
      <div className="shrink-0" style={{ width: edgePad }} aria-hidden="true" />
    </div>
  );
}
