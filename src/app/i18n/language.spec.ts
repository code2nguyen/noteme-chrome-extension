import { describe, expect, it } from 'vitest';

import { localeTag, resolveLanguage } from './language';
import { CATALOGS } from './messages';

describe('resolveLanguage', () => {
  it('keeps a chosen language, whatever the browser says', () => {
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
    expect(resolveLanguage('vi', [])).toBe('vi');
  });

  it('on Auto, takes the first browser language Noteme speaks, else English', () => {
    expect(resolveLanguage('auto', ['de-DE', 'fr-CA', 'en'])).toBe('fr');
    expect(resolveLanguage('auto', ['vi-VN'])).toBe('vi');
    expect(resolveLanguage('auto', ['de', 'ja'])).toBe('en');
    expect(resolveLanguage('auto', [])).toBe('en');
  });
});

describe('localeTag', () => {
  it("keeps the browser's region for its own language, the bare language otherwise", () => {
    expect(localeTag('en', ['en-GB', 'fr-FR'])).toBe('en-GB');
    expect(localeTag('fr', ['en-GB', 'fr-FR'])).toBe('fr-FR');
    expect(localeTag('vi', ['en-GB'])).toBe('vi');
  });
});

describe('catalogs', () => {
  it('have the same keys in every language, with no empty message', () => {
    const keys = Object.keys(CATALOGS.en).sort();
    for (const catalog of Object.values(CATALOGS)) {
      expect(Object.keys(catalog).sort()).toEqual(keys);
      for (const message of Object.values(catalog)) {
        expect(typeof message === 'function' || (message as string).trim().length > 0).toBe(true);
      }
    }
  });
});
