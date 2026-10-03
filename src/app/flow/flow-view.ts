// The c2 elements of a flow, loaded with its route.
import '@c2n/flow';
import '@c2n/menu';
import '@c2n/menu/menu-item.js';
import '@c2n/text-field';
import '@c2n/feather-icons/icons/arrow-left.js';
import '@c2n/feather-icons/icons/more-horizontal.js';
import '@c2n/feather-icons/icons/trash-2.js';
import '@c2n/feather-icons/icons/maximize.js';

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  Flow,
  FlowEdgeEventDetail,
  FlowLayoutChangeDetail,
  FlowNode,
  FlowNodeAddDetail,
  FlowNodeDeleteDetail,
  FlowNodeEditDetail,
  FlowRenderer,
} from '@c2n/flow';
import type { MenuSelectEventDetail } from '@c2n/menu';
import type { TextField } from '@c2n/text-field';
import { combineLatest, interval } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { editedLabel, uuid } from '../services/utils';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';
import {
  addBox,
  connect,
  deleteBox,
  disconnect,
  EMPTY_FLOW,
  FlowDoc,
  parseFlow,
  placeBoxes,
  renameBox,
  serializeFlow,
} from './flow-doc';

/** How long "Saving…" stays after the last change: the store writes 300ms after changes stop. */
const SAVING_DELAY = 700;

/**
 * A flow note, full screen: a title and an editable c2-flow. The flow never changes its own boxes: each of its events
 * goes through a pure edit of the document (flow-doc.ts), which is saved and handed back. A flow left with no title
 * and no box is removed when you leave it.
 */
@Component({
  selector: 'ntm-flow-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  templateUrl: './flow-view.html',
  styleUrl: './flow-view.scss',
})
export class FlowView {
  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly injector = inject(Injector);
  private readonly titleField = viewChild<ElementRef<TextField>>('titleField');
  private readonly flow = viewChild<ElementRef<Flow>>('flow');

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
  readonly title = signal('');
  readonly doc = signal<FlowDoc>(EMPTY_FLOW);
  readonly saving = signal(false);
  readonly found = signal<boolean | null>(null);
  private readonly modified = signal<string | undefined>(undefined);
  private readonly tick = toSignal(interval(30_000).pipe(startWith(0)));
  private item: ArtBoardItem | undefined;
  private deleted = false;
  private savingTimer?: ReturnType<typeof setTimeout>;

  /** What c2-flow draws: the boxes as its nodes, placed where they were left. */
  readonly nodes = computed<FlowNode[]>(() =>
    this.doc().nodes.map(({ id, label, position }) => ({ id, label, ...(position ? { position } : {}) })),
  );
  readonly edges = computed(() => this.doc().edges);
  /**
   * A box is its label only: c2-flow's default body adds a status marker (pending, running…), which belongs to
   * pipelines, not to notes.
   */
  readonly renderBox: FlowRenderer = ({ node }) => node.label;
  readonly empty = computed(() => this.doc().nodes.length === 0);

  readonly status = computed(() => {
    this.tick();
    if (this.saving()) {
      return 'Saving…';
    }
    const modified = this.modified();
    return modified ? `Saved · edited ${editedLabel(modified)}` : 'Saved';
  });

  constructor() {
    this.dataService.loadAllArtBoardItems();
    let firstBinding = true;
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.dataService.isAllArtBoardItemsLoaded().pipe(filter(Boolean), take(1)),
    ])
      .pipe(
        switchMap(([id]) =>
          combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)]),
        ),
      )
      .subscribe(([item, data]) => {
        this.item = item;
        this.found.set(!!item);
        this.modified.set(data.empty ? undefined : data.modifiedDate);
        // Bind the stored flow once, then only changes made elsewhere (another tab).
        if (firstBinding || data.sourceId !== this.instanceId) {
          firstBinding = false;
          this.title.set(data.properties?.title ?? '');
          this.doc.set(parseFlow(data.data));
        }
      });

    if (this.route.snapshot.queryParamMap.has('new')) {
      afterNextRender(() => void this.focusTitle());
    }

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.savingTimer);
      this.removeIfEmpty();
    });
  }

  onTitleInput(event: Event): void {
    const title = (event.target as TextField).value;
    this.title.set(title);
    this.save({ properties: { title } });
  }

  /** Enter in the title moves on to the canvas. */
  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flow()?.nativeElement.focus();
    }
  }

  onNodeAdd(event: Event): void {
    const { position, source } = (event as CustomEvent<FlowNodeAddDetail>).detail;
    const id = uuid();
    this.change(addBox(this.doc(), id, position, source));
    // Name it straight away, as in any diagram tool: once Angular has handed the new box to c2-flow and it has drawn
    // it.
    afterNextRender(
      async () => {
        const flow = this.flow()?.nativeElement;
        if (flow) {
          await flow.updateComplete;
          await flow.editLabel(id);
        }
      },
      { injector: this.injector },
    );
  }

  onNodeEdit(event: Event): void {
    const { id, label } = (event as CustomEvent<FlowNodeEditDetail>).detail;
    this.change(renameBox(this.doc(), id, label));
  }

  onNodeDelete(event: Event): void {
    this.change(deleteBox(this.doc(), (event as CustomEvent<FlowNodeDeleteDetail>).detail.id));
  }

  onEdgeAdd(event: Event): void {
    const { source, target } = (event as CustomEvent<FlowEdgeEventDetail>).detail;
    this.change(connect(this.doc(), source, target));
  }

  onEdgeDelete(event: Event): void {
    const { source, target } = (event as CustomEvent<FlowEdgeEventDetail>).detail;
    this.change(disconnect(this.doc(), source, target));
  }

  onLayoutChange(event: Event): void {
    this.change(placeBoxes(this.doc(), (event as CustomEvent<FlowLayoutChangeDetail>).detail.positions));
  }

  fit(): void {
    this.flow()?.nativeElement.fitView();
  }

  onMenu(event: Event): void {
    if ((event as CustomEvent<MenuSelectEventDetail>).detail.value === 'delete' && this.item) {
      this.deleted = true;
      this.dataService.removeArtBoardItem(this.item);
      this.router.navigate(['/main-board']);
    }
  }

  private change(doc: FlowDoc): void {
    if (doc === this.doc()) {
      return;
    }
    this.doc.set(doc);
    this.save({ data: serializeFlow(doc) });
  }

  private save(changes: { data?: string; properties?: { title: string } }): void {
    this.dataService.updateDataItem({ id: this.id(), dataType: DataType.FLOW, ...changes });
    this.saving.set(true);
    clearTimeout(this.savingTimer);
    this.savingTimer = setTimeout(() => this.saving.set(false), SAVING_DELAY);
  }

  private async focusTitle(): Promise<void> {
    const field = this.titleField()?.nativeElement;
    if (!field) {
      return;
    }
    await customElements.whenDefined('c2-text-field');
    await field.updateComplete;
    field.focus();
  }

  private removeIfEmpty(): void {
    const item = this.item;
    if (item && !this.deleted && !this.title().trim() && this.doc().nodes.length === 0) {
      this.dataService.removeArtBoardItem(item);
    }
  }
}
