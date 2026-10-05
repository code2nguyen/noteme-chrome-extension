import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { editedLabel, pageMarkdownToText } from '../services/utils';
import { ArtBoardItem } from '../store/models';
import { PAGE_EXCERPT_LENGTH } from './card-rows';

/** A page on the board: its title and first lines. The whole card opens the page. */
@Component({
  selector: 'ntm-page-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  template: `
    <a class="page-card" [routerLink]="['/page', item().id]" [queryParams]="item().boardId ? {} : { from: 'archive' }">
      <span class="page-card__kind">
        <c2-feather-file-text aria-hidden="true"></c2-feather-file-text>
        Page · {{ edited() }}
      </span>
      <span class="page-card__title" [class.page-card__title--untitled]="!title()">{{ title() || 'Untitled' }}</span>
      <span class="page-card__excerpt">{{ excerpt() }}</span>
    </a>
  `,
  styleUrl: './page-card.scss',
})
export class PageCard {
  private readonly dataService = inject(DataService);

  readonly item = input.required<ArtBoardItem>();

  private readonly data = toSignal(
    toObservable(computed(() => this.item().id)).pipe(switchMap((id) => this.dataService.getItemData(id))),
  );

  readonly title = computed(() => this.data()?.properties?.title?.trim() ?? '');
  readonly excerpt = computed(() => {
    const text = pageMarkdownToText(this.data()?.data ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' · ');
    return text.length > PAGE_EXCERPT_LENGTH ? text.slice(0, PAGE_EXCERPT_LENGTH) + '…' : text;
  });
  readonly edited = computed(() => {
    const item = this.item();
    const data = this.data();
    // An empty placeholder (no data stored yet) carries the time it was made, not when the note was edited.
    return editedLabel((data?.empty ? undefined : data?.modifiedDate) ?? item.dataModifiedDate ?? item.modifiedDate);
  });
}
