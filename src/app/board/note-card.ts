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
  readonly pad = computed(() => (this.item().properties['pad'] as string | undefined) ?? 'notebook');
  readonly paper = computed(() => (this.item().properties['paper'] as string | undefined) ?? 'lined');
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
        afterNextRender(() => void this.focus(), { injector: this.injector });
      }
    });
  }

  /** Focus the editor once it can take focus: the notepad after its first update, the code editor once mounted. */
  async focus(): Promise<void> {
    const editor = this.host.nativeElement.querySelector<Notepad | CodeEditor>('c2-notepad, c2-code-editor');
    if (!editor) {
      return;
    }
    await customElements.whenDefined(editor.localName);
    await editor.updateComplete;
    if ('ready' in editor) {
      await editor.ready;
    }
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

  /**
   * @c2n/code-editor 0.0.20 creates CodeMirror with the value and language it had when the (async) engine import
   * started, and drops a change made while the import is in flight. chrome.storage answers asynchronously, so the
   * stored code usually arrives in that window: re-apply both once the engine is live.
   */
  onCodeEditorReady(event: Event): void {
    const editor = event.target as CodeEditor;
    editor.requestUpdate('value', undefined);
    editor.requestUpdate('language', undefined);
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
