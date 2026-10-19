import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { InlineEdit } from '@c2n/components/inline-edit';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import type { Spreadsheet, SpreadsheetColumn } from '@c2n/components/spreadsheet';
import { filter } from 'rxjs/operators';

import { I18n } from '../i18n/i18n.service';
import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { parseSheet, serializeSheet, SheetDoc, sheetToMarkdown } from '../sheet/sheet-doc';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';
import { bringIntoView } from './bring-into-view';

/** The sheet loads with the first sheet on the board: a board without one has no use for the spreadsheet. */
let elements: Promise<unknown> | undefined;
function loadElements(): Promise<unknown> {
  elements ??= Promise.all([
    import('@c2n/components/spreadsheet'),
    import('@c2n/components/inline-edit'),
    import('@c2n/feather-icons/icons/copy.js'),
    import('@c2n/feather-icons/icons/download.js'),
    import('@c2n/feather-icons/icons/edit-2.js'),
  ]);
  return elements;
}

/** The sheet's row numbers and borders (sheet-card.scss), and the narrowest a column shares the card's width down to. */
const ROW_HEADER_WIDTH = 36;
const BORDERS = 2;
const MIN_COLUMN_WIDTH = 96;

/** A cell's input as stored: text, whatever the sheet holds it as. */
const cellText = (value: unknown) => (value == null ? '' : String(value));

/**
 * A sheet, worked on right on the board: a c2-spreadsheet (with its own right-click menu) whose cells, column names,
 * widths and styles are stored as they change, under a title renamed in place. Its card follows its rows' height until
 * it is resized (card-rows.ts). A new sheet opens with its title ready for writing, then its first column's name.
 * Rendered inside the c2-masonry-item that places it.
 */
@Component({
  selector: 'ntm-sheet-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sheet-card.html',
  styleUrl: './sheet-card.scss',
  host: {
    class: 'sheet',
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class SheetCard {
  readonly t = inject(I18n).t;
  private readonly dataService = inject(DataService);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly sheet = viewChild<ElementRef<Spreadsheet>>('sheet');
  private readonly titleEdit = viewChild<ElementRef<InlineEdit>>('titleEdit');
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  readonly item = input.required<ArtBoardItem>();
  /** Pinned: it stays on the board, in its place, until unpinned. */
  readonly pinned = input(false);
  /** A sheet that was just created: it asks for its title. */
  readonly autofocus = input(false);

  readonly archive = output<void>();
  readonly remove = output<void>();
  readonly pin = output<void>();
  readonly unpin = output<void>();
  /** Copied as a table: the board says where to paste it. */
  /** Copied as a table, or not (the clipboard refused it). */
  readonly copied = output<boolean>();

  readonly title = signal('');
  /** The stored sheet, as last read: the spreadsheet holds the edits since, and is only handed changes made elsewhere. */
  readonly doc = signal<SheetDoc>(parseSheet(null));
  /** The formula bar and the totals bar, toggled in the card's menu without handing the sheet its cells again. */
  readonly formulaBar = signal(false);
  readonly summary = signal(false);
  readonly blinking = signal(false);
  /** The width of a column the user has not resized: together they fill the card, so a wide card is no wide gap. */
  readonly cellWidth = signal(128);

  private readonly itemId = computed(() => this.item().id);
  /** Created a moment ago: once its title is written, its first column's name opens. */
  private fresh = false;

  constructor() {
    void loadElements();
    // Bind the stored sheet once, then only apply changes made elsewhere (another tab or device): handing the sheet its
    // own saves back would reset it under the pointer.
    let firstBinding = true;
    effect((onCleanup) => {
      const id = this.itemId();
      const subscription = this.dataService
        .getItemData(id)
        .pipe(filter((itemData) => firstBinding || itemData.sourceId !== this.instanceId))
        .subscribe((itemData) => {
          firstBinding = false;
          const doc = parseSheet(itemData.data);
          this.title.set(itemData.properties?.title ?? '');
          this.doc.set(doc);
          this.formulaBar.set(doc.formulaBar);
          this.summary.set(doc.summary);
        });
      onCleanup(() => subscription.unsubscribe());
    });

    const observer = new ResizeObserver(() => this.fit());
    afterNextRender(() => {
      const grid = this.grid()?.nativeElement;
      if (grid) {
        observer.observe(grid);
      }
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());

    effect(() => {
      if (this.autofocus()) {
        this.fresh = true;
        afterNextRender(() => void this.rename(), { injector: this.injector });
      }
    });
  }

  /** Scroll the sheet to the middle and light it up: a new one, or one picked from the search results or on Home. */
  highlight(): void {
    bringIntoView(this.host.nativeElement.closest('c2-masonry-item'));
    this.blinking.set(true);
  }

  onAnimationEnd(event: AnimationEvent): void {
    // By its element: Angular scopes the keyframes' names to the component.
    if ((event.target as Element).classList.contains('sheet__beam')) {
      this.blinking.set(false);
    }
  }

  /** Share the card's width among the columns the user has not resized. */
  private fit(): void {
    const sheet = this.sheet()?.nativeElement;
    const grid = this.grid()?.nativeElement;
    if (!sheet || !grid) {
      return;
    }
    const columns: SpreadsheetColumn[] = Array.isArray(sheet.columns)
      ? sheet.columns
      : Array.from({ length: sheet.columns }, () => ({}));
    const shared = columns.filter((column) => !column.width).length;
    if (!shared) {
      return;
    }
    const taken = columns.reduce((sum, column) => sum + (column.width ?? 0), 0);
    const available = grid.clientWidth - ROW_HEADER_WIDTH - BORDERS - taken;
    this.cellWidth.set(Math.max(MIN_COLUMN_WIDTH, Math.floor(available / shared)));
  }

  /** The sheet as it is now: what the spreadsheet holds, since it holds every edit. */
  private current(): SheetDoc | undefined {
    const sheet = this.sheet()?.nativeElement;
    if (!sheet) {
      return undefined;
    }
    const columns: SpreadsheetColumn[] = Array.isArray(sheet.columns)
      ? sheet.columns
      : Array.from({ length: sheet.columns }, () => ({}));
    return {
      columns,
      data: (sheet.data ?? []).map((row) => (Array.isArray(row) ? row.map(cellText) : [])),
      rows: sheet.rows,
      styles: sheet.styles ?? {},
      formulaBar: sheet.formulaBar,
      summary: sheet.summary,
    };
  }

  /** Store the sheet: every edit, paste, style, column name or width, and every change from its menus. */
  save(): void {
    const doc = this.current();
    if (!doc) {
      return;
    }
    // A column added, removed or resized: the others share what is left.
    this.fit();
    // With the title: a new sheet's data is a placeholder until then, and the search reads it by its type.
    this.dataService.updateDataItem({
      id: this.item().id,
      data: serializeSheet(doc),
      dataType: DataType.SHEET,
      properties: { title: this.title() },
    });
  }

  onTitleChange(event: Event): void {
    this.title.set((event.target as InlineEdit).value);
    this.save();
    if (this.fresh) {
      this.fresh = false;
      // Once the title field has closed and handed the focus back to its text.
      setTimeout(() => this.sheet()?.nativeElement.renameColumn(0));
    }
  }

  /**
   * The new sheet's title closed without a name (Escape, or left as it was): its first column is not named after all.
   * Later, so a commit on the way out still opens it.
   */
  endFresh(): void {
    setTimeout(() => (this.fresh = false));
  }

  /** Open the title for writing, once the field is defined (a new sheet renders before its module has loaded). */
  async rename(): Promise<void> {
    await loadElements();
    const field = this.titleEdit()?.nativeElement;
    if (field) {
      field.editing = true;
    }
  }

  async addRow(): Promise<void> {
    await loadElements();
    const sheet = this.sheet()?.nativeElement;
    if (!sheet) {
      return;
    }
    const row = sheet.rows;
    sheet.insertRows(row);
    this.save();
    sheet.select(`A${row + 1}`);
    sheet.focus();
  }

  async addColumn(): Promise<void> {
    await loadElements();
    const sheet = this.sheet()?.nativeElement;
    if (!sheet) {
      return;
    }
    const column = Array.isArray(sheet.columns) ? sheet.columns.length : sheet.columns;
    sheet.insertColumns(column);
    this.save();
    sheet.renameColumn(column);
  }

  onMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    const sheet = this.sheet()?.nativeElement;
    if (value === 'rename') {
      void this.rename();
    } else if (value === 'formula-bar') {
      this.formulaBar.update((shown) => !shown);
      afterNextRender(() => this.save(), { injector: this.injector });
    } else if (value === 'totals') {
      this.summary.update((shown) => !shown);
      afterNextRender(() => this.save(), { injector: this.injector });
    } else if (value === 'copy-table') {
      const doc = this.current();
      if (doc) {
        // Refused when the page has lost the focus or the browser blocks the clipboard: said rather than silent.
        navigator.clipboard.writeText(sheetToMarkdown(doc)).then(
          () => this.copied.emit(true),
          () => this.copied.emit(false),
        );
      }
    } else if (value === 'download-csv' && sheet) {
      this.download(sheet.toCSV());
    } else if (value === 'archive') {
      this.archive.emit();
    } else if (value === 'delete') {
      this.remove.emit();
    } else if (value === 'pin') {
      this.pin.emit();
    } else if (value === 'unpin') {
      this.unpin.emit();
    }
  }

  private download(csv: string): void {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(this.title().trim() || this.t('common.untitled.sheet')).replace(/[\\/:*?"<>|]+/g, '-')}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
