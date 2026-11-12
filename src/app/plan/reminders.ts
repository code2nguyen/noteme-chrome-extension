/**
 * When a plan's reminder comes, and what it says: pure functions, run by the background worker (src/worker), which
 * keeps one chrome.alarms alarm per upcoming plan.
 */
import { formatTime } from '../settings/settings';
import type { ClockSetting } from '../settings/settings';
import { addDays, fromIsoDay, isTimed, minutesOf, PlanItem } from './plan';

/** An alarm of a plan is named `plan:<id>`, and so is its notification. */
export const REMINDER_PREFIX = 'plan:';

/** An all-day plan is announced at 9:00 on its first day. */
export const ALL_DAY_REMINDER_MINUTES = 9 * 60;

/** Chrome keeps 500 alarms at most; the nearest plans get theirs, the next ones as these go off. */
export const MAX_REMINDERS = 200;

function at(day: string, minutes: number): number {
  const date = fromIsoDay(day);
  // Set as a wall-clock time, so a daylight-saving change that night does not move it by an hour.
  // Minutes before midnight (a lead reaching into the day before) roll the date back.
  date.setHours(0, minutes, 0, 0);
  return date.getTime();
}

/**
 * When a plan is announced, in ms: `lead` minutes before it starts, or at 9:00 for one that lasts all day. A plan over
 * several days is announced once, on its first.
 */
export function reminderAt(item: PlanItem, lead: number): number {
  return isTimed(item) ? at(item.date, minutesOf(item.start) - lead) : at(item.date, ALL_DAY_REMINDER_MINUTES);
}

/** When announcing a plan no longer makes sense: it has ended, or its (first) day has. */
export function reminderExpires(item: PlanItem): number {
  return isTimed(item) ? at(item.date, minutesOf(item.end)) : fromIsoDay(addDays(item.date, 1)).getTime();
}

/** A reminder that went off late (the computer was asleep, Chrome was closed) is still shown while the plan lasts. */
export function isReminderDue(item: PlanItem, lead: number, now: number): boolean {
  return reminderAt(item, lead) <= now && now < reminderExpires(item);
}

/** When a timed plan starts, in ms. */
function startsAt(item: PlanItem & { start: string }): number {
  return at(item.date, minutesOf(item.start));
}

/** A plan at the time it is set for: moved, it is another one to announce. */
export function reminderKey(item: PlanItem): string {
  return `${item.id}@${item.date}T${item.start ?? ''}`;
}

export interface Reminder {
  /** The alarm's name: `plan:<id>`. */
  name: string;
  when: number;
}

/**
 * The reminders still to come, the nearest first, `limit` at most. A plan with a time whose reminder is already past
 * but which has not started (it was just added, or reminders just switched on, less than the lead before it) is
 * announced when it starts instead, unless it was announced already (`reminded` holds its `reminderKey`).
 */
export function upcomingReminders(
  items: readonly PlanItem[],
  lead: number,
  now: number,
  limit = MAX_REMINDERS,
  reminded: ReadonlySet<string> = new Set(),
): Reminder[] {
  return items
    .flatMap((item): Reminder[] => {
      const name = REMINDER_PREFIX + item.id;
      const when = reminderAt(item, lead);
      if (when > now) {
        return [{ name, when }];
      }
      return isTimed(item) && startsAt(item) > now && !reminded.has(reminderKey(item))
        ? [{ name, when: startsAt(item) }]
        : [];
    })
    .sort((a, b) => a.when - b.when)
    .slice(0, limit);
}

/** The plan an alarm or a notification is about, if it is one of ours and the plan is still there. */
export function reminderPlan(name: string, items: readonly PlanItem[]): PlanItem | undefined {
  return name.startsWith(REMINDER_PREFIX)
    ? items.find((item) => item.id === name.slice(REMINDER_PREFIX.length))
    : undefined;
}

/** Under the plan's title in its notification: "19:00 – 20:00", or `allDay` in the app's language. */
export function reminderText(item: PlanItem, clock: ClockSetting, locale: string, allDay: string): string {
  if (!isTimed(item)) {
    return allDay;
  }
  const time = (text: string) => formatTime(new Date(at(item.date, minutesOf(text))), clock, locale);
  return `${time(item.start)} – ${time(item.end)}`;
}
