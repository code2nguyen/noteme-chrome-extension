import { describe, expect, it } from 'vitest';
import {
  addDays,
  allDayInWeek,
  moveInMonth,
  moveInWeek,
  parsePlans,
  parseQuickAdd,
  PlanItem,
  plansOn,
  toMonthEvents,
  toWeekEvents,
  weekStartOf,
} from './plan';

const items: PlanItem[] = [
  { id: 'a', title: 'Dinner with Linh', date: '2026-10-15', start: '19:00', end: '21:00' },
  { id: 'b', title: 'Pack', date: '2026-10-16' },
  { id: 'c', title: 'Đà Lạt', date: '2026-10-16', endDate: '2026-10-18' },
  { id: 'd', title: 'Gym', date: '2026-10-15', start: '07:30', end: '08:30' },
];

describe('plans', () => {
  it('reads stored plans defensively', () => {
    expect(parsePlans(null)).toEqual([]);
    expect(
      parsePlans({
        items: [
          items[0],
          { id: 'x', title: 'No date' },
          { id: 'y', title: 'Bad time', date: '2026-10-01', start: '25:00', end: '26:00' },
          { id: 'z', title: 'Ends first', date: '2026-10-05', endDate: '2026-10-01' },
        ],
      }),
    ).toEqual([
      items[0],
      { id: 'y', title: 'Bad time', date: '2026-10-01' },
      { id: 'z', title: 'Ends first', date: '2026-10-05' },
    ]);
  });

  it('lists a day, all-day first then by time, including plans over several days', () => {
    expect(plansOn(items, '2026-10-15').map((item) => item.id)).toEqual(['d', 'a']);
    expect(plansOn(items, '2026-10-16').map((item) => item.id)).toEqual(['c', 'b']);
    expect(plansOn(items, '2026-10-18').map((item) => item.id)).toEqual(['c']);
  });

  it('gives the week its timed plans and the strip its all-day ones', () => {
    expect(toWeekEvents(items).map((event) => event.id)).toEqual(['a', 'd']);
    expect(toWeekEvents(items)[0]).toEqual({
      id: 'a',
      title: 'Dinner with Linh',
      date: '2026-10-15',
      start: '19:00',
      end: '21:00',
    });
    expect(allDayInWeek(items, '2026-10-12').map((item) => item.id)).toEqual(['b', 'c']);
    expect(allDayInWeek(items, '2026-10-19')).toEqual([]);
  });

  it('gives the month every plan, timed ones with their time', () => {
    expect(toMonthEvents(items)).toEqual([
      { id: 'a', title: '19:00 Dinner with Linh', start: '2026-10-15' },
      { id: 'b', title: 'Pack', start: '2026-10-16' },
      { id: 'c', title: 'Đà Lạt', start: '2026-10-16', end: '2026-10-18' },
      { id: 'd', title: '07:30 Gym', start: '2026-10-15' },
    ]);
  });

  it('reads a time or a time range typed with the title', () => {
    expect(parseQuickAdd('Dinner with Linh 19:00')).toEqual({
      title: 'Dinner with Linh',
      start: '19:00',
      end: '20:00',
    });
    expect(parseQuickAdd('Gym 7:30-8:30')).toEqual({ title: 'Gym', start: '07:30', end: '08:30' });
    expect(parseQuickAdd('9h00 – 10h30 standup')).toEqual({ title: 'standup', start: '09:00', end: '10:30' });
    expect(parseQuickAdd('Call the bank')).toEqual({ title: 'Call the bank' });
    expect(parseQuickAdd('Room 12:75')).toEqual({ title: 'Room 12:75' });
    expect(parseQuickAdd('Late 23:30')).toEqual({ title: 'Late', start: '23:30', end: '24:00' });
  });

  it('applies moves from the planners', () => {
    expect(moveInWeek(items[0], { date: '2026-10-16', start: '18:00', end: '20:00' })).toMatchObject({
      date: '2026-10-16',
      start: '18:00',
      end: '20:00',
    });
    expect(moveInMonth(items[2], { start: '2026-10-20', end: '2026-10-20' })).toEqual({
      id: 'c',
      title: 'Đà Lạt',
      date: '2026-10-20',
    });
    expect(moveInMonth(items[1], { start: '2026-10-16', end: '2026-10-17' })).toMatchObject({ endDate: '2026-10-17' });
  });

  it('finds the first day of a week', () => {
    expect(weekStartOf('2026-10-15', 'monday')).toBe('2026-10-12');
    expect(weekStartOf('2026-10-15', 'sunday')).toBe('2026-10-11');
    expect(weekStartOf('2026-10-11', 'monday')).toBe('2026-10-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
