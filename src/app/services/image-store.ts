import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { ItemData } from '../store/models';
import { uuid } from './utils';

/** How a note refers to an image of the store: `![alt](noteme-image:<id>)`. */
export const IMAGE_SCHEME = 'noteme-image:';

/** The largest image a note takes, so one paste cannot fill the device. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * An image no note has referred to for less than this is kept: a paste not saved yet, a line cut to be pasted
 * elsewhere, an undo, a note restored. Counted from when it was last seen referred to (or saved).
 */
export const IMAGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

const DB_NAME = 'noteme-images';
const STORE = 'images';

interface StoredImage {
  id: string;
  blob: Blob;
  /** When it was saved, in ms. */
  created: number;
  /** When a cleanup last found a note referring to it, in ms. */
  seen?: number;
}

/** Why a pasted or dropped image was refused. */
export class ImageRefusedError extends Error {
  constructor(readonly reason: 'type' | 'size') {
    super(reason === 'size' ? 'The image is too large' : 'Not an image');
  }
}

const ID = /noteme-image:([0-9a-f-]{36})/g;

/** The ids of the store's images a note's text refers to. */
export function imageIds(text: string): string[] {
  return [...text.matchAll(ID)].map((match) => match[1]);
}

/** The ids of the store's images the notes refer to. */
export function referencedImages(items: readonly ItemData[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    const text = typeof item.data === 'string' ? item.data : JSON.stringify(item.data ?? '');
    for (const id of imageIds(text)) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * The images pasted or dropped into notes and pages, kept on this device in IndexedDB, out of the notes' text (which
 * only holds `noteme-image:<id>`) and out of Chrome sync: a synced note shows a placeholder on another device.
 * `upload` and `resolve` are handed to every `c2-notepad` and `c2-page-editor` as `imageUpload` and `imageResolver`.
 */
@Injectable({ providedIn: 'root' })
export class ImageStore {
  private db?: Promise<IDBDatabase>;
  /** Object URLs of the images drawn, by id: one each, for as long as the tab is open. */
  private readonly urls = new Map<string, Promise<string>>();

  /** Each image an upload refused or could not save, for the app to say so (the editor takes its block away). */
  readonly failures = new Subject<unknown>();

  readonly upload = async (file: Blob): Promise<string> => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new ImageRefusedError('type');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new ImageRefusedError('size');
      }
      const id = uuid();
      await this.request('readwrite', (store) =>
        store.put({ id, blob: file, created: Date.now() } satisfies StoredImage),
      );
      return IMAGE_SCHEME + id;
    } catch (error) {
      this.failures.next(error);
      throw error;
    }
  };

  /**
   * A URL to draw a note's image from: the store's own as an object URL, an image held in the text as a data URL, or
   * a web image. Anything else (and an image this device does not have) draws the "not available" placeholder.
   */
  readonly resolve = (src: string): string | Promise<string> => {
    if (src.startsWith(IMAGE_SCHEME)) {
      const id = src.slice(IMAGE_SCHEME.length);
      let url = this.urls.get(id);
      if (!url) {
        url = this.request<StoredImage | undefined>('readonly', (store) => store.get(id)).then((image) =>
          image ? URL.createObjectURL(image.blob) : '',
        );
        this.urls.set(id, url);
        // Not found is not remembered: the image may be saved by another tab meanwhile.
        void url.then(
          (value) => value || this.urls.delete(id),
          () => this.urls.delete(id),
        );
      }
      return url;
    }
    return /^(data:image\/|https:)/i.test(src) ? src : '';
  };

  /**
   * Deletes the images no note refers to any more, once past the grace period. `referenced` must hold the ids of
   * every note's images, archived ones included: an image missing from it is gone for good.
   */
  async removeUnreferenced(referenced: ReadonlySet<string>, now = Date.now()): Promise<number> {
    const stale: string[] = [];
    // One pass: an image referred to is marked seen now; one unreferenced since its grace began is deleted.
    await this.request('readwrite', (store) => {
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) {
          return;
        }
        const image = current.value as StoredImage;
        if (referenced.has(image.id)) {
          current.update({ ...image, seen: now } satisfies StoredImage);
        } else if (now - Math.max(image.created, image.seen ?? 0) > IMAGE_GRACE_MS) {
          stale.push(image.id);
          current.delete();
        }
        current.continue();
      };
      return cursor;
    });
    for (const id of stale) {
      void this.urls.get(id)?.then((url) => url && URL.revokeObjectURL(url));
      this.urls.delete(id);
    }
    return stale.length;
  }

  /** Runs a request in a transaction and resolves with its result once the transaction completes. */
  private async request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result as T);
      transaction.onerror = () => reject(transaction.error ?? request.error);
      transaction.onabort = () => reject(transaction.error ?? new DOMException('Aborted', 'AbortError'));
    });
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error: unknown) => {
      this.db = undefined;
      throw error;
    });
    return this.db;
  }
}
