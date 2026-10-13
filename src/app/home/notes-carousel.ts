import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

// Loaded with this component, once Home is up: the carousel is not part of what a new tab paints first.
import '@c2n/components/carousel';
import '@c2n/feather-icons/icons/arrow-right.js';
import '@c2n/feather-icons/icons/clock.js';
import '@c2n/phosphor-icons/icons/push-pin.js';

import { DataService } from '../services/data.service';
import { editedLabel } from '../services/utils';
import type { HomeNotesSetting } from '../settings/settings';
import { ItemDataActions } from '../store/actions';
import { DEFAULT_BOARD_ID } from '../store/models';
import { selectIsAllLoadedItemDatas, selectItemDataEntities } from '../store/reducers';
import { HomeNote, homeNotes } from './home-notes';

/**
 * The board's notes on Home, one at a time, in the order the setting picks. A note opens the board on it; previous and
 * next show only while the pointer is over the carousel.
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

  readonly setting = input.required<HomeNotesSetting>();
  /** Home's clock, which keeps "Edited 5 min ago" current. */
  readonly now = input(new Date());

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
          map(([items, data, loaded]) => (loaded ? homeNotes(items, data, setting) : null)),
          startWith(null),
        );
      }),
    ),
    { initialValue: null },
  );

  readonly slides = computed(() => {
    const now = this.now();
    return (
      this.notes()?.map((note) => ({
        ...note,
        text: note.lines.join('\n'),
        editedLabel: editedLabel(note.edited, now),
      })) ?? null
    );
  });
}
