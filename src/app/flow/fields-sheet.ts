// The c2 elements of a box's fields sheet.
import '@c2n/components/button';
import '@c2n/components/icon-button';
import '@c2n/components/list-item';
import '@c2n/components/select';
import '@c2n/components/sheet';
import '@c2n/components/text-field';
import '@c2n/feather-icons/icons/plus.js';
import '@c2n/feather-icons/icons/trash-2.js';

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import type { TextField } from '@c2n/components/text-field';

import { I18n } from '../i18n/i18n.service';
import { uuid } from '../services/utils';
import { addField, BoxField, deleteField, editField, FieldKey, FlowDoc } from './flow-doc';

/**
 * The fields of one box, in a sheet beside the canvas: a name, a type and a key each, as the columns of a table in a
 * data schema. Every edit is handed back at once as a pure edit (flow-doc.ts) for the view to apply to the document it
 * holds then: two edits in one go (a name committed by the Enter that adds the next field) each build on the last. The
 * box changes on the canvas as you go; the order is changed on the canvas, by a field's grip.
 */
@Component({
  selector: 'ntm-fields-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './fields-sheet.html',
  styleUrl: './fields-sheet.scss',
})
export class FieldsSheet {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly t = inject(I18n).t;

  readonly doc = input.required<FlowDoc>();
  /** The box whose fields show; `null` closes the sheet. */
  readonly boxId = input<string | null>(null);
  readonly changed = output<(doc: FlowDoc) => FlowDoc>();
  readonly closed = output<void>();

  readonly box = computed(() => this.doc().nodes.find((node) => node.id === this.boxId()) ?? null);
  readonly fields = computed(() => this.box()?.fields ?? []);
  readonly keys = ['none', 'primary', 'foreign'] as const;
  /** A key's name in the list, and the short one its trigger shows (PK, FK). */
  readonly keyLabel = (key: FieldKey | 'none') => this.t(`flow.fields.key.${key}`);
  readonly keyShort = (key: FieldKey | 'none') => this.t(`flow.fields.key.${key}.short`);

  /** A field at the end, its name ready to type over. */
  add(): void {
    const box = this.box();
    if (!box) {
      return;
    }
    const id = uuid();
    const name = this.t('flow.fields.newField');
    this.changed.emit((doc) => addField(doc, box.id, id, name));
    afterNextRender(() => void this.focusName(id), { injector: this.injector });
  }

  onName(field: BoxField, event: Event): void {
    const element = event.target as TextField;
    // A field is always named: an emptied name goes back to the one it had.
    if (!element.value.trim()) {
      element.value = field.name;
    }
    this.edit(field, { name: element.value });
  }

  onType(field: BoxField, event: Event): void {
    this.edit(field, { type: (event.target as TextField).value });
  }

  onKey(field: BoxField, event: Event): void {
    const [value] = (event.target as HTMLElement & { value: string[] }).value;
    this.edit(field, { key: value === 'primary' || value === 'foreign' ? (value as FieldKey) : undefined });
  }

  /** Enter in the last name adds the next field, so a table is typed in one go. */
  onNameKeydown(field: BoxField, event: KeyboardEvent): void {
    const fields = this.fields();
    if (event.key === 'Enter' && !event.isComposing && fields[fields.length - 1]?.id === field.id) {
      // The name is committed (change) before the next field takes the focus.
      (event.target as HTMLElement).blur();
      this.add();
    }
  }

  remove(field: BoxField): void {
    const box = this.box();
    if (box) {
      this.changed.emit((doc) => deleteField(doc, box.id, field.id));
    }
  }

  private edit(field: BoxField, change: Parameters<typeof editField>[3]): void {
    const box = this.box();
    if (box) {
      this.changed.emit((doc) => editField(doc, box.id, field.id, change));
    }
  }

  private async focusName(id: string): Promise<void> {
    const field = this.host.nativeElement.querySelector<TextField>(`[data-field="${id}"]`);
    if (!field) {
      return;
    }
    await customElements.whenDefined('c2-text-field');
    await field.updateComplete;
    field.focus();
    field.select();
  }
}
