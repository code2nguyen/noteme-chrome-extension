import { describe, expect, it } from 'vitest';
import { QUOTES, QUOTE_ORDER, QUOTE_THEMES, type Quote, quoteOfTheDay, varied } from './quotes';

/** Each quote with the days that lead into it, the cycle's last days leading into its first. */
function withDaysBefore(order: readonly Quote[], days: number): [Quote, Quote[]][] {
  return order.map((quote, i) => [
    quote,
    Array.from({ length: days }, (_, d) => order[(i - days + d + order.length) % order.length]),
  ]);
}

describe('quoteOfTheDay', () => {
  it('is stable through a day and changes the next day', () => {
    expect(quoteOfTheDay(new Date(2026, 9, 3, 1))).toBe(quoteOfTheDay(new Date(2026, 9, 3, 23)));
    expect(quoteOfTheDay(new Date(2026, 9, 4))).not.toBe(quoteOfTheDay(new Date(2026, 9, 3)));
  });

  it('walks the order day by day, across the new year too', () => {
    const at = QUOTE_ORDER.indexOf(quoteOfTheDay(new Date(2026, 11, 31)));
    expect(quoteOfTheDay(new Date(2027, 0, 1))).toBe(QUOTE_ORDER[(at + 1) % QUOTE_ORDER.length]);
  });

  it('shows every quote once before showing any again', () => {
    const shown = Array.from({ length: QUOTES.length }, (_, d) => quoteOfTheDay(new Date(2026, 0, 1 + d)));
    expect(new Set(shown).size).toBe(QUOTES.length);
  });
});

describe('QUOTES', () => {
  it('has a text, an author, a theme and tags for every quote', () => {
    for (const quote of QUOTES) {
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
      expect(QUOTE_THEMES).toContain(quote.theme);
      expect(quote.tags.length).toBeGreaterThan(0);
      for (const tag of quote.tags) expect(tag).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('has no quote twice', () => {
    expect(new Set(QUOTES.map((quote) => quote.text)).size).toBe(QUOTES.length);
  });

  it('has quotes in every theme', () => {
    for (const theme of QUOTE_THEMES) expect(QUOTES.some((quote) => quote.theme === theme)).toBe(true);
  });
});

describe('QUOTE_ORDER', () => {
  it('holds every quote once', () => {
    expect(QUOTE_ORDER).toHaveLength(QUOTES.length);
    expect(new Set(QUOTE_ORDER).size).toBe(QUOTES.length);
  });

  it('never shows the same theme, author or tag two days in a row', () => {
    for (const [quote, [previous]] of withDaysBefore(QUOTE_ORDER, 1)) {
      expect(quote.theme).not.toBe(previous.theme);
      expect(quote.author).not.toBe(previous.author);
      expect(quote.tags.filter((tag) => previous.tags.includes(tag))).toEqual([]);
    }
  });

  it('keeps a theme away for at least six days after it is shown', () => {
    for (const [quote, before] of withDaysBefore(QUOTE_ORDER, 6)) {
      expect(before.map((shown) => shown.theme)).not.toContain(quote.theme);
    }
  });
});

describe('varied', () => {
  const quote = (text: string, author: string, theme: Quote['theme'], tags = [text]): Quote => ({
    text,
    author,
    theme,
    tags,
  });

  it('orders nothing and one quote as they are', () => {
    expect(varied([])).toEqual([]);
    const only = quote('a', 'A', 'time');
    expect(varied([only])).toEqual([only]);
  });

  it('alternates themes and authors when it can', () => {
    const quotes = [
      quote('a', 'A', 'time'),
      quote('b', 'A', 'time'),
      quote('c', 'B', 'time'),
      quote('d', 'B', 'hope'),
      quote('e', 'C', 'hope'),
      quote('f', 'C', 'hope'),
    ];
    const order = varied(quotes);
    expect(new Set(order)).toEqual(new Set(quotes));
    for (const [current, [previous]] of withDaysBefore(order, 1)) {
      expect(current.theme).not.toBe(previous.theme);
      expect(current.author).not.toBe(previous.author);
    }
  });

  it('still orders every quote when one theme fills the list', () => {
    const quotes = [quote('a', 'A', 'time'), quote('b', 'B', 'time'), quote('c', 'A', 'time')];
    expect(new Set(varied(quotes))).toEqual(new Set(quotes));
  });
});
