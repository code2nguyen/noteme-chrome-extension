/**
 * Photo of the day: where it comes from and how each source's answer is read. Pure functions, so they are unit-tested
 * against recorded responses.
 */
import { PhotoSource } from '../settings/settings';

export interface DailyPhoto {
  url: string;
  credit: string;
  link?: string;
  source: PhotoSource;
  /** Local calendar day the photo belongs to, YYYY-MM-DD. */
  day: string;
}

export const BUNDLED_PHOTO_COUNT = 12;
const WIDTH = 1920;

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayOfYear(date: Date): number {
  return Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000,
  );
}

/** The photos that ship with Noteme: always available, offline too. */
export function bundledPhoto(date: Date, offset = 0): DailyPhoto {
  const index = (dayOfYear(date) + offset) % BUNDLED_PHOTO_COUNT;
  return { url: `assets/bg/bg-${index}-small.jpg`, credit: 'Photo from Noteme', source: 'noteme', day: localDay(date) };
}

/** Wikipedia's featured-content feed for a day (api.wikimedia.org, no key, CORS-enabled). */
export function wikimediaFeedUrl(date: Date): string {
  const [year, month, day] = localDay(date).split('-');
  return `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`;
}

/** A Commons thumbnail URL resized to the width a new tab needs, instead of the original (often 20+ MB). */
export function resizeCommonsThumbnail(url: string, width = WIDTH): string {
  return /\/thumb\//.test(url) ? url.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`) : url;
}

interface WikimediaFeed {
  image?: {
    title?: string;
    thumbnail?: { source?: string; width?: number; height?: number };
    image?: { source?: string; width?: number; height?: number };
    file_page?: string;
    artist?: { text?: string };
  };
}

export function parseWikimediaFeed(json: unknown, date: Date): DailyPhoto | null {
  const image = (json as WikimediaFeed | null)?.image;
  const original = image?.image;
  const thumbnail = image?.thumbnail?.source;
  if (!original?.source && !thumbnail) {
    return null;
  }
  // A small original is used as is; anything larger goes through a resized thumbnail.
  const url =
    thumbnail && (original?.width ?? Infinity) > WIDTH
      ? resizeCommonsThumbnail(thumbnail)
      : (original?.source ?? thumbnail!);
  const artist = image?.artist?.text?.trim();
  return {
    url,
    credit: artist ? `Photo by ${artist} · Wikimedia Commons` : 'Wikimedia Commons',
    link: image?.file_page,
    source: 'wikimedia',
    day: localDay(date),
  };
}

/** NASA's Astronomy Picture of the Day. DEMO_KEY is rate-limited (per IP), which suits one request a day. */
export function apodUrl(date: Date): string {
  return `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${localDay(date)}`;
}

interface Apod {
  media_type?: string;
  url?: string;
  hdurl?: string;
  title?: string;
  copyright?: string;
}

export function parseApod(json: unknown, date: Date): DailyPhoto | null {
  const apod = json as Apod | null;
  // Some days are a video; those fall back to another photo.
  if (!apod || apod.media_type !== 'image' || !(apod.hdurl || apod.url)) {
    return null;
  }
  const who = apod.copyright?.replace(/\s+/g, ' ').trim();
  return {
    url: (apod.hdurl || apod.url)!,
    credit: `${apod.title ?? 'Astronomy Picture of the Day'} · ${who ? `© ${who} · ` : ''}NASA APOD`,
    link: `https://apod.nasa.gov/apod/ap${localDay(date).slice(2).replace(/-/g, '')}.html`,
    source: 'nasa',
    day: localDay(date),
  };
}
