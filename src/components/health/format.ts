export function formatDurationHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}ч ${m}м`;
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}м`;
  return `${h}ч ${m}м`;
}

export function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function todayIso(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function chartDayLabel(date: string | null | undefined): string {
  if (!date) return '';
  const match = String(date).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${Number(match[3])}.${match[2]}`;
}

export function shiftDate(iso: string, deltaDays: number): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return todayIso();
  date.setDate(date.getDate() + deltaDays);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  if (Number.isNaN(local.getTime())) return todayIso();
  return local.toISOString().slice(0, 10);
}

function parseLocalDate(iso: string): Date {
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[parseLocalDate(iso).getDay()] ?? '';
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[parseLocalDate(iso).getMonth()] ?? '';
}

export function monthFull(iso: string): string {
  return MONTHS_FULL[parseLocalDate(iso).getMonth()] ?? '';
}

export function dateDayNumber(iso: string): string {
  return String(parseLocalDate(iso).getDate());
}

export function startOfWeek(iso: string): string {
  const date = parseLocalDate(iso);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toIsoDate(date);
}

export function endOfWeek(iso: string): string {
  const date = parseLocalDate(startOfWeek(iso));
  date.setDate(date.getDate() + 6);
  return toIsoDate(date);
}

export function startOfMonth(iso: string): string {
  const date = parseLocalDate(iso);
  date.setDate(1);
  return toIsoDate(date);
}

export function endOfMonth(iso: string): string {
  const date = parseLocalDate(iso);
  date.setMonth(date.getMonth() + 1, 0);
  return toIsoDate(date);
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function alignDateToPeriod(iso: string, period: 'day' | 'week' | 'month'): string {
  const today = todayIso();
  const clamped = minDate(iso, today);
  if (period === 'week') return minDate(endOfWeek(clamped), today);
  if (period === 'month') return minDate(endOfMonth(clamped), today);
  return clamped;
}

export function isSameWeek(a: string, b: string): boolean {
  return startOfWeek(a) === startOfWeek(b);
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function weekRangeLabel(iso: string): { primary: string; secondary: string } {
  const start = startOfWeek(iso);
  const end = endOfWeek(iso);
  const startDay = dateDayNumber(start);
  const endDay = dateDayNumber(end);
  const startMonth = monthShort(start);
  const endMonth = monthShort(end);
  return {
    primary: `${startDay}–${endDay}`,
    secondary: startMonth === endMonth ? startMonth : `${startMonth}–${endMonth}`,
  };
}

export function formatFriendlyDate(iso: string): string {
  const today = todayIso();
  if (iso === today) return 'Сегодня';
  const yesterday = shiftDate(today, -1);
  if (iso === yesterday) return 'Вчера';
  const match = String(iso ?? '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso || '';
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return iso;
  return `${Number(match[3])} ${months[monthIndex]}`;
}

export function formatMetricValue(key: string, value: number, unit: string): string {
  if (key === 'sleep' || unit === 'ч') return formatDurationHours(value);
  if (key === 'activity' || unit === 'шагов') return Math.round(value).toLocaleString('ru-RU');
  if (key === 'oxygen' || unit === '%') return `${Math.round(value)}%`;
  if (key === 'temp' || unit === '°C') return `${value.toFixed(1)}°C`;
  if (key === 'resp') return `${value.toFixed(1)} ${unit}`;
  return `${Math.round(value)} ${unit}`;
}
