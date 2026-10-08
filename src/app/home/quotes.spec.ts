import { describe, expect, it } from 'vitest';
import { loadQuotes, pickQuote, Quote, QUOTE_LANGUAGES, QUOTE_THEMES, quoteId, THEME_GAP } from './quotes';

const quote = (text: string, author: string, theme: Quote['theme'], tags = [text]): Quote => ({
  text,
  author,
  lang: 'en',
  theme,
  tags,
});

/** A random() that returns these numbers in turn, then the last one. */
const sequence =
  (...numbers: number[]) =>
  () =>
    numbers.length > 1 ? numbers.shift()! : numbers[0];

describe('the bundled quotes', () => {
  it('number over a thousand, in English, French and Vietnamese', async () => {
    const quotes = await loadQuotes();
    expect(quotes.length).toBeGreaterThan(1000);
    for (const lang of QUOTE_LANGUAGES) expect(quotes.some((q) => q.lang === lang)).toBe(true);
  });

  it('each have a text, an author, a theme and tags', async () => {
    for (const q of await loadQuotes()) {
      expect(q.text.trim()).toBe(q.text);
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.text).not.toMatch(/["«»]/);
      expect(q.text.normalize('NFC')).toBe(q.text);
      expect(q.author.length).toBeGreaterThan(0);
      expect(QUOTE_THEMES).toContain(q.theme);
      expect(q.tags.length).toBeGreaterThan(0);
      for (const tag of q.tags) expect(tag).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('hold no quote twice, and give each its own id', async () => {
    const quotes = await loadQuotes();
    expect(new Set(quotes.map((q) => `${q.lang}:${q.text.toLowerCase()}`)).size).toBe(quotes.length);
    expect(new Set(quotes.map(quoteId)).size).toBe(quotes.length);
  });

  it('fill every theme in every language', async () => {
    const quotes = await loadQuotes();
    for (const lang of QUOTE_LANGUAGES) {
      for (const theme of QUOTE_THEMES) {
        expect(quotes.some((q) => q.lang === lang && q.theme === theme)).toBe(true);
      }
    }
  });
});

describe('quoteId', () => {
  it('is stable and tells languages apart', () => {
    expect(quoteId({ lang: 'en', text: 'a' })).toBe(quoteId({ lang: 'en', text: 'a' }));
    expect(quoteId({ lang: 'en', text: 'a' })).not.toBe(quoteId({ lang: 'fr', text: 'a' }));
  });
});

describe('pickQuote', () => {
  it('picks nothing from nothing, and any quote when nothing came before', () => {
    expect(pickQuote([], [])).toBeNull();
    const quotes = [quote('a', 'A', 'time'), quote('b', 'B', 'hope')];
    expect(pickQuote(quotes, [], sequence(0))).toBe(quotes[0]);
    expect(pickQuote(quotes, [], sequence(0.99))).toBe(quotes[1]);
  });

  it('keeps a theme away for THEME_GAP quotes, then picks at random among the rest', () => {
    const recent = QUOTE_THEMES.slice(0, THEME_GAP).map((theme, i) => quote(`r${i}`, `R${i}`, theme));
    const away = quote('away', 'X', QUOTE_THEMES[0]);
    const due = [quote('due1', 'Y', QUOTE_THEMES[THEME_GAP]), quote('due2', 'Z', QUOTE_THEMES[THEME_GAP + 1])];
    expect(pickQuote([away, ...due], recent, sequence(0))).toBe(due[0]);
    expect(pickQuote([away, ...due], recent, sequence(0.99))).toBe(due[1]);
  });

  it('prefers another author and no shared tag, and gives them up before giving up the theme', () => {
    const previous = quote('p', 'A', 'time', ['work']);
    const sameAuthor = quote('a', 'A', 'hope', ['joy']);
    const sharedTag = quote('b', 'B', 'hope', ['work']);
    const other = quote('c', 'C', 'hope', ['joy']);
    expect(pickQuote([sameAuthor, sharedTag, other], [previous], sequence(0))).toBe(other);
    expect(pickQuote([sameAuthor, sharedTag], [previous], sequence(0))).toBe(sharedTag);
    expect(pickQuote([sameAuthor, quote('t', 'T', 'time', ['joy'])], [previous], sequence(0))).toBe(sameAuthor);
  });

  it('still picks when nothing fits', () => {
    const previous = quote('p', 'A', 'time');
    const only = quote('q', 'A', 'time', ['p']);
    expect(pickQuote([only], [previous])).toBe(only);
  });
});
