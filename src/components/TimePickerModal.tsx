import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, X } from 'lucide-react';

interface TimePickerModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  value: string;
  defaultValue: string;
  minuteStep?: number;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export function normalizeTime(value: string | null | undefined, fallback: string): string {
  const match = typeof value === 'string' ? value.match(/^([01]\d|2[0-3]):([0-5]\d)$/) : null;
  return match ? value : fallback;
}

function splitTime(value: string): { hour: string; minute: string } {
  const [hour, minute] = value.split(':');
  return { hour, minute };
}

interface TimeWheelColumnProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

const ITEM_HEIGHT = 40;
const WHEEL_PADDING = 80;

function TimeWheelColumn({ items, value, onChange }: TimeWheelColumnProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);

  const getCenteredValue = () => {
    const container = containerRef.current;
    if (!container || items.length === 0) return value;

    const center = container.scrollTop + container.clientHeight / 2;
    const index = Math.round((center - WHEEL_PADDING - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
    const safeIndex = Math.min(items.length - 1, Math.max(0, index));
    return items[safeIndex];
  };

  const scrollValueToCenter = (nextValue: string, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    const index = items.indexOf(nextValue);
    if (!container || index < 0) return;

    isSnappingRef.current = true;
    const nextScrollTop = WHEEL_PADDING + index * ITEM_HEIGHT + ITEM_HEIGHT / 2 - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, nextScrollTop), behavior });
    window.setTimeout(() => {
      isSnappingRef.current = false;
    }, behavior === 'auto' ? 0 : 220);
  };

  useEffect(() => {
    if (!items.includes(value)) return;
    if (snapTimerRef.current !== null || isSnappingRef.current) return;
    window.requestAnimationFrame(() => scrollValueToCenter(value, 'auto'));
  }, [items, value]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    const centeredValue = getCenteredValue();
    if (!isSnappingRef.current && centeredValue !== value) {
      onChange(centeredValue);
    }

    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
    }

    snapTimerRef.current = window.setTimeout(() => {
      snapTimerRef.current = null;
      if (!isSnappingRef.current) {
        scrollValueToCenter(getCenteredValue());
      }
    }, 90);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative max-h-52 overflow-y-auto rounded-2xl bg-white/[0.015] py-20 hide-scrollbar"
    >
      {items.map(item => (
        <button
          key={item}
          onClick={() => {
            onChange(item);
            scrollValueToCenter(item);
          }}
          className={`h-10 w-full text-center font-mono text-lg transition-all ${
            value === item ? 'text-white font-semibold scale-110' : 'text-white/35'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function TimePickerModal({
  isOpen,
  title,
  subtitle,
  value,
  defaultValue,
  minuteStep = 5,
  onClose,
  onConfirm,
}: TimePickerModalProps) {
  const normalized = normalizeTime(value, defaultValue);
  const initial = splitTime(normalized);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => (i * minuteStep).toString().padStart(2, '0')),
    [minuteStep],
  );

  useEffect(() => {
    if (!isOpen) return;
    const next = splitTime(normalizeTime(value, defaultValue));
    setHour(next.hour);
    setMinute(minutes.includes(next.minute) ? next.minute : minutes[0] ?? '00');
  }, [defaultValue, isOpen, minutes, value]);

  if (!isOpen) return null;

  const confirm = () => {
    const safeMinute = minutes.includes(minute) ? minute : '00';
    onConfirm(`${hour}:${safeMinute}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#101014] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center">
              <Clock className="w-5 h-5 text-white/60" />
            </div>
            <div className="min-w-0 text-left">
              <h3 className="text-sm font-semibold text-white/80">{title}</h3>
              {subtitle && <p className="text-[10px] text-white/45 mt-0.5 leading-snug">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
            <X className="w-4 h-4 text-white/45" />
          </button>
        </div>

        <div className="relative grid grid-cols-[1fr_auto_1fr] gap-3 py-5">
          <div className="absolute left-0 right-0 top-1/2 h-10 -translate-y-1/2 rounded-2xl border border-white/[0.06] bg-white/[0.03] pointer-events-none" />
          <TimeWheelColumn items={hours} value={hour} onChange={setHour} />
          <div className="relative z-10 flex items-center justify-center text-xl font-mono text-white/35">:</div>
          <TimeWheelColumn items={minutes} value={minute} onChange={setMinute} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="h-11 rounded-xl bg-white/[0.04] text-[11px] font-medium text-white/55">
            Отмена
          </button>
          <button onClick={confirm} className="h-11 rounded-xl bg-white text-black text-[11px] font-semibold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Готово
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
