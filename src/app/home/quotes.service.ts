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
  /** The quote still on screen when it is under ten minutes old, read at once; else null, and next() is due. */
  kept(now = Date.now()): Quote | null {
    const state = readState();
    const last = state.recent.at(-1);
    return last && now >= state.shownAt && now - state.shownAt < QUOTE_CHANGE_MS ? last : null;
  }

  /** The quote to show now: the kept one, else a new one, which loads the lists first. */
  async current(now = Date.now(), random: () => number = Math.random): Promise<Quote | null> {
    return this.kept(now) ?? this.next(now, random);
  }

  /** A new quote, picked at random among those not shown yet this round, and remembered as shown at `now`. */
  async next(now = Date.now(), random: () => number = Math.random): Promise<Quote | null> {
    const quotes = await loadQuotes();
    // Another tab may have picked while the lists loaded: both then show its quote.
    const picked = this.kept(now);
    if (picked) {
      return picked;
    }
    const state = readState();
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
      return state.recent.at(-1) ?? null;
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
