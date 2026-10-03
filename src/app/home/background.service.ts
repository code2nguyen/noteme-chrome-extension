import { Injectable } from '@angular/core';
import {
  BackgroundPhoto,
  bundledPhoto,
  BUNDLED_PHOTO_COUNT,
  commonsSearchUrl,
  isDue,
  parseCommonsSearch,
  PhotoChange,
  PhotoTheme,
} from './background';

const STATE_KEY = 'noteme-background';
const CACHE_NAME = 'noteme-backgrounds-v1';
/** Photos kept ready ahead of the one on screen. */
const QUEUE_SIZE = 3;
const SEEN_MAX = 300;
const TIMEOUT_MS = 10_000;
/** How deep into a theme's search results a random page may start: Commons has hundreds of featured pictures each. */
const MAX_OFFSET = 300;

export interface ShownPhoto extends BackgroundPhoto {
  /** What the <img> shows: an object URL of the cached image, or the bundled file's path. */
  src: string;
}

export interface BackgroundOptions {
  themes: readonly PhotoTheme[];
  change: PhotoChange;
}

interface State {
  current: BackgroundPhoto | null;
  shownAt: number;
  /** Downloaded and cached, in the order they will show. */
  queue: BackgroundPhoto[];
  /** The themes the queue was filled for. */
  themes: string;
  /** Recently shown or queued ids, so the same photo does not come back soon. */
  seen: string[];
}

const EMPTY: State = { current: null, shownAt: 0, queue: [], themes: '', seen: [] };

/**
 * The background photo. A few photos are always downloaded ahead and kept in Cache Storage, so a new tab shows the
 * next one from disk at once and never waits on the network; the queue is refilled in the background, after the page
 * is up. Anything that fails (offline, a blocked host) falls back to the photos bundled with Noteme.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private objectUrl: string | null = null;
  private refilling: Promise<void> | null = null;

  /** The photo to show now: the current one while it is not due, else the next one ready in the queue. */
  async current(options: BackgroundOptions, now = Date.now()): Promise<ShownPhoto | null> {
    if (options.themes.length === 0) {
      return null;
    }
    const state = this.readState();
    const key = themesKey(options.themes);
    const themesChanged = state.themes !== key;
    if (themesChanged) {
      state.queue = [];
      state.themes = key;
    }
    const keep =
      state.current &&
      !themesChanged &&
      options.themes.includes(state.current.theme) &&
      !isDue(state.shownAt, options.change, now);
    if (keep) {
      const shown = await this.show(state.current!);
      if (shown) {
        this.writeState(state);
        return shown;
      }
    }
    return this.advance(state, options, now);
  }

  /** "Change now": the next photo in the queue. */
  async next(options: BackgroundOptions, now = Date.now()): Promise<ShownPhoto | null> {
    if (options.themes.length === 0) {
      return null;
    }
    return this.advance(this.readState(), options, now);
  }

  /** Download photos until the queue is full again; safe to call often (one refill runs at a time). */
  refill(options: BackgroundOptions): Promise<void> {
    this.refilling ??= this.fill(options).finally(() => (this.refilling = null));
    return this.refilling;
  }

  private async advance(state: State, options: BackgroundOptions, now: number): Promise<ShownPhoto | null> {
    while (state.queue.length > 0) {
      const candidate = state.queue.shift()!;
      if (!options.themes.includes(candidate.theme)) {
        continue;
      }
      const shown = await this.show(candidate);
      if (shown) {
        this.setCurrent(state, candidate, now);
        return shown;
      }
    }
    // Nothing ready yet (first run, offline, new themes): a bundled photo, never the same as the one on screen.
    const photo = this.pickBundled(state);
    this.setCurrent(state, photo, now);
    return this.show(photo);
  }

  private setCurrent(state: State, photo: BackgroundPhoto, now: number): void {
    state.current = photo;
    state.shownAt = now;
    this.writeState(state);
  }

  private async fill(options: BackgroundOptions): Promise<void> {
    const key = themesKey(options.themes);
    let attempts = 0;
    while (attempts++ < QUEUE_SIZE * 3) {
      const state = this.readState();
      if (state.themes !== key || state.queue.length >= QUEUE_SIZE) {
        break;
      }
      const theme = options.themes[Math.floor(Math.random() * options.themes.length)];
      const photo = theme === 'noteme' ? this.pickBundled(state) : await this.download(theme, state);
      if (!photo) {
        continue;
      }
      // Read again: another tab may have changed the queue while this one was downloading.
      const latest = this.readState();
      if (latest.themes !== key) {
        break;
      }
      latest.queue.push(photo);
      latest.seen = [...latest.seen.filter((id) => id !== photo.id), photo.id].slice(-SEEN_MAX);
      this.writeState(latest);
    }
    await this.prune();
  }

  /** One unseen photo of a theme, downloaded into the cache. */
  private async download(theme: PhotoTheme, state: State): Promise<BackgroundPhoto | null> {
    try {
      const offset = Math.floor(Math.random() * MAX_OFFSET);
      const answer = await fetch(commonsSearchUrl(theme, offset), { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!answer.ok) {
        return null;
      }
      const found = parseCommonsSearch(await answer.json(), theme);
      const busy = new Set([...state.queue.map((photo) => photo.id), state.current?.id]);
      const free = found.filter((photo) => !busy.has(photo.id));
      // Prefer a photo not seen recently; when a theme has run out of those, one seen a while ago will do.
      const unseen = free.filter((photo) => !state.seen.includes(photo.id));
      const candidates = unseen.length > 0 ? unseen : free;
      const photo = candidates[Math.floor(Math.random() * candidates.length)];
      if (!photo) {
        return null;
      }
      const image = await fetch(photo.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!image.ok || !(image.headers.get('content-type') ?? '').startsWith('image/')) {
        return null;
      }
      await (await caches.open(CACHE_NAME)).put(photo.url, image);
      return photo;
    } catch {
      return null;
    }
  }

  /** The image of a photo, ready for an <img>: a bundled path, or an object URL of the cached download. */
  private async show(photo: BackgroundPhoto): Promise<ShownPhoto | null> {
    if (photo.bundled) {
      return { ...photo, src: photo.url };
    }
    try {
      const cached = await (await caches.open(CACHE_NAME)).match(photo.url);
      if (!cached) {
        return null;
      }
      const src = URL.createObjectURL(await cached.blob());
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
      }
      this.objectUrl = src;
      return { ...photo, src };
    } catch {
      return null;
    }
  }

  /** Keep only the images of the current photo and the queue. */
  private async prune(): Promise<void> {
    try {
      const state = this.readState();
      const keep = new Set([state.current?.url, ...state.queue.map((photo) => photo.url)]);
      const cache = await caches.open(CACHE_NAME);
      for (const request of await cache.keys()) {
        if (!keep.has(request.url)) {
          await cache.delete(request);
        }
      }
    } catch {
      // Cache Storage unavailable: nothing was stored either.
    }
  }

  private pickBundled(state: State): BackgroundPhoto {
    const taken = new Set([state.current?.id, ...state.queue.map((photo) => photo.id)]);
    const start = Math.floor(Math.random() * BUNDLED_PHOTO_COUNT);
    for (let i = 0; i < BUNDLED_PHOTO_COUNT; i++) {
      const photo = bundledPhoto(start + i);
      if (!taken.has(photo.id)) {
        return photo;
      }
    }
    return bundledPhoto(start);
  }

  private readState(): State {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') };
    } catch {
      return { ...EMPTY };
    }
  }

  private writeState(state: State): void {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }
}

function themesKey(themes: readonly PhotoTheme[]): string {
  return [...themes].sort().join(',');
}
