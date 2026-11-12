import type { Language } from '../language';
import { commonEn } from './common';
import { settingsEn } from './settings';
import { homeEn } from './home';
import { boardEn } from './board';
import { archiveEn } from './archive';
import { viewsEn } from './views';
import type { Translation } from './types';

/** Every message in English, the source the other languages are typed against. Each area adds its record here. */
export const en = { ...commonEn, ...settingsEn, ...homeEn, ...boardEn, ...archiveEn, ...viewsEn };

export type Catalog = typeof en;
export type MessageKey = keyof Catalog;
/** The values a message takes: none for a string, the function's own for a function. */
export type MessageArgs<K extends MessageKey> = Catalog[K] extends (...args: infer A) => string ? A : [];

/**
 * The languages read so far. English is always there; French and Vietnamese are modules of their own (fr.ts, vi.ts),
 * read by `loadCatalog` when Noteme speaks them, so a new tab in English never loads them. The background worker and
 * the tests take them all at once (all.ts).
 */
const catalogs: Partial<Record<Language, Translation<Catalog>>> = { en };

export function addCatalog(language: Language, catalog: Translation<Catalog>): void {
  catalogs[language] = catalog;
}

export function hasCatalog(language: Language): boolean {
  return !!catalogs[language];
}

const LOADERS: Record<Exclude<Language, 'en'>, () => Promise<Translation<Catalog>>> = {
  fr: () => import('./fr').then((module) => module.fr),
  vi: () => import('./vi').then((module) => module.vi),
};

/** Read a language's messages, once; `message` speaks it from then on. */
export async function loadCatalog(language: Language): Promise<void> {
  if (language !== 'en' && !catalogs[language]) {
    addCatalog(language, await LOADERS[language]());
  }
}

/**
 * A message in a language, with the values it takes: what `I18n.t` says, also for code outside Angular (the worker).
 * In English while that language is not read yet.
 */
export function message<K extends MessageKey>(language: Language, key: K, ...args: MessageArgs<K>): string {
  const text = (catalogs[language] ?? en)[key] as string | ((...values: unknown[]) => string);
  return typeof text === 'function' ? text(...args) : text;
}
