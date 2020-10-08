import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../services/data.service';
import { ArtBoardItem, Board, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { getCurrentDate, uuid } from '../services/utils';
import { tap, timeout } from 'rxjs/operators';
import { DEFAULT_EXTENSION_ID, extensionDefaultProperties } from '../extension-config';
import { ExtensionId } from '../extension-id';
import { NBR_COLORS } from '../extension-config';
import cloneDeep from 'lodash-es/cloneDeep';
import { DataChangeEvent } from '../store/models/data-change-event';
import '@cff/webcomponents/components/quill-editor/quill-editor.component.js';
@Component({
  selector: 'ntm-mainboard',
  templateUrl: './main-board.component.html',
  styleUrls: ['./main-board.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ntm-mainboard',
  },
})
export class MainBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  mainContainerOverlap = false;
  items$: Observable<ArtBoardItem[]>;
  searchItems$: Observable<ArtBoardItem[]>;
  showSearchResults = false;
  private minOrder = 0;

  displayBoard: Board = {
    id: DEFAULT_BOARD_ID,
    name: 'Default',
    type: 'ArtBoard',
  };

  test = {
    ops: [
      { insert: 'Minas Tirith' },
      { attributes: { header: 2 }, insert: '\n' },
      {
        insert:
          '\nPippin looked out from the shelter of Gandalf cloak. He wondered if he was awake or still sleeping, still in the swift-moving dream in which he had been wrapped so long since the great ride began. ',
      },
      { attributes: { bold: true }, insert: 'The dark world was rushing by and the wind' },
      {
        insert:
          ' sang loudly in his ears. He could see nothing but the wheeling stars, and away to his right vast shadows against the sky where the mountains of the South marched past. Sleepily he tried to reckon the times and stages of their journey, ',
      },
      { attributes: { color: '#ffff00' }, insert: 'but his memory was drowsy and uncertain' },
    ],
  };
  constructor(private ngZone: NgZone, private cd: ChangeDetectorRef, private dataService: DataService) {
    this.items$ = dataService.getArtBoardItems(DEFAULT_BOARD_ID).pipe(
      tap((items) => {
        this.minOrder = items.length > 0 ? Math.min(...items.map((item) => item.gridPosition?.order ?? 0)) : 0;
      })
    );
    this.searchItems$ = this.dataService.getSearchResults();
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  ngAfterViewInit(): void {}

  newNote(extensionId: ExtensionId = DEFAULT_EXTENSION_ID): void {
    const defaultProperties = cloneDeep(extensionDefaultProperties[extensionId]);
    const newArtBoardItem: ArtBoardItem = {
      ...defaultProperties,
      id: uuid(),
      modifiedDate: getCurrentDate(),
      boardId: DEFAULT_BOARD_ID,
    };
    if (extensionId === DEFAULT_EXTENSION_ID) {
      newArtBoardItem.colorIndex = Math.floor(Math.random() * NBR_COLORS);
    }

    newArtBoardItem.gridPosition.order = this.minOrder - 1;
    this.dataService.addArtBoardItem(newArtBoardItem);
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
  }

  trackByItemId(index: number, item: ArtBoardItem): string {
    return item.id;
  }

  navbarOverlappedHandler(overlapped: boolean): void {
    this.mainContainerOverlap = overlapped;
    this.cd.markForCheck();
  }

  getItemData(itemDataId: string): Observable<ItemData> {
    return this.dataService.getItemData(itemDataId);
  }

  onItemDataChange(id: string, { data, dataType }: DataChangeEvent): void {
    this.dataService.updateDataItem(id, data, dataType);
  }

  onChangeLayoutHandle(event: any): void {
    this.dataService.changeAllArtBoardItemPosition(
      event.detail.map((item) => {
        return {
          artBoardItemId: item.id,
          gridPosition: {
            screenColumns: item.screenColumns,
            rows: item.rows,
            order: item.order,
          },
        };
      })
    );
  }

  onItemChangeBackground(id: string, colorIndex: number): void {
    this.dataService.changeArtBoardItemColorIndex(id, colorIndex);
  }

  searchArtBoardItem(query: string): void {
    this.dataService.searchArtBoardItem(query);
  }

  searchInputAcitve(event: any): void {
    this.showSearchResults = true;
  }

  searchInputInactive(event: any): void {
    setTimeout(() => {
      this.showSearchResults = false;
      this.cd.markForCheck();
    }, 200);
  }
  onSelectSearchItem(item: ArtBoardItem): void {
    if (!item.boardId) {
      this.dataService.showArtBoardItem(item, this.minOrder - 1);
    }
  }
  hideArtboardItem(item: ArtBoardItem): void {
    this.dataService.hideArtBoardItem(item);
  }
}
