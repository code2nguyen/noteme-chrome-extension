import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { parseFlow } from '../flow/flow-doc';
import { DataService } from '../services/data.service';
import { editedLabel } from '../services/utils';
import { ArtBoardItem } from '../store/models';

const SHOWN_BOXES = 6;

/** A flow on the board: its title and the names of its first boxes. The whole card opens the flow. */
@Component({
  selector: 'ntm-flow-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  template: `
    <a class="flow-card" [routerLink]="['/flow', item().id]">
      <span class="flow-card__kind">
        <c2-feather-share-2 aria-hidden="true"></c2-feather-share-2>
        Flow · {{ edited() }}
      </span>
      <span class="flow-card__title" [class.flow-card__title--untitled]="!title()">{{
        title() || 'Untitled flow'
      }}</span>
      @if (boxes().length > 0) {
        <span class="flow-card__boxes">
          @for (box of boxes(); track $index) {
            <span class="flow-card__box">{{ box }}</span>
          }
        </span>
      }
    </a>
  `,
  styleUrl: './flow-card.scss',
})
export class FlowCard {
  private readonly dataService = inject(DataService);

  readonly item = input.required<ArtBoardItem>();

  private readonly data = toSignal(
    toObservable(computed(() => this.item().id)).pipe(switchMap((id) => this.dataService.getItemData(id))),
  );

  readonly title = computed(() => this.data()?.properties?.title?.trim() ?? '');
  readonly boxes = computed(() =>
    parseFlow(this.data()?.data)
      .nodes.slice(0, SHOWN_BOXES)
      .map((node) => node.label),
  );
  readonly edited = computed(() => {
    const item = this.item();
    const data = this.data();
    // An empty placeholder (no data stored yet) carries the time it was made, not when the note was edited.
    return editedLabel((data?.empty ? undefined : data?.modifiedDate) ?? item.dataModifiedDate ?? item.modifiedDate);
  });
}
