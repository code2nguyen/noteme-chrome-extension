import { addTranslations } from '@c2n/core/localize.js';

import * as autocomplete from './autocomplete';
import * as carousel from './carousel';
import * as checkbox from './checkbox';
import * as codeEditor from './code-editor';
import * as flow from './flow';
import * as inlineEdit from './inline-edit';
import * as masonry from './masonry';
import * as modal from './modal';
import * as notepad from './notepad';
import * as pageEditor from './page-editor';
import * as searchField from './search-field';
import * as select from './select';
import * as sheet from './sheet';
import * as spinner from './spinner';
import * as splitPanel from './split-panel';
import * as spreadsheet from './spreadsheet';
import * as switchField from './switch';
import * as textField from './text-field';
import * as timeInput from './time-input';
import * as toast from './toast';
import * as todoList from './todo-list';

/**
 * The c2 components' text in Noteme's languages: they ship English, and show these for `<html lang>`, message by
 * message, English for any missing. Registered once, before the first component renders.
 */
export function registerComponentTranslations(): void {
  addTranslations({
    fr: {
      autocomplete: autocomplete.fr,
      carousel: carousel.fr,
      checkbox: checkbox.fr,
      'code-editor': codeEditor.fr,
      flow: flow.fr,
      'inline-edit': inlineEdit.fr,
      masonry: masonry.fr,
      modal: modal.fr,
      notepad: notepad.fr,
      'page-editor': pageEditor.fr,
      'search-field': searchField.fr,
      select: select.fr,
      sheet: sheet.fr,
      spinner: spinner.fr,
      'split-panel': splitPanel.fr,
      spreadsheet: spreadsheet.fr,
      switch: switchField.fr,
      'text-field': textField.fr,
      'time-input': timeInput.fr,
      toast: toast.fr,
      'todo-list': todoList.fr,
    },
    vi: {
      autocomplete: autocomplete.vi,
      carousel: carousel.vi,
      checkbox: checkbox.vi,
      'code-editor': codeEditor.vi,
      flow: flow.vi,
      'inline-edit': inlineEdit.vi,
      masonry: masonry.vi,
      modal: modal.vi,
      notepad: notepad.vi,
      'page-editor': pageEditor.vi,
      'search-field': searchField.vi,
      select: select.vi,
      sheet: sheet.vi,
      spinner: spinner.vi,
      'split-panel': splitPanel.vi,
      spreadsheet: spreadsheet.vi,
      switch: switchField.vi,
      'text-field': textField.vi,
      'time-input': timeInput.vi,
      toast: toast.vi,
      'todo-list': todoList.vi,
    },
  });
}
