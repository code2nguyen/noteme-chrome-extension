export const QUOTE_THEMES = [
  'action',
  'character',
  'courage',
  'hope',
  'kindness',
  'learning',
  'mind',
  'nature',
  'perseverance',
  'simplicity',
  'time',
] as const;

export type QuoteTheme = (typeof QUOTE_THEMES)[number];

export const QUOTE_LANGUAGES = ['en', 'fr', 'vi'] as const;

export type QuoteLanguage = (typeof QUOTE_LANGUAGES)[number];

export interface Quote {
  text: string;
  author: string;
  lang: QuoteLanguage;
  /** The one thing a quote is about; it stays away for a while after it is shown. */
  theme: QuoteTheme;
  /** Finer topics, in English, lower case and hyphenated; the next quote shares none when one fits. */
  tags: readonly string[];
}

/** A quote as the bundled lists hold it: each list is in one language. */
type QuoteEntry = Omit<Quote, 'lang'>;

/** The quotation marks each language sets a quote in. */
export const QUOTE_MARKS: Readonly<Record<QuoteLanguage, readonly [string, string]>> = {
  en: ['“', '”'],
  fr: ['« ', ' »'],
  vi: ['“', '”'],
};

/**
 * Every bundled quote, in English, French and Vietnamese. The lists are a chunk of their own, read only when a new
 * quote is due, so most new tabs never load them; read once per page.
 *
 * - en.json: classical texts in their public-domain translations (Legge, Long, Gummere, Ross, Jowett, Müller, Burnet,
 *   Florio, Elwes) and writers whose work entered the public domain long ago, popular misattributions left out.
 * - en-collected.json: picked from JamesFT/Database-Quotes-JSON, with known misattributions, fragments and filler
 *   taken out.
 * - fr.json: French writers in the public domain and French proverbs, in the original French.
 * - vi.json: Vietnamese proverbs (tục ngữ), folk verse (ca dao) and classical Vietnamese writers.
 */
export function loadQuotes(): Promise<readonly Quote[]> {
  // A failed read is not kept: the next new quote tries again.
  return (loaded ??= readLists().catch((error: unknown) => {
    loaded = undefined;
    throw error;
  }));
}

let loaded: Promise<readonly Quote[]> | undefined;

async function readLists(): Promise<Quote[]> {
  const [en, enCollected, fr, vi] = await Promise.all([
    import('./quotes/en.json'),
    import('./quotes/en-collected.json'),
    import('./quotes/fr.json'),
    import('./quotes/vi.json'),
  ]);
  const inLanguage = (lang: QuoteLanguage, entries: readonly object[]): Quote[] =>
    (entries as QuoteEntry[]).map((entry) => ({ ...entry, lang }));
  return [
    ...inLanguage('en', en.default),
    ...inLanguage('en', enCollected.default),
    ...inLanguage('fr', fr.default),
    ...inLanguage('vi', vi.default),
  ];
}

/** The share of new quotes in the preferred language; the rest are in the others. */
export const PREFERRED_SHARE = 0.7;

/** The quote language the browser asks for first (navigator.languages), English when it asks for none of them. */
export function preferredQuoteLanguage(
  locales: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): QuoteLanguage {
  for (const locale of locales) {
    const lang = QUOTE_LANGUAGES.find((candidate) => locale.toLowerCase().split('-')[0] === candidate);
    if (lang) {
      return lang;
    }
  }
  return 'en';
}

/** A short, stable id for a quote (FNV-1a of its language and text), so the shown ones fit in localStorage. */
export function quoteId(quote: Pick<Quote, 'lang' | 'text'>): string {
  let hash = 0x811c9dc5;
  for (const char of `${quote.lang}:${quote.text}`) {
    hash = Math.imul(hash ^ char.codePointAt(0)!, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Quotes shown before a theme comes back, when the candidates allow. */
export const THEME_GAP = 7;

/** How much of the change from the previous quotes a candidate keeps, from all of it to only another theme. */
type Rule = 'tags' | 'author' | 'theme';

/**
 * Whether `quote` can follow `recent` (the quotes shown before it, latest last): its theme is not among the last `gap`;
 * unless the rule is 'theme', its author is not the previous quote's; and under 'tags', it shares no tag with it.
 */
function fits(quote: Quote, recent: readonly Quote[], gap: number, rule: Rule): boolean {
  const previous = recent.at(-1);
  return (
    !recent.slice(recent.length - gap).some((shown) => shown.theme === quote.theme) &&
    (rule === 'theme' || quote.author !== previous?.author) &&
    (rule !== 'tags' || !quote.tags.some((tag) => previous?.tags.includes(tag)))
  );
}

/**
 * A random quote of `candidates` that keeps the change from `recent` visible: of the candidates that meet the
 * strictest rule some of them meet, any one, at random. The rules give up the shared tag, then the theme's distance a
 * quote at a time, then the author; a theme other than the previous quote's goes last. Null with no candidates.
 *
 * With a `preferred` language, the pick is first narrowed to that language PREFERRED_SHARE of the time and to the
 * others the rest of the time, unless no candidate is left in the side drawn.
 */
export function pickQuote(
  candidates: readonly Quote[],
  recent: readonly Quote[],
  random: () => number = Math.random,
  preferred?: QuoteLanguage,
): Quote | null {
  if (preferred) {
    const inPreferred = random() < PREFERRED_SHARE;
    const side = candidates.filter((quote) => (quote.lang === preferred) === inPreferred);
    candidates = side.length > 0 ? side : candidates;
  }
  const any = (quotes: readonly Quote[]) => quotes[Math.floor(random() * quotes.length)];
  const rules: [number, Rule][] = [];
  for (let gap = THEME_GAP; gap > 0; gap--) {
    rules.push([gap, 'tags'], [gap, 'author']);
  }
  rules.push([1, 'theme']);
  for (const [gap, rule] of rules) {
    const fitting = candidates.filter((quote) => fits(quote, recent, gap, rule));
    if (fitting.length > 0) {
      return any(fitting);
    }
  }
  return candidates.length > 0 ? any(candidates) : null;
}
