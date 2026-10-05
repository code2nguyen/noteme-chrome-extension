/**
 * Plans: what is on which day, optionally at what time. One small list, edited through pure functions (unit-tested)
 * and drawn by c2-week-planner and c2-month-planner.
 */
import type { MonthPlannerEvent } from '@c2n/components/month-planner';
import type { WeekPlannerEvent } from '@c2n/components/week-planner';

export interface PlanItem {
  id: string;
  title: string;
  /** First day, `YYYY-MM-DD`. */
  date: string;
  /** Last day of a plan over several days; absent for one day. */
  endDate?: string;
  /** `HH:MM`; absent for an all-day plan. */
  start?: string;
  end?: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;

export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, days: number): string {
  const date = fromIsoDay(day);
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeOf(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function isTimed(item: PlanItem): item is PlanItem & { start: string; end: string } {
  return !!item.start && !!item.end;
}

/** Read stored plans defensively: anything malformed is dropped. */
export function parsePlans(raw: unknown): PlanItem[] {
  const list = Array.isArray((raw as { items?: unknown } | null)?.items) ? (raw as { items: unknown[] }).items : [];
  return list.flatMap((value): PlanItem[] => {
    const item = value as Partial<PlanItem> | null;
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || !DAY.test(item.date ?? '')) {
      return [];
    }
    const timed =
      TIME.test(item.start ?? '') && TIME.test(item.end ?? '') && minutesOf(item.end!) > minutesOf(item.start!);
    const endDate = DAY.test(item.endDate ?? '') && item.endDate! > item.date! ? item.endDate : undefined;
    return [
      {
        id: item.id,
        title: item.title,
        date: item.date!,
        ...(endDate ? { endDate } : {}),
        ...(timed ? { start: item.start, end: item.end } : {}),
      },
    ];
  });
}

/** Plans of one day, all-day ones first, then by time. */
export function plansOn(items: readonly PlanItem[], day: string): PlanItem[] {
  return items
    .filter((item) => item.date <= day && (item.endDate ?? item.date) >= day)
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '') || a.title.localeCompare(b.title));
}

/** All-day plans touching the week that starts on `first`. */
export function allDayInWeek(items: readonly PlanItem[], first: string): PlanItem[] {
  const last = addDays(first, 6);
  return items
    .filter((item) => !isTimed(item) && item.date <= last && (item.endDate ?? item.date) >= first)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The timed plans, as c2-week-planner events (it shows each in the dated week that holds it). */
export function toWeekEvents(items: readonly PlanItem[]): WeekPlannerEvent[] {
  return items
    .filter(isTimed)
    .map((item) => ({ id: item.id, title: item.title, date: item.date, start: item.start, end: item.end }));
}

/** Every plan as a c2-month-planner bar; a timed one says its time first. */
export function toMonthEvents(items: readonly PlanItem[]): MonthPlannerEvent[] {
  return items.map((item) => ({
    id: item.id,
    title: isTimed(item) ? `${item.start} ${item.title}` : item.title,
    start: item.date,
    ...(item.endDate ? { end: item.endDate } : {}),
  }));
}

/**
 * "Dinner with Linh 19:00", "Gym 7:30-8:30", "Call the bank": a title with an optional time or time range anywhere
 * in it. A single time lasts an hour.
 */
export function parseQuickAdd(text: string): { title: string; start?: string; end?: string } {
  const match = /(?:^|\s)(\d{1,2})[:h](\d{2})(?:\s*[-–]\s*(\d{1,2})[:h](\d{2}))?(?=\s|$)/.exec(text);
  if (!match) {
    return { title: text.trim() };
  }
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = match[3] ? Number(match[3]) * 60 + Number(match[4]) : start + 60;
  const title = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim();
  if (Number(match[2]) > 59 || start >= 24 * 60 || end <= start) {
    return { title: text.trim() };
  }
  return { title, start: timeOf(start), end: timeOf(Math.min(end, 24 * 60)) };
}

/** Apply a week-planner move or resize. */
export function moveInWeek(item: PlanItem, changes: { date?: string; start: string; end: string }): PlanItem {
  return { ...item, date: changes.date ?? item.date, start: changes.start, end: changes.end };
}

/** Apply a month-planner move or resize: new first and last day. */
export function moveInMonth(item: PlanItem, changes: { start: string; end: string }): PlanItem {
  const { endDate: _endDate, ...rest } = item;
  return changes.end > changes.start
    ? { ...rest, date: changes.start, endDate: changes.end }
    : { ...rest, date: changes.start };
}

/** The first day of the week holding `day`, the week starting on Monday or Sunday. */
export function weekStartOf(day: string, weekStart: 'monday' | 'sunday'): string {
  const date = fromIsoDay(day);
  const offset = weekStart === 'monday' ? (date.getDay() + 6) % 7 : date.getDay();
  return addDays(day, -offset);
}
