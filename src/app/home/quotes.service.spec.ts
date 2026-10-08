import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadQuotes, Quote, quoteId, THEME_GAP } from './quotes';
import { QUOTE_CHANGE_MS, QuoteService } from './quotes.service';

const STATE_KEY = 'noteme-quote';
const MINUTE = 60_000;

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuoteService', () => {
  it('keeps the quote for ten minutes, then picks a new one', async () => {
    const service = new QuoteService();
    const start = Date.UTC(2026, 9, 8, 9);
    const first = await service.current(start);
    expect(first).not.toBeNull();
    expect(await service.current(start + MINUTE)).toEqual(first);
    expect(await service.current(start + QUOTE_CHANGE_MS - 1)).toEqual(first);
    const second = await service.current(start + QUOTE_CHANGE_MS);
    expect(second).not.toEqual(first);
    // The ten minutes count from when the new quote first showed.
    expect(await service.current(start + QUOTE_CHANGE_MS + 9 * MINUTE)).toEqual(second);
  });

  it('reads the kept quote at once, without loading the lists, and none once ten minutes have passed', async () => {
    const service = new QuoteService();
    expect(service.kept(0)).toBeNull();
    const first = await service.next(0);
    expect(service.kept(QUOTE_CHANGE_MS - 1)).toEqual(first);
    expect(service.kept(QUOTE_CHANGE_MS)).toBeNull();
  });

  it('shows the quote another tab picked while the lists loaded', async () => {
    const service = new QuoteService();
    const other = await new QuoteService().next(0);
    expect(await service.next(0)).toEqual(other);
  });

  it('picks a new quote when the clock went back', async () => {
    const service = new QuoteService();
    const start = Date.UTC(2026, 9, 8, 9);
    const first = await service.current(start);
    expect(await service.current(start - MINUTE)).not.toEqual(first);
  });

  it('changes theme and author from one quote to the next', async () => {
    const service = new QuoteService();
    let previous: Quote | null = null;
    for (let i = 0; i < 50; i++) {
      const next = (await service.current(i * QUOTE_CHANGE_MS))!;
      if (previous) {
        expect(next.theme).not.toBe(previous.theme);
        expect(next.author).not.toBe(previous.author);
      }
      previous = next;
    }
    const stored = JSON.parse(storage.get(STATE_KEY)!);
    expect(stored.recent).toHaveLength(THEME_GAP);
  });

  it('shows every quote once before any comes back', async () => {
    const service = new QuoteService();
    const quotes = await loadQuotes();
    const shown = new Set<string>();
    for (let i = 0; i < quotes.length; i++) {
      shown.add(quoteId((await service.current(i * QUOTE_CHANGE_MS))!));
    }
    expect(shown.size).toBe(quotes.length);
    expect(JSON.parse(storage.get(STATE_KEY)!).seen).toHaveLength(quotes.length);
    await service.current(quotes.length * QUOTE_CHANGE_MS);
    expect(JSON.parse(storage.get(STATE_KEY)!).seen).toHaveLength(1);
  });

  it('starts over from unreadable or broken storage', async () => {
    storage.set(STATE_KEY, '{not json');
    expect(await new QuoteService().current(0)).not.toBeNull();
    storage.set(STATE_KEY, JSON.stringify({ shownAt: 'x', recent: 3, seen: null }));
    expect(await new QuoteService().current(0)).not.toBeNull();
  });

  it('still shows a quote when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('disabled');
      },
      setItem: () => {
        throw new Error('disabled');
      },
    });
    expect(await new QuoteService().current(0)).not.toBeNull();
  });
});
