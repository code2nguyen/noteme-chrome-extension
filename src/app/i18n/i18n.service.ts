import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { SettingsService } from '../settings/settings.service';
import { loadComponentTranslations } from './components';
import { Language, localeTag, resolveLanguage } from './language';
import { hasCatalog, loadCatalog, message, MessageArgs, MessageKey } from './messages';

/**
 * Read what a language needs before it is spoken: Noteme's own messages and the c2 components'. Nothing for English,
 * which both ship with. main.ts awaits the language of the settings before the app starts, so the first paint is
 * already in it.
 */
export async function loadLanguage(language: Language): Promise<void> {
  if (language !== 'en') {
    await Promise.all([loadCatalog(language), loadComponentTranslations()]);
  }
}

/**
 * Noteme's language, from Settings (Auto follows the browser), and its text in it. `t` reads the language signal, so a
 * template calling `t('home.search')` redraws when the language changes, with no reload.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly settings = inject(SettingsService).settings;
  private readonly wanted = computed(() => resolveLanguage(this.settings().language));
  /** The language spoken: the one wanted once its messages are read, the previous one until then. */
  private readonly spoken = signal<Language>(hasCatalog(this.wanted()) ? this.wanted() : 'en');

  readonly language = this.spoken.asReadonly();
  /** For dates and numbers (Intl) and `<html lang>`, which the c2 components follow. */
  readonly locale = computed(() => localeTag(this.language()));

  constructor() {
    // The page's language: the c2 components and the relative times follow it, with no reload. The one spoken, not
    // the one wanted: while a language is being read, or if it cannot be, the page stays whole in the previous one.
    effect(() => {
      document.documentElement.lang = this.locale();
    });
    effect(() => {
      const language = this.wanted();
      loadLanguage(language).then(
        // Unless another language was picked meanwhile.
        () => this.wanted() === language && this.spoken.set(language),
        (error: unknown) => console.error('Could not read the language', error),
      );
    });
  }

  readonly t = <K extends MessageKey>(key: K, ...args: MessageArgs<K>): string =>
    message(this.language(), key, ...args);
}
