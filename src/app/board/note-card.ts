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
import type { CodeEditor } from '@c2n/code-editor';
import type { MenuSelectEventDetail } from '@c2n/menu';
import type { Notepad, NotepadPaperChangeEventDetail } from '@c2n/notepad';
import type { Select } from '@c2n/select';
import { filter } from 'rxjs/operators';

import { ExtensionId } from '../extension-id';
import { CODE_LANGUAGES, colorIndexFor, paperColorFor } from '../note-config';
import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';

/**
 * One note of the board: a c2-notepad (text) or a c2-code-editor (code), plus its archive and delete actions.
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
    '[class.note--code]': 'isCode()',
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
  /** True on the Archive tab: the archive button restores the note instead. */
  readonly archived = input(false);
  /** Focus the editor once it is rendered (a note that was just created). */
  readonly autofocus = input(false);

  readonly archiveToggle = output<void>();
  readonly remove = output<void>();

  readonly value = signal('');
  readonly language = signal('plaintext');
  readonly blinking = signal(false);

  private readonly itemId = computed(() => this.item().id);
  readonly isCode = computed(() => this.item().extensionId === ExtensionId.CodeNote);
  readonly paperColor = computed(() => paperColorFor(this.item().colorIndex));
  readonly languages = computed(() => {
    const current = this.language();
    return CODE_LANGUAGES.some((language) => language.id === current)
      ? CODE_LANGUAGES
      : [...CODE_LANGUAGES, { id: current, label: current }];
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
          this.language.set(itemData.properties?.language || 'plaintext');
        });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      if (this.autofocus()) {
        afterNextRender(() => this.focus(), { injector: this.injector });
      }
    });
  }

  focus(): void {
    this.host.nativeElement.querySelector<HTMLElement>('c2-notepad, c2-code-editor')?.focus();
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

  onCodeInput(event: Event): void {
    const value = (event.target as CodeEditor).value;
    this.dataService.updateDataItem({
      id: this.item().id,
      data: value,
      dataType: DataType.TEXT,
      properties: { language: this.language() },
    });
  }

  onLanguageChange(event: Event): void {
    const language = (event.target as Select).value[0];
    if (!language || language === this.language()) {
      return;
    }
    this.language.set(language);
    this.dataService.updateDataItem({ id: this.item().id, dataType: DataType.TEXT, properties: { language } });
  }

  onPaperChange(event: Event): void {
    const { paperColor } = (event as CustomEvent<NotepadPaperChangeEventDetail>).detail;
    this.dataService.changeArtBoardItemColorIndex(this.item().id, colorIndexFor(paperColor));
  }

  onDeleteMenu(event: Event): void {
    if ((event as CustomEvent<MenuSelectEventDetail>).detail.value === 'delete') {
      this.remove.emit();
    }
  }
}
