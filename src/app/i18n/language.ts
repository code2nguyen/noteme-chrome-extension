/** The languages Noteme speaks: its interface, the c2 components and the quotes. */
export const LANGUAGES = ['en', 'fr', 'vi'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Auto follows the browser; the others are a choice made in Settings. */
export type LanguageSetting = 'auto' | Language;

/** Each language named in itself, as a person looking for theirs reads it. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', fr: 'Français', vi: 'Tiếng Việt' };

function browserLanguages(): readonly string[] {
  return typeof navigator === 'undefined' ? [] : navigator.languages;
}

/** The language for a setting: the one chosen, or on Auto the first browser language Noteme speaks, else English. */
export function resolveLanguage(setting: LanguageSetting, browser: readonly string[] = browserLanguages()): Language {
  if (setting !== 'auto') {
    return setting;
  }
  for (const tag of browser) {
    const language = LANGUAGES.find((candidate) => tag.toLowerCase().split('-')[0] === candidate);
    if (language) {
      return language;
    }
  }
  return 'en';
}

/**
 * The BCP 47 tag for dates, numbers and `<html lang>`: the browser's own tag when it is in that language, so an en-GB
 * browser keeps its day-month order in English, else the bare language.
 */
export function localeTag(language: Language, browser: readonly string[] = browserLanguages()): string {
  return browser.find((tag) => tag.toLowerCase().split('-')[0] === language) ?? language;
}
