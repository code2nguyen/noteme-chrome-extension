/**
 * Background photos: the themes a person can pick, where each theme's photos come from, and when the photo changes.
 * Pure functions, unit-tested against recorded answers; BackgroundService does the fetching and the caching.
 *
 * Photos come from Wikimedia Commons' featured pictures (free licences, large originals, no API key, CORS-enabled):
 * a search inside that one category with a few words per theme. The themes are data, so adding or tuning one is a
 * line here.
 */

export type PhotoTheme =
  'nature' | 'mountains' | 'sea' | 'animals' | 'birds' | 'flowers' | 'space' | 'cities' | 'architecture' | 'noteme';

/** When the photo changes. A new photo on every tab was too busy for a page opened dozens of times a day. */
export type PhotoChange = 'hour' | 'day';

export interface PhotoThemeInfo {
  id: PhotoTheme;
  label: string;
  /** Words searched among the featured pictures; absent for the photos bundled with Noteme. */
  search?: string;
}

export const PHOTO_THEMES: readonly PhotoThemeInfo[] = [
  { id: 'nature', label: 'Nature', search: 'landscape OR forest OR lake OR valley' },
  { id: 'mountains', label: 'Mountains', search: 'mountain OR alps OR glacier OR summit' },
  { id: 'sea', label: 'Sea and coast', search: 'sea OR beach OR coast OR ocean' },
  { id: 'animals', label: 'Animals', search: 'animal OR mammal OR wildlife' },
  { id: 'birds', label: 'Birds', search: 'bird' },
  { id: 'flowers', label: 'Flowers', search: 'flower OR blossom' },
  { id: 'space', label: 'Night sky and space', search: 'astronomy OR galaxy OR nebula OR "night sky" OR "milky way"' },
  { id: 'cities', label: 'Cities', search: 'city OR skyline OR cityscape OR street' },
  { id: 'architecture', label: 'Architecture', search: 'architecture OR cathedral OR castle OR bridge OR interior' },
  { id: 'noteme', label: 'Noteme photos (offline)' },
];

export const PHOTO_THEME_IDS = PHOTO_THEMES.map((theme) => theme.id);

export interface BackgroundPhoto {
  /** Stable id: the Commons file title, or the bundled file name. */
  id: string;
  /** Where the image is downloaded from (Commons) or read from (bundled, an extension path). */
  url: string;
  credit: string;
  link?: string;
  theme: PhotoTheme;
  /** A photo shipped with Noteme: always there, never downloaded or cached. */
  bundled?: boolean;
}

export const BUNDLED_PHOTO_COUNT = 12;
const WIDTH = 1920;
const MIN_WIDTH = 1600;

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayOfYear(date: Date): number {
  return Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000,
  );
}

export function bundledPhoto(index: number): BackgroundPhoto {
  const n = ((index % BUNDLED_PHOTO_COUNT) + BUNDLED_PHOTO_COUNT) % BUNDLED_PHOTO_COUNT;
  return {
    id: `noteme-${n}`,
    url: `assets/bg/bg-${n}-small.jpg`,
    credit: 'Photo from Noteme',
    theme: 'noteme',
    bundled: true,
  };
}

/** Whether the photo shown since `shownAt` is due for a change. */
export function isDue(shownAt: number, change: PhotoChange, now = Date.now()): boolean {
  switch (change) {
    case 'hour':
      return now - shownAt >= 3_600_000;
    case 'day':
      return localDay(new Date(shownAt)) !== localDay(new Date(now));
  }
}

/** A page of featured pictures matching a theme, with a 1920px thumbnail of each and its author and licence. */
export function commonsSearchUrl(theme: PhotoTheme, offset: number, limit = 20): string {
  const search = PHOTO_THEMES.find((info) => info.id === theme)?.search ?? '';
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `incategory:Featured_pictures_on_Wikimedia_Commons ${search}`,
    gsrlimit: String(limit),
    gsroffset: String(offset),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: String(WIDTH),
  });
  return `https://commons.wikimedia.org/w/api.php?${params}`;
}

interface CommonsPage {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
  }[];
}

/** The author line of a Commons file, from the HTML Commons stores it as. */
export function plainText(html: string | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The landscape-format photos of a search answer, large enough to fill a screen. */
export function parseCommonsSearch(json: unknown, theme: PhotoTheme): BackgroundPhoto[] {
  const pages = ((json as { query?: { pages?: CommonsPage[] | Record<string, CommonsPage> } } | null)?.query?.pages ??
    []) as CommonsPage[] | Record<string, CommonsPage>;
  const list = Array.isArray(pages) ? pages : Object.values(pages);
  return list.flatMap((page): BackgroundPhoto[] => {
    const info = page.imageinfo?.[0];
    if (!page.title || !info?.thumburl || !info.width || !info.height) {
      return [];
    }
    const photo = /^image\/(jpeg|png|webp)$/.test(info.mime ?? '');
    if (!photo || info.width < MIN_WIDTH || info.width < info.height * 1.2) {
      return [];
    }
    const artist = plainText(info.extmetadata?.Artist?.value);
    const licence = plainText(info.extmetadata?.LicenseShortName?.value);
    return [
      {
        id: page.title,
        url: info.thumburl,
        credit: [artist ? `Photo by ${artist}` : 'Wikimedia Commons', licence].filter(Boolean).join(' · '),
        link: info.descriptionurl,
        theme,
      },
    ];
  });
}
