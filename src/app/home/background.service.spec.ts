import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundPhoto, bundledPhoto, BUNDLED_PHOTO_COUNT, PhotoTheme } from './background';
import { BackgroundOptions, BackgroundService } from './background.service';

const STATE_KEY = 'noteme-background';

interface StoredState {
  current: BackgroundPhoto | null;
  shownAt: number;
  queue: BackgroundPhoto[];
  themes: string;
  seen: string[];
}

const options = (...themes: PhotoTheme[]): BackgroundOptions => ({ themes, change: 'day' });

function commonsPhoto(theme: PhotoTheme, n: number): BackgroundPhoto {
  const title = `File:${theme} ${n}.jpg`;
  return { id: title, url: `https://upload.test/${theme}-${n}.jpg`, credit: 'Photo by A · CC0', link: 'x', theme };
}

/** A Commons search answer of four fresh photos of the theme searched for. */
function searchAnswer(url: URL, round: number): Response {
  const search = url.searchParams.get('gsrsearch') ?? '';
  const theme = (['nature', 'sea'] as const).find((id) => search.includes(id === 'nature' ? 'forest' : 'beach'))!;
  const pages = [0, 1, 2, 3].map((i) => {
    const photo = commonsPhoto(theme, round * 10 + i);
    return {
      title: photo.id,
      imageinfo: [{ thumburl: photo.url, width: 1920, height: 1080, mime: 'image/jpeg', descriptionurl: 'x' }],
    };
  });
  return Response.json({ query: { pages } });
}

let storage: Map<string, string>;
let cache: Map<string, Response>;
/** Lets a test hold Commons or the cache back, to interleave calls the way two tabs or two settings changes do. */
let beforeSearch: () => Promise<void>;
let beforeImage: (url: string) => Promise<void>;
let beforeMatch: () => Promise<void>;

const stored = (): StoredState => JSON.parse(storage.get(STATE_KEY) ?? 'null');
const store = (state: Partial<StoredState>) =>
  storage.set(STATE_KEY, JSON.stringify({ current: null, shownAt: 0, queue: [], themes: '', seen: [], ...state }));

beforeEach(() => {
  storage = new Map();
  cache = new Map();
  beforeSearch = beforeImage = beforeMatch = async () => undefined;
  let round = 0;
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (url: string) => (await beforeMatch(), cache.get(url)?.clone()),
      put: async (url: string, response: Response) => void cache.set(url, response),
      keys: async () => [...cache.keys()].map((url) => ({ url })),
      delete: async (request: { url: string }) => cache.delete(request.url),
    }),
  });
  vi.stubGlobal('fetch', async (input: string) => {
    const url = new URL(input);
    if (url.hostname === 'commons.wikimedia.org') {
      await beforeSearch();
      return searchAnswer(url, round++);
    }
    await beforeImage(input);
    return new Response(new Blob(['jpeg']), { headers: { 'content-type': 'image/jpeg' } });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('BackgroundService', () => {
  it('does not queue a photo another tab queued while this one was downloading it', async () => {
    store({ themes: 'nature' });
    // The other tab queues the very photo this one is downloading first.
    beforeImage = async (url) => {
      const state = stored();
      const same = [0, 1, 2, 3].map((i) => commonsPhoto('nature', i)).find((photo) => photo.url === url);
      if (same && state.queue.length === 0) {
        store({ ...state, queue: [same] });
      }
    };
    await new BackgroundService().refill(options('nature'));
    const ids = stored().queue.map((photo) => photo.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('falls back to a bundled photo not seen recently, and remembers it', async () => {
    const service = new BackgroundService();
    const order = [...Array(BUNDLED_PHOTO_COUNT).keys()].filter((n) => n !== 5).map((n) => bundledPhoto(n).id);
    store({ themes: 'nature', seen: order });

    expect((await service.next(options('nature')))!.id).toBe('noteme-5');
    expect(stored().seen.at(-1)).toBe('noteme-5');
    // Every one seen now: the one seen longest ago comes back first.
    expect((await service.next(options('nature')))!.id).toBe(order[0]);
  });

  it('a slow lookup for earlier settings does not overwrite the state chosen for newer ones', async () => {
    const service = new BackgroundService();
    // Nothing on screen yet: the earlier call takes the queued photo, then writes the state for its themes.
    const shown = commonsPhoto('nature', 0);
    cache.set(shown.url, new Response('jpeg'));
    store({ themes: 'nature', queue: [shown] });
    const lookup = deferred();
    const matching = deferred();
    beforeMatch = () => (matching.resolve(), lookup.promise);

    // The newer call starts while the earlier one is held in its cache lookup.
    const before = service.current(options('nature'));
    await matching.promise;
    const after = service.current(options('sea'));
    lookup.resolve();

    expect((await before)!.id).toBe(shown.id);
    expect((await after)!.bundled).toBe(true);
    expect(stored().themes).toBe('sea');
    expect(stored().current!.bundled).toBe(true);
  });

  it('"Change now" after the themes changed starts a queue for the new themes', async () => {
    const service = new BackgroundService();
    const queued = commonsPhoto('nature', 0);
    cache.set(queued.url, new Response('jpeg'));
    store({ themes: 'nature', queue: [queued] });

    expect((await service.next(options('sea')))!.bundled).toBe(true);
    expect(stored().themes).toBe('sea');
    await service.refill(options('sea'));
    expect(stored().queue.map((photo) => photo.theme)).toEqual(['sea', 'sea', 'sea']);
  });

  it('a refill for new themes is not swallowed by one still running for the old ones', async () => {
    const service = new BackgroundService();
    store({ themes: 'nature' });
    const search = deferred();
    beforeSearch = () => search.promise;

    const old = service.refill(options('nature'));
    await service.next(options('sea'));
    const fresh = service.refill(options('sea'));
    expect(fresh).not.toBe(old);
    expect(service.refill(options('sea'))).toBe(fresh);
    beforeSearch = async () => undefined;
    search.resolve();

    await fresh;
    expect(stored().queue.map((photo) => photo.theme)).toEqual(['sea', 'sea', 'sea']);
  });
});
