import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import type { Notepad, NotepadPaperChangeEventDetail } from '@c2n/components/notepad';
import { filter } from 'rxjs/operators';

import { colorIndexFor, paperColorFor } from '../note-config';
import { getCurrentDate } from '../services/utils';
import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';

/**
 * A quick note: a c2-notepad written right on the board, with its actions menu (pin, archive, delete) in the
 * notepad's actions slot.
 * Rendered inside the c2-masonry-item that places it.
 */
@Component({
  selector: 'ntm-note-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './note-card.html',
  styleUrl: './note-card.scss',
  host: {
    class: 'note',
    '[class.note--blink]': 'blinking()',
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class NoteCard {
  private readonly dataService = inject(DataService);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly item = input.required<ArtBoardItem>();
  /** Pinned: it stays on the board, first, until unpinned. */
  readonly pinned = input(false);
  /** Focus the editor once it is rendered (a note that was just created). */
  readonly autofocus = input(false);

  readonly archive = output<void>();
  readonly remove = output<void>();
  readonly pin = output<void>();
  readonly unpin = output<void>();

  readonly value = signal('');
  readonly blinking = signal(false);
  /** A page is being torn off: its copy falls out of the note while it animates. */
  readonly tearing = signal(false);

  private readonly itemId = computed(() => this.item().id);
  readonly paperColor = computed(() => paperColorFor(this.item().colorIndex));
  readonly pad = computed(() => (this.item().properties['pad'] as string | undefined) ?? 'notebook');
  readonly paper = computed(() => (this.item().properties['paper'] as string | undefined) ?? 'lined');
  /**
   * A sticky note leans by 1–1.5deg either way, the same each time for a note (picked from its id), and less than the
   * notepad's own 1–4deg, which would not fit its tile. Other pads stand straight.
   */
  readonly tilt = computed(() => {
    if (this.pad() !== 'sticky') {
      return null;
    }
    let hash = 0;
    for (const char of this.item().id) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    const degrees = 1 + (hash % 101) / 200;
    return `${hash & 0x10000 ? -degrees : degrees}deg`;
  });
  constructor() {
    // Bind the stored data once, then only apply changes made elsewhere (another tab or device): re-applying our
    // own saves would move the caret while the user types.
    let firstBinding = true;
    effect((onCleanup) => {
      const id = this.itemId();
      const subscription = this.dataService
        .getItemData(id)
        .pipe(filter((itemData) => firstBinding || itemData.sourceId !== this.instanceId))
        .subscribe((itemData) => {
          firstBinding = false;
          this.value.set(itemData.data ?? '');
        });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      if (this.autofocus()) {
        afterNextRender(() => void this.focus(), { injector: this.injector });
      }
    });
  }

  /** Focus the notepad once it can take focus. */
  async focus(): Promise<void> {
    const editor = this.host.nativeElement.querySelector<Notepad>('c2-notepad');
    if (!editor) {
      return;
    }
    await customElements.whenDefined(editor.localName);
    await editor.updateComplete;
    // c2-masonry slots a new tile a frame or two after it is added; until then the tile is not rendered and focus()
    // is a silent no-op, so keep trying for a few frames.
    for (let frame = 0; frame < 30 && document.activeElement !== editor; frame++) {
      editor.focus();
      if (document.activeElement !== editor) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
  }

  /** Scroll the note into view and run a light around its border, after picking it from the search results. */
  highlight(): void {
    this.host.nativeElement.closest('c2-masonry-item')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.blinking.set(true);
  }

  /** The beam has faded out (or, with reduced motion, the still ring has): the highlight is over. */
  onAnimationEnd(event: AnimationEvent): void {
    // By its element: Angular scopes the keyframes' names to the component.
    if ((event.target as Element).classList.contains('note__beam')) {
      this.blinking.set(false);
    }
  }

  /** Each edit, and a torn-off page, which clears the notepad with a `change` but no `input`. */
  onTextInput(event: Event): void {
    const value = (event.target as Notepad).value;
    this.dataService.updateDataItem({ id: this.item().id, data: value, dataType: DataType.MARKDOWN });
  }

  /** Hide the note's overflow until the torn page's animation is over (none under reduced motion). */
  onPageTear(event: Event): void {
    const notepad = event.target as Notepad;
    this.tearing.set(true);
    // The torn copy and its animation start right after page-tear.
    requestAnimationFrame(async () => {
      await Promise.allSettled((notepad.shadowRoot?.getAnimations() ?? []).map((animation) => animation.finished));
      this.tearing.set(false);
    });
  }

  /** The paper picker sets pad, ruling and colour together; the colour keeps living in `colorIndex` as in 2.x. */
  onPaperChange(event: Event): void {
    const { pad, paper, paperColor } = (event as CustomEvent<NotepadPaperChangeEventDetail>).detail;
    const item = this.item();
    this.dataService.updateArtBoardItem({
      ...item,
      colorIndex: colorIndexFor(paperColor),
      // Dated apart from the note, whose date every layout change moves: a new note starts on the paper picked last.
      properties: { ...item.properties, pad, paper, paperModifiedDate: getCurrentDate() },
    });
  }

  onMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    if (value === 'archive') {
      this.archive.emit();
    } else if (value === 'delete') {
      this.remove.emit();
    } else if (value === 'pin') {
      this.pin.emit();
    } else if (value === 'unpin') {
      this.unpin.emit();
    }
  }
}
