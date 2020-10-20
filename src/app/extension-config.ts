import { from, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ExtensionId } from './extension-id';
import { ExtensionConfig } from './store/models/extension-model';
import { ArtBoardItem } from './store/models';
import { DataType } from './store/models/data-type';
import { oneAtomThemViewer } from '../app/components/monaco-viewer/monaco-viewer-theme';
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
      await import('@c2n/webcomponents/components/quill-editor/quill-editor.component.js');
      await import('@c2n/webcomponents/components/quill-editor-toolbar/quill-editor-toolbar.component.js');
      return true;
    }
  })(),
  [ExtensionId.CodeNote]: new (class CodeNoteLoader extends Loader<any> {
    async loadExtension(): Promise<any> {
      // @ts-ignore
      self.MonacoEnvironment = {
        // tslint:disable-next-line: only-arrow-functions
        getWorkerUrl(moduleId, label: string): string {
          if (label === 'json') {
            return './json.worker.js';
          }
          if (label === 'css') {
            return './css.worker.js';
          }
          if (label === 'html') {
            return './html.worker.js';
          }
          if (label === 'typescript' || label === 'javascript') {
            return './ts.worker.js';
          }
          return './editor.worker.js';
        },
      };
      const monaco = await import('monaco-editor');
      self.monaco = monaco;
      monaco.editor.defineTheme('Atom-One-Dark-Viewer', oneAtomThemViewer);
      monaco.editor.setTheme('Atom-One-Dark-Viewer');
      await import('./components/monaco-viewer/monaco-viewer.component');
      await import('@c2n/webcomponents/components/monaco-editor/monaco-editor.component.js');
      await import('@c2n/webcomponents/components/monaco-editor-toolbar/monaco-editor-toolbar.component.js');
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
    staticProperties: [
      {
        name: 'placeholder',
        value: 'New note...',
      },
      {
        name: 'format',
        value: 'object',
      },
    ],
    dataBindings: [{ propertyName: 'content', dataItemPropertyName: 'data' }],
    dataType: DataType.DELTA,
    events: [
      {
        event: 'content-change',
        propertyName: 'detail.content',
        dataItemPropertyName: 'data',
      },
    ],
    toolbarComponent: {
      element: 'cff-quill-editor-toolbar',
    },
    viewComponent: {
      staticProperties: [
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
  [ExtensionId.CodeNote]: {
    extensionId: ExtensionId.CodeNote,
    element: 'cff-monaco-editor',
    staticProperties: [
      {
        name: 'libPath',
        value: 'assets/monaco-editor/min/vs',
      },
    ],
    dataBindings: [
      { propertyName: 'value', dataItemPropertyName: 'data' },
      { propertyName: 'language', dataItemPropertyName: 'properties.language' },
    ],
    dataType: DataType.TEXT,
    events: [
      {
        event: 'value-changed',
        propertyName: 'detail',
        dataItemPropertyName: 'data',
      },
      {
        event: 'language-changed',
        propertyName: 'detail',
        dataItemPropertyName: 'properties.language',
      },
    ],
    toolbarComponent: {
      element: 'cff-monaco-editor-toolbar',
      dataBindings: [{ propertyName: 'language', dataItemPropertyName: 'properties.language' }],
    },
    viewComponent: {
      element: 'ntm-monaco-viewer',
      staticProperties: [],
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
  [ExtensionId.CodeNote]: {
    extensionId: ExtensionId.CodeNote,
    gridPosition: {
      order: -1,
      rows: 20,
      screenColumns: {
        Large: 6,
        Medium: 6,
        Small: 6,
        XSmall: 1,
      },
    },
    colorIndex: 0,
    properties: {},
  },
};
