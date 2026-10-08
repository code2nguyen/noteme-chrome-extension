import { describe, expect, it } from 'vitest';
import { QUOTES, quoteOfTheDay } from './quotes';

describe('quoteOfTheDay', () => {
  it('is stable through a day and changes the next day', () => {
    expect(quoteOfTheDay(new Date(2026, 9, 3, 1))).toBe(quoteOfTheDay(new Date(2026, 9, 3, 23)));
    expect(quoteOfTheDay(new Date(2026, 9, 4))).not.toBe(quoteOfTheDay(new Date(2026, 9, 3)));
  });

  it('has a text and an author for every quote', () => {
    for (const quote of QUOTES) {
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });

  it('has no quote twice', () => {
    expect(new Set(QUOTES.map((quote) => quote.text)).size).toBe(QUOTES.length);
  });
});
