import { Injectable, ComponentFactory } from '@angular/core';

import { ExtensionLoader } from './extension-loader';
import { Observable } from 'rxjs';
import { NoteType, ArtBoardItem, DEFAULT_BOARD_ID } from '../store/models';
import { DataType } from '../store/models/data-type';
import { PaletteService } from './palette.service';
import { UserService } from './user.service';
import { uuid, getCurrentDate } from './utils';

@Injectable({ providedIn: 'root' })
export class ExtensionsService {
  constructor(
    private loader: ExtensionLoader,
    private paletteService: PaletteService,
    private userService: UserService
  ) {}

  get noteTypes(): NoteType[] {
    return [
      {
        name: 'Text',
        classIcon: 'icon-widget-text',
        element: 'ntm-text-note-element',
        properties: {
          color: this.paletteService.getRandomColor(),
        },
      },
      {
        name: 'Code',
        classIcon: 'icon-widget-code',
        element: 'ntm-code-note-element',
        properties: {
          color: '#282C34',
          language: 'markdown',
        },
      },
    ];
  }

  private readonly noteDataType: { [noteType: string]: DataType } = {
    'ntm-text-note-element': DataType.DELTA,
    'ntm-code-note-element': DataType.TEXT,
  };

  getNoteDataType(noteType: string): DataType {
    return this.noteDataType[noteType] || DataType.TEXT;
  }

  createNewNote(type?: string): Partial<ArtBoardItem> {
    type = type || this.userService.user.noteType;
    switch (type) {
      case 'ntm-code-note-element': {
        return {
          element: 'ntm-code-note-element',
          properties: {
            color: 0,
            language: this.userService.user.language || 'markdown',
          },
        };
      }
      case 'ntm-text-note-element':
      default: {
        return {
          element: 'ntm-text-note-element',
          properties: {
            color: this.paletteService.getRandomColor(),
          },
        };
      }
    }
  }

  changeNoteType(item: ArtBoardItem, noteType: NoteType): ArtBoardItem {
    return {
      ...item,
      ...{
        element: noteType.element,
        properties: { ...item.properties, ...(noteType.properties && noteType.properties) },
      },
    };
  }

  createRandomNote(): ArtBoardItem {
    return {
      ...{
        boardId: DEFAULT_BOARD_ID,
        id: uuid(),
        layout: {
          top: 16 + window.scrollY + ((Math.random() * 1000) % 50),
          left: window.scrollX + ((Math.random() * 1000) % 50),
          width: 280,
          height: 300,
        },
        element: '',
        properties: {},
        modifiedDate: getCurrentDate(),
      },
      ...this.createNewNote(),
    };
  }

  loadExtension(extensionId: string): Observable<ComponentFactory<any>> {
    return this.loader.getComponentFactory(extensionId);
  }

  loadExtensionView(extensionId: string): Observable<ComponentFactory<any>> {
    return this.loader.getComponentFactory(`${extensionId}-view`);
  }
}
