import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { selectAllItemDatas, selectIsAllLoadedItemDatas } from '../store/reducers';
import { ImageStore, referencedImages } from './image-store';

const LAST_RUN_KEY = 'noteme:images-cleaned';
const EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes the images no note refers to any more (a note deleted, an image removed from it), once a day at most, and
 * only once every note has been read: an image is only deleted when no note is left unread that could refer to it.
 */
@Injectable({ providedIn: 'root' })
export class ImageCleanup {
  private readonly store = inject(Store);
  private readonly images = inject(ImageStore);
  private started = false;

  /** Run when the board has asked for every note's text. */
  run(): void {
    if (this.started || !this.due()) {
      return;
    }
    this.started = true;
    // A read that fails is waited out: a later one (the search's, a retry) loads the notes and the cleanup runs then.
    combineLatest([this.store.select(selectAllItemDatas), this.store.select(selectIsAllLoadedItemDatas)])
      .pipe(
        filter(([, loaded]) => loaded),
        first(),
      )
      .subscribe(([items]) => {
        this.images
          .removeUnreferenced(referencedImages(items))
          .then(() => this.markRun())
          .catch(() => undefined);
      });
  }

  private due(): boolean {
    // A stored time that is not a number, or a storage that cannot be read, runs it: never would leave the images.
    try {
      const last = Number(localStorage.getItem(LAST_RUN_KEY) ?? 0);
      return !Number.isFinite(last) || Date.now() - last > EVERY_MS;
    } catch {
      return true;
    }
  }

  private markRun(): void {
    try {
      localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
    } catch {
      // Runs again next time.
    }
  }
}
