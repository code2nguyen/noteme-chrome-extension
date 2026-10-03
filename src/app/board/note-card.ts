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
import type { MenuSelectEventDetail } from '@c2n/menu';
import type { Notepad, NotepadPaperChangeEventDetail } from '@c2n/notepad';
import { filter } from 'rxjs/operators';

import { colorIndexFor, paperColorFor } from '../note-config';
import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';

/**
 * A quick note: a c2-notepad written right on the board, with its delete action. Rendered inside the
 * c2-masonry-item that places it.
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
  /** Focus the editor once it is rendered (a note that was just created). */
  readonly autofocus = input(false);

  readonly remove = output<void>();

  readonly value = signal('');
  readonly blinking = signal(false);

  private readonly itemId = computed(() => this.item().id);
  readonly paperColor = computed(() => paperColorFor(this.item().colorIndex));
  readonly pad = computed(() => (this.item().properties['pad'] as string | undefined) ?? 'notebook');
  readonly paper = computed(() => (this.item().properties['paper'] as string | undefined) ?? 'lined');
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

  /** Scroll the note into view and blink its outline, after picking it from the search results. */
  highlight(): void {
    this.host.nativeElement.closest('c2-masonry-item')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.blinking.set(true);
  }

  onAnimationEnd(event: AnimationEvent): void {
    if (event.target === this.host.nativeElement) {
      this.blinking.set(false);
    }
  }

  onTextInput(event: Event): void {
    const value = (event.target as Notepad).value;
    this.dataService.updateDataItem({ id: this.item().id, data: value, dataType: DataType.MARKDOWN });
  }

  /** The paper picker sets pad, ruling and colour together; the colour keeps living in `colorIndex` as in 2.x. */
  onPaperChange(event: Event): void {
    const { pad, paper, paperColor } = (event as CustomEvent<NotepadPaperChangeEventDetail>).detail;
    const item = this.item();
    this.dataService.updateArtBoardItem({
      ...item,
      colorIndex: colorIndexFor(paperColor),
      properties: { ...item.properties, pad, paper },
    });
  }

  onDeleteMenu(event: Event): void {
    if ((event as CustomEvent<MenuSelectEventDetail>).detail.value === 'delete') {
      this.remove.emit();
    }
  }
}
