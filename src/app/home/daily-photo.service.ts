import { Injectable } from '@angular/core';
import { PhotoSource } from '../settings/settings';
import {
  apodUrl,
  bundledPhoto,
  DailyPhoto,
  localDay,
  parseApod,
  parseWikimediaFeed,
  wikimediaFeedUrl,
} from './daily-photo';

const CACHE_KEY = 'noteme-photo';
const TIMEOUT_MS = 6000;

interface CachedPhoto extends DailyPhoto {
  /** How many times "Change now" was pressed today; picks another day's photo. */
  offset: number;
}

/** One photo per day per source, cached so every new tab opens instantly; any failure falls back to a bundled photo. */
@Injectable({ providedIn: 'root' })
export class DailyPhotoService {
  /** The photo to show right now, before any network: today's cached one, else a bundled one. */
  immediate(source: PhotoSource, now = new Date()): DailyPhoto | null {
    if (source === 'none') {
      return null;
    }
    const cached = this.cached();
    return cached && cached.source === source && cached.day === localDay(now) ? cached : bundledPhoto(now);
  }

  /** Today's photo for a source; `next` asks for a different one (another day's). */
  async load(source: PhotoSource, next = false, now = new Date()): Promise<DailyPhoto | null> {
    if (source === 'none') {
      return null;
    }
    const cached = this.cached();
    const fresh = cached && cached.source === source && cached.day === localDay(now);
    if (fresh && !next) {
      return cached;
    }
    const offset = fresh && next ? cached.offset + 1 : next ? 1 : 0;
    const photo = (await this.fetchPhoto(source, now, offset)) ?? bundledPhoto(now, offset);
    const result = { ...photo, day: localDay(now) };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...result, source, offset }));
    return result;
  }

  private async fetchPhoto(source: PhotoSource, now: Date, offset: number): Promise<DailyPhoto | null> {
    if (source === 'noteme') {
      return bundledPhoto(now, offset);
    }
    // "Change now" walks back one day per press: the archive of both sources goes back years.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    try {
      const response = await fetch(source === 'nasa' ? apodUrl(day) : wikimediaFeedUrl(day), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const json: unknown = await response.json();
      const photo = source === 'nasa' ? parseApod(json, day) : parseWikimediaFeed(json, day);
      return photo && (await this.preload(photo.url)) ? photo : null;
    } catch {
      return null;
    }
  }

  /** Only switch to a photo once it has loaded, so the page never flashes an empty background. */
  private preload(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  private cached(): CachedPhoto | null {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
