import { describe, expect, it } from 'vitest';
import type { PlanItem } from './plan';
import { isReminderDue, reminderAt, reminderPlan, reminderText, upcomingReminders } from './reminders';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

const dinner: PlanItem = { id: 'dinner', title: 'Dinner', date: '2026-11-20', start: '19:00', end: '20:30' };
const trip: PlanItem = { id: 'trip', title: 'Trip', date: '2026-11-21', endDate: '2026-11-23' };

describe('reminderAt', () => {
  it('comes the lead before a timed plan starts', () => {
    expect(reminderAt(dinner, 10)).toBe(at(2026, 11, 20, 18, 50));
    expect(reminderAt(dinner, 0)).toBe(at(2026, 11, 20, 19, 0));
  });

  it('reaches into the day before for a plan early in the morning', () => {
    const early: PlanItem = { ...dinner, start: '00:15', end: '01:00' };
    expect(reminderAt(early, 30)).toBe(at(2026, 11, 19, 23, 45));
  });

  it('comes at 9:00 on the first day of an all-day plan, whatever the lead', () => {
    expect(reminderAt(trip, 60)).toBe(at(2026, 11, 21, 9, 0));
  });
});

describe('isReminderDue', () => {
  it('is due from its time until the plan ends', () => {
    expect(isReminderDue(dinner, 10, at(2026, 11, 20, 18, 49))).toBe(false);
    expect(isReminderDue(dinner, 10, at(2026, 11, 20, 18, 50))).toBe(true);
    // Late (the computer was asleep), the plan still on.
    expect(isReminderDue(dinner, 10, at(2026, 11, 20, 20, 29))).toBe(true);
    expect(isReminderDue(dinner, 10, at(2026, 11, 20, 20, 30))).toBe(false);
  });

  it('is due until the end of the first day for an all-day plan', () => {
    expect(isReminderDue(trip, 10, at(2026, 11, 21, 23, 59))).toBe(true);
    expect(isReminderDue(trip, 10, at(2026, 11, 22, 0, 0))).toBe(false);
  });

  it('is not due for an alarm left over from before the plan was moved later', () => {
    const moved: PlanItem = { ...dinner, date: '2026-11-27' };
    expect(isReminderDue(moved, 10, at(2026, 11, 20, 18, 50))).toBe(false);
  });
});

describe('upcomingReminders', () => {
  it('lists the reminders still to come, the nearest first', () => {
    const past: PlanItem = { ...dinner, id: 'past', date: '2026-11-01' };
    expect(upcomingReminders([trip, past, dinner], 10, at(2026, 11, 10))).toEqual([
      { name: 'plan:dinner', when: at(2026, 11, 20, 18, 50) },
      { name: 'plan:trip', when: at(2026, 11, 21, 9, 0) },
    ]);
  });

  it('leaves out one whose time has come, and keeps to the limit', () => {
    expect(upcomingReminders([dinner], 10, at(2026, 11, 20, 18, 50))).toEqual([]);
    expect(upcomingReminders([trip, dinner], 10, at(2026, 11, 10), 1)).toEqual([
      { name: 'plan:dinner', when: at(2026, 11, 20, 18, 50) },
    ]);
  });
});

describe('reminderPlan', () => {
  it('finds the plan an alarm is about', () => {
    expect(reminderPlan('plan:trip', [dinner, trip])).toBe(trip);
    expect(reminderPlan('plan:gone', [dinner, trip])).toBeUndefined();
    expect(reminderPlan('trip', [dinner, trip])).toBeUndefined();
  });
});

describe('reminderText', () => {
  it('says the times in the clock chosen', () => {
    expect(reminderText(dinner, '24h', 'en', 'All day')).toBe('19:00 – 20:30');
    expect(reminderText(dinner, '12h', 'en-US', 'All day')).toMatch(/^7:00\sPM – 8:30\sPM$/);
  });

  it('says a plan lasts all day in the words given', () => {
    expect(reminderText(trip, '24h', 'fr', 'Toute la journée')).toBe('Toute la journée');
  });
});
