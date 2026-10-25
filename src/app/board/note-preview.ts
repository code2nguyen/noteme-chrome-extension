import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
} from '@angular/core';
import type { TodoListLook } from '@c2n/components/todo-list';

import { parseFlow } from '../flow/flow-doc';
import { FlowIcons, flowNodes } from '../flow/flow-nodes';
import { I18n } from '../i18n/i18n.service';
import { ImageStore } from '../services/image-store';
import { pageMarkdownToText } from '../services/utils';
import { parseSheet, sheetText } from '../sheet/sheet-doc';
import { ArtBoardItem, ItemData } from '../store/models';
import { parseTasks } from '../todo/todo-doc';
import { NoteKind } from './older-notes';

/**
 * Each kind's element loads the first time a note of that kind is shown: the board and the Archive have no use for a
 * page editor or a spreadsheet until one is opened here.
 */
const ELEMENTS: Partial<Record<NoteKind, () => Promise<unknown>>> = {
  Page: () => import('@c2n/components/page-editor'),
  List: () => import('@c2n/components/todo-list'),
  Sheet: () => import('@c2n/components/spreadsheet'),
  Flow: () => import('@c2n/components/flow'),
};

/**
 * A page, a flow, a to-do list or a sheet as it looks, read-only, for the Archive's preview and an Older note opened:
 * the element its card or its own view draws it with, holding its stored data. A text note keeps its paper, drawn by
 * those views themselves.
 */
@Component({
  selector: 'ntm-note-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (empty()) {
      <p class="preview__empty">{{ t('common.nothingWritten') }}</p>
    } @else {
      @switch (kind()) {
        @case ('Page') {
          <div class="preview__frame preview__frame--page">
            <c2-page-editor
              readonly
              [attr.label]="label()"
              [imageResolver]="images.resolve"
              [value]="text()"
            ></c2-page-editor>
          </div>
        }
        @case ('Flow') {
          <div class="preview__frame">
            <c2-flow
              class="preview__flow"
              inert
              locked
              no-card
              no-context-menu
              fit-min-zoom="0.5"
              [nodes]="flowNodes()"
              [edges]="flow().edges"
            ></c2-flow>
          </div>
        }
        @case ('List') {
          <c2-todo-list
            class="preview__list"
            readonly
            progress="ring"
            [heading]="title()"
            [tasks]="tasks()"
            [look]="look()"
          ></c2-todo-list>
        }
        @case ('Sheet') {
          <c2-spreadsheet
            class="preview__sheet"
            readonly
            hide-selection-on-blur
            [label]="label()"
            [data]="sheet().data"
            [columns]="sheet().columns"
            [rows]="sheet().rows"
            [styles]="sheet().styles"
            [formulaBar]="false"
            [summary]="sheet().summary"
          ></c2-spreadsheet>
        }
      }
    }
  `,
  styleUrl: './note-preview.scss',
})
export class NotePreview {
  readonly kind = input.required<NoteKind>();
  readonly item = input.required<ArtBoardItem>();
  readonly data = input<ItemData | undefined>();
  /** The note's name, read to assistive technologies. */
  readonly label = input('');

  readonly text = computed(() => this.data()?.data ?? '');
  readonly title = computed(() => this.data()?.properties?.title?.trim() ?? '');
  readonly flow = computed(() => parseFlow(this.data()?.data));
  /** The icon elements its c2-flow draws, kept across redraws. */
  private readonly icons: FlowIcons = new Map();
  readonly flowNodes = computed(() => flowNodes(this.flow(), this.icons));
  readonly tasks = computed(() => parseTasks(this.data()?.data));
  readonly look = computed(() => (this.item().properties['look'] as TodoListLook | undefined) ?? {});
  readonly sheet = computed(() => parseSheet(this.data()?.data));
  /** Nothing to draw: said in words rather than shown as a blank page, canvas, list or grid. */
  readonly empty = computed(() => {
    switch (this.kind()) {
      case 'Page':
        return !pageMarkdownToText(this.text()).trim();
      case 'Flow':
        return this.flow().nodes.length === 0;
      case 'List':
        return this.tasks().length === 0;
      case 'Sheet':
        return !sheetText(this.sheet()).trim();
      default:
        return false;
    }
  });
  readonly t = inject(I18n).t;
  /** Draws the notes' images (and saves those pasted into an editable one). */
  readonly images = inject(ImageStore);

  constructor() {
    effect(() => void ELEMENTS[this.kind()]?.());
  }
}
