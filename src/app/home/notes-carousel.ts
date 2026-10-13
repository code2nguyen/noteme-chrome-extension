import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

// Loaded with this component, once Home is up: the carousel is not part of what a new tab paints first.
import '@c2n/components/carousel';
import '@c2n/components/relative-time';
import '@c2n/feather-icons/icons/clock.js';
import '@c2n/phosphor-icons/icons/push-pin.js';

import { I18n } from '../i18n/i18n.service';
import { DataService } from '../services/data.service';
import type { HomeNotesSetting } from '../settings/settings';
import { ItemDataActions } from '../store/actions';
import { DEFAULT_BOARD_ID } from '../store/models';
import { selectIsAllLoadedItemDatas, selectItemDataEntities } from '../store/reducers';
import { HomeNote, homeNotes } from './home-notes';

/** The note last opened from Home, per device: it comes first when Home is opened again. */
const OPENED_KEY = 'noteme-home-opened-note';

/**
 * The board's quick notes on Home, one at a time, in the order the setting picks, the one last opened from here first.
 * A note opens the board on it; previous and next show only while the pointer is over the carousel.
 */
@Component({
  selector: 'ntm-notes-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  templateUrl: './notes-carousel.html',
  styleUrl: './notes-carousel.scss',
})
export class NotesCarousel {
  private readonly store = inject(Store);
  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  /** The relative times say "3 hours ago" in Noteme's language. */
  readonly locale = this.i18n.locale;

  readonly setting = input.required<HomeNotesSetting>();
  /** Read as Home opens; opening a note leaves Home, so it never changes while the carousel is up. */
  private readonly opened = readOpened();

  /** The notes in order; `null` until their text is read, so Pinned never says there are none too early. */
  private readonly notes = toSignal(
    toObservable(this.setting).pipe(
      switchMap((setting) => {
        if (setting === 'off') {
          return of([] as HomeNote[]);
        }
        this.store.dispatch(ItemDataActions.getAllItemData());
        return combineLatest([
          this.dataService.getArtBoardItems(DEFAULT_BOARD_ID),
          this.store.select(selectItemDataEntities),
          this.store.select(selectIsAllLoadedItemDatas),
        ]).pipe(
          map(([items, data, loaded]) => (loaded ? homeNotes(items, data, setting, this.opened) : null)),
          startWith(null),
        );
      }),
    ),
    { initialValue: null },
  );

  readonly slides = computed(() => this.notes()?.map((note) => ({ ...note, text: note.lines.join('\n') })) ?? null);

  /** Remembered as the board opens on it, so it is the one Home shows when the person comes back. */
  open(id: string): void {
    try {
      localStorage.setItem(OPENED_KEY, id);
    } catch {
      // Not stored: Home keeps its usual order.
    }
  }
}

/** localStorage can throw (storage disabled): Home then keeps its usual order. */
function readOpened(): string | null {
  try {
    return localStorage.getItem(OPENED_KEY);
  } catch {
    return null;
  }
}
