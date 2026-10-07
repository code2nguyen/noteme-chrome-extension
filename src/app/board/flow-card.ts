import '@c2n/components/flow';

import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { parseFlow } from '../flow/flow-doc';
import { flowNodes } from '../flow/flow-nodes';
import { DataService } from '../services/data.service';
import { editedLabel } from '../services/utils';
import { ArtBoardItem } from '../store/models';

/**
 * A flow on the board: its title over the flow itself, drawn small and still (fitted to the card, its boxes in their
 * shapes and colours). The flow is inert, so the whole card is one link that opens it.
 */
@Component({
  selector: 'ntm-flow-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  template: `
    <a class="flow-card" [routerLink]="['/flow', item().id]" [queryParams]="item().boardId ? {} : { from: 'archive' }">
      <span class="flow-card__kind">
        <c2-feather-share-2 aria-hidden="true"></c2-feather-share-2>
        Flow · {{ edited() }}
      </span>
      <span class="flow-card__title" [class.flow-card__title--untitled]="!title()">{{
        title() || 'Untitled flow'
      }}</span>
      @if (nodes().length > 0) {
        <c2-flow
          class="flow-card__flow"
          inert
          locked
          no-card
          no-context-menu
          [nodes]="nodes()"
          [edges]="edges()"
        ></c2-flow>
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
  private readonly doc = computed(() => parseFlow(this.data()?.data));
  readonly nodes = computed(() => flowNodes(this.doc()));
  readonly edges = computed(() => this.doc().edges);
  readonly edited = computed(() => {
    const item = this.item();
    const data = this.data();
    // An empty placeholder (no data stored yet) carries the time it was made, not when the note was edited.
    return editedLabel((data?.empty ? undefined : data?.modifiedDate) ?? item.dataModifiedDate ?? item.modifiedDate);
  });
}
