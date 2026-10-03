import { describe, expect, it } from 'vitest';
import commonsSearch from '../../../e2e/fixtures/commons-search.json';
import {
  bundledPhoto,
  BUNDLED_PHOTO_COUNT,
  commonsSearchUrl,
  dayOfYear,
  isDue,
  localDay,
  parseCommonsSearch,
  PHOTO_THEMES,
  plainText,
} from './background';

describe('days', () => {
  it('uses the local calendar day', () => {
    expect(localDay(new Date(2026, 9, 3, 23, 30))).toBe('2026-10-03');
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });
});

describe('isDue', () => {
  const shown = new Date(2026, 9, 3, 9, 15).getTime();

  it('changes on every tab, every hour or every day', () => {
    expect(isDue(shown, 'tab', shown)).toBe(true);
    expect(isDue(shown, 'hour', shown + 59 * 60_000)).toBe(false);
    expect(isDue(shown, 'hour', shown + 60 * 60_000)).toBe(true);
    expect(isDue(shown, 'day', new Date(2026, 9, 3, 23, 59).getTime())).toBe(false);
    expect(isDue(shown, 'day', new Date(2026, 9, 4, 0, 1).getTime())).toBe(true);
  });
});

describe('Commons', () => {
  it('searches the featured pictures for the words of a theme, asking for 1920px thumbnails', () => {
    const url = new URL(commonsSearchUrl('mountains', 40));
    expect(url.origin + url.pathname).toBe('https://commons.wikimedia.org/w/api.php');
    expect(url.searchParams.get('gsrsearch')).toBe(
      'incategory:Featured_pictures_on_Wikimedia_Commons mountain OR alps OR glacier OR summit',
    );
    expect(url.searchParams.get('gsroffset')).toBe('40');
    expect(url.searchParams.get('iiurlwidth')).toBe('1920');
    expect(url.searchParams.get('origin')).toBe('*');
  });

  it('every theme but the bundled one has search words', () => {
    for (const theme of PHOTO_THEMES) {
      expect(!!theme.search, theme.id).toBe(theme.id !== 'noteme');
    }
  });

  it('keeps large landscape photos, with their author and licence', () => {
    const photos = parseCommonsSearch(commonsSearch, 'nature');
    expect(photos.map((photo) => photo.id)).toEqual([
      'File:Lake Bled at dawn.jpg',
      'File:Matterhorn from Zermatt.jpg',
      'File:Coast at Étretat.jpg',
      'File:Pine forest in fog.jpg',
    ]);
    expect(photos[0]).toEqual({
      id: 'File:Lake Bled at dawn.jpg',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake_Bled_at_dawn.jpg/1920px-Lake_Bled_at_dawn.jpg',
      credit: 'Photo by Jane Doe · CC BY-SA 4.0',
      link: 'https://commons.wikimedia.org/wiki/File:Lake_Bled_at_dawn.jpg',
      theme: 'nature',
    });
    expect(photos[1].credit).toBe('Photo by Peter & Anna Smith · CC BY 3.0');
    expect(photos[2].credit).toBe('Wikimedia Commons · Public domain');
  });

  it('survives an empty or broken answer, and the legacy keyed pages shape', () => {
    expect(parseCommonsSearch(null, 'nature')).toEqual([]);
    expect(parseCommonsSearch({ batchcomplete: true }, 'nature')).toEqual([]);
    const keyed = { query: { pages: { '1': commonsSearch.query.pages[0] } } };
    expect(parseCommonsSearch(keyed, 'sea')).toHaveLength(1);
  });

  it('reads the author out of Commons HTML', () => {
    expect(plainText('<span>By <a href="x">Ann</a>&nbsp;Lee</span>')).toBe('By Ann Lee');
    expect(plainText(undefined)).toBe('');
  });
});

describe('bundledPhoto', () => {
  it('wraps around the shipped photos', () => {
    expect(bundledPhoto(0).url).toBe('assets/bg/bg-0-small.jpg');
    expect(bundledPhoto(BUNDLED_PHOTO_COUNT + 2).id).toBe('noteme-2');
    expect(bundledPhoto(-1).id).toBe(`noteme-${BUNDLED_PHOTO_COUNT - 1}`);
    expect(bundledPhoto(3)).toMatchObject({ bundled: true, theme: 'noteme' });
  });
});
