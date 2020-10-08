import { from, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ExtensionId } from './extension-id';
import { ExtensionConfig } from './store/models/extension-model';
import { ArtBoardItem } from './store/models';
import { DataType } from './store/models/data-type';

export const NBR_COLORS = 13;
export const DEFAULT_EXTENSION_ID = ExtensionId.TextNote;

type DefaultExtensionProperties = {
  [extensionId: string]: Pick<ArtBoardItem, 'extensionId' | 'colorIndex' | 'gridPosition' | 'properties'>;
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
    viewComponent: {
      properties: [
        {
          name: 'readonly',
          value: 'true',
        },
        {
          name: 'format',
          value: 'object',
        },
      ],
    },
  },
};

export const extensionDefaultProperties: DefaultExtensionProperties = {
  [ExtensionId.TextNote]: {
    extensionId: ExtensionId.TextNote,
    gridPosition: {
      order: -1,
      rows: 10,
      screenColumns: {
        Large: 3,
        Medium: 3,
        Small: 3,
        XSmall: 1,
      },
    },
    colorIndex: 1,
    properties: {},
  },
};
