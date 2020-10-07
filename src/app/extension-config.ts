import { from, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ExtensionId } from './extension-id';
import { ExtensionConfig } from './store/models/extension-model';
import { ArtBoardItem } from './store/models';
import { DataType } from './store/models/data-type';

export const NBR_COLORS = 13;
export const DEFAULT_EXTENSION_ID = ExtensionId.TextNote;

type DefaultExtensionProperties = {
  [extensionId: string]: Pick<ArtBoardItem, 'extensionId' | 'colorIndex' | 'element' | 'gridPosition' | 'properties'>;
};

export abstract class Loader<T> {
  private loader?: Observable<T>;

  abstract loadExtension(): Promise<T>;

  load(): Observable<T> {
    if (!this.loader) {
      this.loader = from(this.loadExtension()).pipe(shareReplay(1));
    }
    return this.loader;
  }
}

export const extensionLoader: {
  [extensionId: string]: Loader<any>;
} = {
  [ExtensionId.TextNote]: new (class TextNoteLoader extends Loader<any> {
    async loadExtension(): Promise<any> {
      await import('@cff/webcomponents/components/quill-editor/quill-editor.component.js');
      await import('@cff/webcomponents/components/quill-editor-toolbar/quill-editor-toolbar.component.js');
      return true;
    }
  })(),
};

export const extensionConfigs: {
  [extensionId: string]: ExtensionConfig;
} = {
  [ExtensionId.TextNote]: {
    extensionId: ExtensionId.TextNote,
    element: 'cff-quill-editor',
    properties: [
      {
        name: 'placeholder',
        value: 'New note...',
      },
      {
        name: 'format',
        value: 'object',
      },
    ],
    dataInputProperty: 'content',
    dataType: DataType.DELTA,
    dataChangeEvent: {
      event: 'content-change',
      propertyName: 'detail.content',
    },
    toolbarComponent: {
      element: 'cff-quill-editor-toolbar',
    },
    viewComponent: false,
  },
};

export const extensionDefaultProperties: DefaultExtensionProperties = {
  [ExtensionId.CodeNote]: {
    extensionId: ExtensionId.CodeNote,
    gridPosition: {
      order: -1,
      row: 10,
      screenColumns: {
        Large: 3,
        Medium: 3,
        Small: 3,
        XSmall: 3,
      },
    },
    colorIndex: 0,
    properties: {
      language: 'markdown',
    },
  },
  [ExtensionId.TextNote]: {
    extensionId: ExtensionId.TextNote,
    element: 'quill-editor',
    gridPosition: {
      order: -1,
      row: 10,
      screenColumns: {
        Large: 3,
        Medium: 3,
        Small: 3,
        XSmall: 3,
      },
    },
    colorIndex: 1,
    properties: {},
  },
};

// 'ntm-text-note-element': () =>
//   from(
//     import('./text-note/text-note.component').then((cmp) => ({
//       module: cmp.BlockNoteModule,
//       component: cmp.TextNoteComponent,
//     }))
//   ),
// 'ntm-text-note-element-view': () =>
//   from(
//     import('./text-note/text-note.component').then((cmp) => ({
//       module: cmp.BlockNoteModule,
//       component: cmp.TextNoteViewComponent,
//     }))
//   ),
// 'ntm-code-note-element': () =>
//   from(
//     import('./code-note/code-note.component').then((cmp) => ({
//       module: cmp.CodeNoteModule,
//       component: cmp.CodeNoteComponent,
//     }))
//   ),
// 'ntm-code-note-element-view': () =>
//   from(
//     import('./code-note/code-note.component').then((cmp) => ({
//       module: cmp.CodeNoteModule,
//       component: cmp.CodeNoteViewComponent,
//     }))
//   ),
