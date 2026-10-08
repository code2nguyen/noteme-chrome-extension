import { Injectable } from '@angular/core';
import { loadQuotes, pickQuote, Quote, quoteId, THEME_GAP } from './quotes';

const STATE_KEY = 'noteme-quote';
/** How long a quote stays: tabs opened one after another keep it, a tab opened later brings a new one. */
export const QUOTE_CHANGE_MS = 10 * 60_000;

interface State {
  /** When the last quote of `recent` was first shown. */
  shownAt: number;
  /** The last quotes shown, latest last: the one on screen, and the ones the next quote should differ from. */
  recent: Quote[];
  /** Ids of the quotes shown since the list was last gone through, so none comes back before all have shown. */
  seen: string[];
}

const EMPTY: State = { shownAt: 0, recent: [], seen: [] };

/**
 * The quote on the new tab: a new one, at random, when a tab opens more than ten minutes after the last one changed,
 * else the same one. The state lives in localStorage, per device, like the background photo's.
 */
@Injectable({ providedIn: 'root' })
export class QuoteService {
  async current(now = Date.now(), random: () => number = Math.random): Promise<Quote | null> {
    const state = readState();
    const last = state.recent.at(-1);
    if (last && now >= state.shownAt && now - state.shownAt < QUOTE_CHANGE_MS) {
      return last;
    }

    const quotes = await loadQuotes();
    const ids = new Set(quotes.map(quoteId));
    // Ids of quotes no longer bundled drop out; once every quote has shown, a new round starts.
    let seen = state.seen.filter((id) => ids.has(id));
    if (seen.length >= ids.size) {
      seen = [];
    }
    const unseen = new Set(seen);
    const quote = pickQuote(
      quotes.filter((candidate) => !unseen.has(quoteId(candidate))),
      state.recent,
      random,
    );
    if (!quote) {
      return last ?? null;
    }
    writeState({
      shownAt: now,
      recent: [...state.recent, quote].slice(-THEME_GAP),
      seen: [...seen, quoteId(quote)],
    });
    return quote;
  }
}

/** localStorage can throw (storage disabled) or hold something unreadable: the quote then changes every time. */
function readState(): State {
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as Partial<State> | null;
    return {
      shownAt: typeof stored?.shownAt === 'number' ? stored.shownAt : 0,
      recent: Array.isArray(stored?.recent) ? stored.recent : [],
      seen: Array.isArray(stored?.seen) ? stored.seen : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeState(state: State): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Not stored: the next tab picks again.
  }
}
