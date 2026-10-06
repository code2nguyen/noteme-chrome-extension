// The c2 elements of a flow, loaded with its route.
import '@c2n/components/flow';
import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';
import '@c2n/components/text-field';
import '@c2n/feather-icons/icons/archive.js';
import '@c2n/feather-icons/icons/arrow-left.js';
import '@c2n/feather-icons/icons/more-horizontal.js';
import '@c2n/feather-icons/icons/rotate-ccw.js';
import '@c2n/feather-icons/icons/trash-2.js';
import '@c2n/feather-icons/icons/maximize.js';
import '@c2n/feather-icons/icons/plus.js';
import '@c2n/feather-icons/icons/layout.js';

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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  Flow,
  FlowEdgeEditDetail,
  FlowEdgeEventDetail,
  FlowLayoutChangeDetail,
  FlowNode,
  FlowNodeAddDetail,
  FlowNodeDeleteDetail,
  FlowNodeEditDetail,
} from '@c2n/components/flow';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import type { TextField } from '@c2n/components/text-field';
import { combineLatest, EMPTY, interval } from 'rxjs';
import { filter, map, startWith, switchMap, take, tap, timeout } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { editedLabel, uuid } from '../services/utils';
import { ArtBoardItem, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';
import {
  addBox,
  connect,
  deleteBox,
  disconnect,
  EMPTY_FLOW,
  FlowDoc,
  labelArrow,
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
  /** Archived: off the board, in the Archive view. */
  readonly archived = signal(false);
  /** Opened from the Archive (`?from=archive`): what the header goes by until the flow is read. */
  private readonly openedFromArchive = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('from') === 'archive')),
    { initialValue: false },
  );
  /** Whether the way back leads to the Archive and the menu offers Restore. */
  readonly inArchive = computed(() => (this.found() === null ? this.openedFromArchive() : this.archived()));
  private readonly modified = signal<string | undefined>(undefined);
  private readonly tick = toSignal(interval(30_000).pipe(startWith(0)));
  private item: ArtBoardItem | undefined;
  /** The flow shown: Angular reuses this view from one flow to the next. */
  private shownId: string | undefined;
  /** Whether the shown flow's stored title and boxes are bound: until then the view holds nothing of it. */
  private bound = false;
  /** The stored data last seen: an emission for the item alone (restored, moved) must not bind it again. */
  private boundData: ItemData | undefined;
  /** Opened by "New flow": the only flow removed when it is left before its data was read. */
  private isNew = false;
  /** Deleted or archived from its menu: leaving it must not remove it. */
  private deleted = false;
  private savingTimer?: ReturnType<typeof setTimeout>;

  /** What c2-flow draws: the boxes as its nodes, placed where they were left. */
  readonly nodes = computed<FlowNode[]>(() =>
    this.doc().nodes.map(({ id, label, position }) => ({ id, label, ...(position ? { position } : {}) })),
  );
  readonly edges = computed(() => this.doc().edges);
  readonly empty = computed(() => this.doc().nodes.length === 0);

  readonly status = computed(() => {
    this.tick();
    if (this.found() === null) {
      return 'Loading…';
    }
    if (this.saving()) {
      return 'Saving…';
    }
    const modified = this.modified();
    return modified ? `Saved · edited ${editedLabel(modified)}` : 'Saved';
  });

  constructor() {
    this.dataService.loadAllArtBoardItems();
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.dataService.isAllArtBoardItemsLoaded().pipe(filter(Boolean), take(1)),
    ])
      .pipe(
        tap(([id]) => this.show(id)),
        switchMap(([id]) =>
          combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(([item, data]) => {
        this.item = item;
        this.found.set(!!item);
        this.archived.set(!!item && !item.boardId);
        this.modified.set(data.empty ? undefined : data.modifiedDate);
        // Bind the stored flow once, then only changes made elsewhere (another tab).
        const changed = data !== this.boundData;
        this.boundData = data;
        if (!this.bound || (changed && data.sourceId !== this.instanceId)) {
          const first = !this.bound;
          this.bound = true;
          this.title.set(data.properties?.title ?? '');
          this.doc.set(parseFlow(data.data));
          // The title field renders with the flow, once it is found.
          if (first && item && this.isNew) {
            afterNextRender(() => void this.focusTitle(), { injector: this.injector });
          }
        }
      });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.savingTimer);
      this.leave();
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

  onEdgeEdit(event: Event): void {
    const { source, target, label } = (event as CustomEvent<FlowEdgeEditDetail>).detail;
    this.change(labelArrow(this.doc(), source, target, label));
  }

  onLayoutChange(event: Event): void {
    this.change(placeBoxes(this.doc(), (event as CustomEvent<FlowLayoutChangeDetail>).detail.positions));
  }

  /** A box connected after the selected one, or in a free spot of the view; named straight away (onNodeAdd). */
  addBox(): void {
    this.flow()?.nativeElement.addNode();
  }

  /**
   * Pressing + starts dragging a new box onto the canvas, where it is dropped (and named, onNodeAdd). A press that does
   * not move is the button's click (addBox).
   */
  dragBox(event: PointerEvent): void {
    this.flow()?.nativeElement.dragNewNode(event);
  }

  /** Back to the automatic layout: the flow fires layout-change without positions, which forgets them. */
  tidy(): void {
    this.flow()?.nativeElement.resetLayout();
  }

  fit(): void {
    this.flow()?.nativeElement.fitView();
  }

  onMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    const item = this.item;
    if (!item) {
      return;
    }
    if (value === 'restore') {
      this.dataService.restoreArtBoardItem(item);
      return;
    }
    if (value !== 'delete' && value !== 'archive') {
      return;
    }
    this.deleted = true;
    // A blank flow is removed rather than archived, as it would be when left.
    if (value === 'archive' && !(!this.title().trim() && this.doc().nodes.length === 0)) {
      // Decided on what the view shows: the store may not have the last edit yet (its save is debounced).
      this.dataService.hideArtBoardItem(item, { keep: true });
    } else {
      this.dataService.removeArtBoardItem(item);
    }
    this.router.navigate(['/main-board']);
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

  private show(id: string): void {
    if (id === this.shownId) {
      return;
    }
    this.leave();
    this.shownId = id;
    this.isNew = this.route.snapshot.queryParamMap.has('new');
    // Nothing of the last one carries over: its "Saving…" (its save goes on regardless) or its being archived.
    clearTimeout(this.savingTimer);
    this.saving.set(false);
    this.archived.set(false);
    this.found.set(null);
  }

  /** A flow left with no title and no box is removed, as when the view is destroyed. */
  private leave(): void {
    const id = this.shownId;
    if (id && !this.deleted) {
      if (this.bound) {
        const item = this.item;
        if (item && !this.title().trim() && this.doc().nodes.length === 0) {
          this.dataService.removeArtBoardItem(item);
        }
      } else if (this.isNew) {
        // Left before its data was read: decide on what is stored, which is empty unless another tab wrote to it.
        combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)])
          // A failed read never brings the data: give up rather than hold this view and a store selector forever.
          .pipe(take(1), timeout({ first: 10_000, with: () => EMPTY }))
          .subscribe(([item, data]) => {
            if (item && !data.properties?.title?.trim() && parseFlow(data.data).nodes.length === 0) {
              this.dataService.removeArtBoardItem(item);
            }
          });
      }
    }
    this.shownId = undefined;
    this.item = undefined;
    this.bound = false;
    this.boundData = undefined;
    this.deleted = false;
  }
}
