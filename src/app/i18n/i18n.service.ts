import { computed, inject, Injectable } from '@angular/core';

import { SettingsService } from '../settings/settings.service';
import { localeTag, resolveLanguage } from './language';
import { CATALOGS, MessageArgs, MessageKey } from './messages';

/**
 * Noteme's language, from Settings (Auto follows the browser), and its text in it. `t` reads the language signal, so a
 * template calling `t('home.search')` redraws when the language changes, with no reload.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly settings = inject(SettingsService).settings;

  readonly language = computed(() => resolveLanguage(this.settings().language));
  /** For dates and numbers (Intl) and `<html lang>`, which the c2 components follow. */
  readonly locale = computed(() => localeTag(this.language()));

  readonly t = <K extends MessageKey>(key: K, ...args: MessageArgs<K>): string => {
    const message = CATALOGS[this.language()][key] as string | ((...values: unknown[]) => string);
    return typeof message === 'function' ? message(...args) : message;
  };
}
