import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dictionary } from '@ngrx/entity';
import type { SelectionChangeEventDetail } from '@c2n/components/list';
import type { MenuSelectEventDetail } from '@c2n/components/menu';

import { I18n } from '../i18n/i18n.service';
import { ImageStore } from '../services/image-store';
import { kindKey } from '../i18n/kinds';
import type { MessageKey } from '../i18n/messages';
import { paperColorFor } from '../note-config';
import { FULL_SCREEN } from '../services/search-results';
import { ArtBoardItem, ItemData } from '../store/models';
import { NotePreview } from './note-preview';
import {
  archivedOn,
  countKinds,
  groupByMonth,
  isNoteKind,
  kindOptions,
  NoteKind,
  NoteSummary,
  summarize,
} from './older-notes';

/** An archived note as the list shows it: its summary, and when it was archived. */
export interface ArchivedNote extends NoteSummary {
  item: ArtBoardItem;
  archived: string;
}

export type ArchiveSort = 'archived' | 'edited' | 'name';

const SORT_LABELS: Record<ArchiveSort, MessageKey> = {
  archived: 'archive.sort.archived',
  edited: 'archive.sort.edited',
  name: 'archive.sort.name',
};

/** What the list says when nothing of the chosen kind is archived; "all" reads as notes. */
const NONE_KEYS: Record<'all' | NoteKind, MessageKey> = {
  all: 'archive.none.note',
  Note: 'archive.none.note',
  Page: 'archive.none.page',
  Flow: 'archive.none.flow',
  List: 'archive.none.list',
  Sheet: 'archive.none.sheet',
};

/** Below this width the list takes the screen and the preview slides up in a sheet. */
const NARROW = '(max-width: 760px)';

/**
 * The Archive: a list of what was archived, grouped by month, beside a preview of the one picked, read on its own paper
 * before it is restored. Checked rows are restored or deleted together.
 */
@Component({
  selector: 'ntm-archive-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgTemplateOutlet, NotePreview],
  templateUrl: './archive-view.html',
  styleUrl: './archive-view.scss',
})
export class ArchiveView {
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;
  /** Draws the notes' images (and saves those pasted into an editable one). */
  readonly images = inject(ImageStore);
  readonly kindKey = kindKey;

  /** What is archived, or what of it matches the search. */
  readonly items = input.required<ArtBoardItem[]>();
  readonly data = input.required<Dictionary<ItemData>>();

  readonly restore = output<ArtBoardItem[]>();
  readonly remove = output<ArtBoardItem[]>();
  /** A page or a flow to open full screen. */
  readonly open = output<ArtBoardItem>();

  /** Whether a note opens full screen (a page or a flow): a note or a to-do list is restored to be worked on. */
  opensFullScreen(item: ArtBoardItem): boolean {
    return !!FULL_SCREEN[item.extensionId];
  }

  readonly kind = signal<'all' | NoteKind>('all');
  readonly sort = signal<ArchiveSort>('archived');
  readonly sortLabels = SORT_LABELS;
  readonly noneKeys = NONE_KEYS;
  readonly sorts = Object.keys(SORT_LABELS) as ArchiveSort[];
  /** The note picked for the preview; unset, the first one shows on a wide screen. */
  private readonly chosenId = signal<string | null>(null);
  readonly checked = signal<ReadonlySet<string>>(new Set());
  /** The notes waiting for "Delete forever" to be confirmed. */
  readonly confirming = signal<ArtBoardItem[] | null>(null);
  /** Whether those notes are the checked ones, asked from the action bar, which is gone once they are. */
  private confirmingChecked = false;
  private readonly selectAll = viewChild<ElementRef<HTMLElement>>('selectAll');

  private readonly media = matchMedia(NARROW);
  readonly narrow = signal(this.media.matches);
  /** On a narrow screen, whether the preview sheet is up. */
  readonly previewOpen = signal(false);

  readonly notes = computed<ArchivedNote[]>(() => {
    const data = this.data();
    return this.items().map((item) => ({ ...summarize(item, data, this.t), item, archived: archivedOn(item, data) }));
  });

  readonly counts = computed(() => countKinds(this.notes()));
  readonly kindOptions = computed(() => kindOptions(this.counts(), this.kind(), this.t));

  /** The notes listed: of the chosen kind, in the chosen order. */
  readonly shown = computed(() => {
    const kind = this.kind();
    const sort = this.sort();
    const notes = this.notes().filter((note) => kind === 'all' || note.kind === kind);
    if (sort === 'name') {
      const locale = this.i18n.locale();
      return notes.sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' }));
    }
    const date = sort === 'archived' ? (note: ArchivedNote) => note.archived : (note: ArchivedNote) => note.edited;
    return notes.sort((a, b) => date(b).localeCompare(date(a)));
  });

  /** By month of the date they are sorted by; by name, one list without headings. */
  readonly groups = computed(() => {
    const sort = this.sort();
    if (sort === 'name') {
      return [{ label: '', items: this.shown() }];
    }
    return groupByMonth(this.shown(), this.i18n.locale(), new Date(), (note) =>
      sort === 'archived' ? note.archived : note.edited,
    );
  });

  readonly preview = computed(() => {
    const shown = this.shown();
    const chosen = shown.find((note) => note.id === this.chosenId());
    return chosen ?? (this.narrow() ? null : (shown[0] ?? null));
  });

  /** The checked notes still listed: a filter or a search can hide some. */
  readonly checkedNotes = computed(() => this.shown().filter((note) => this.checked().has(note.id)));
  readonly allChecked = computed(() => this.shown().length > 0 && this.checkedNotes().length === this.shown().length);

  constructor() {
    const onChange = (event: MediaQueryListEvent) => this.narrow.set(event.matches);
    this.media.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.media.removeEventListener('change', onChange));
  }

  onKind(event: Event): void {
    const [value] = (event as CustomEvent<{ value: string[] }>).detail.value;
    this.kind.set(isNoteKind(value) ? value : 'all');
  }

  onSort(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value as ArchiveSort;
    if (value in SORT_LABELS) {
      this.sort.set(value);
    }
  }

  /** A row picked with the keyboard. */
  onPick(event: Event): void {
    const [id] = (event as CustomEvent<SelectionChangeEventDetail>).detail.value as string[];
    if (id) {
      this.pick(id);
    }
  }

  /** A click on a row picks it; one on its checkbox only ticks it. */
  onRowClick(id: string, event: Event): void {
    if (!(event.target as Element).closest('c2-checkbox')) {
      this.pick(id);
    }
  }

  /** A row picked: its preview shows, and on a phone the sheet comes up, even for the row already picked. */
  pick(id: string): void {
    this.chosenId.set(id);
    this.previewOpen.set(this.narrow());
  }

  toggle(id: string, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.checked.update((ids) => {
      const next = new Set(ids);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  /** Ticks or unticks every note listed; notes a filter hides keep whatever state they had. */
  toggleAll(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.checked.update((ids) => {
      const next = new Set(ids);
      for (const note of this.shown()) {
        if (on) {
          next.add(note.id);
        } else {
          next.delete(note.id);
        }
      }
      return next;
    });
  }

  /** Unchecks every note; from the action bar (`refocus`), the focus it held goes back to the list. */
  clearChecked(refocus = false): void {
    this.checked.set(new Set());
    if (refocus) {
      this.focusList();
    }
  }

  /** Restores notes; the checked ones from the action bar, which hides with them, giving the focus back to the list. */
  restoreNotes(notes: ArchivedNote[], refocus = false): void {
    this.leaving(notes);
    this.restore.emit(notes.map((note) => note.item));
    if (refocus) {
      this.focusList();
    }
  }

  /** Delete asks first: there is no coming back from it. */
  askRemove(notes: ArchivedNote[], fromBar = false): void {
    this.confirmingChecked = fromBar;
    this.confirming.set(notes.map((note) => note.item));
  }

  /**
   * The confirmation closed. Asked from the action bar, it would give the focus back to a Delete button the bar has
   * hidden with the notes, or kept for a later selection: the list takes it instead.
   */
  onConfirmClosed(): void {
    this.confirming.set(null);
    if (this.confirmingChecked) {
      this.confirmingChecked = false;
      this.focusList();
    }
  }

  /** The list's first control, the box that checks every note: where the focus goes when the action bar hides. */
  private focusList(): void {
    this.selectAll()?.nativeElement.focus();
  }

  confirmRemove(): void {
    const items = this.confirming();
    this.confirming.set(null);
    if (!items) {
      return;
    }
    const ids = new Set(items.map((item) => item.id));
    this.leaving(this.shown().filter((note) => ids.has(note.id)));
    this.remove.emit(items);
  }

  confirmText(items: ArtBoardItem[]): string {
    if (items.length === 1) {
      return this.t('archive.confirm.one', summarize(items[0], this.data(), this.t).label);
    }
    return this.t('archive.confirm.many', items.length);
  }

  shortDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(this.i18n.locale(), {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
    });
  }

  paperColor(item: ArtBoardItem): string {
    return paperColorFor(item.colorIndex);
  }

  /** A note's markdown, for its paper in the preview. */
  markdown(id: string): string {
    return this.data()[id]?.data ?? '';
  }

  /**
   * Notes about to leave the list: the preview moves on to the next one still listed (or the one before), and they
   * are no longer checked.
   */
  private leaving(notes: ArchivedNote[]): void {
    const ids = new Set(notes.map((note) => note.id));
    const shown = this.shown();
    const preview = this.preview();
    if (preview && ids.has(preview.id)) {
      const index = shown.findIndex((note) => note.id === preview.id);
      const next = shown.slice(index + 1).find((note) => !ids.has(note.id));
      const before = shown
        .slice(0, index)
        .reverse()
        .find((note) => !ids.has(note.id));
      this.chosenId.set((next ?? before)?.id ?? null);
      this.previewOpen.set(false);
    }
    this.checked.update((checked) => new Set([...checked].filter((id) => !ids.has(id))));
  }
}
