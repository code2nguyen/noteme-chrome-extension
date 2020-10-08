import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { DataService } from '../services/data.service';
import { ArtBoardItem, Board, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { getCurrentDate, uuid } from '../services/utils';
import { tap, timeout } from 'rxjs/operators';
import { DEFAULT_EXTENSION_ID, extensionDefaultProperties } from '../extension-config';
import { ExtensionId } from '../extension-id';
import { NBR_COLORS } from '../extension-config';
import cloneDeep from 'lodash-es/cloneDeep';
import { DataChangeEvent } from '../store/models/data-change-event';
import { Router } from '@angular/router';
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
  selectingSearchResult = false;
  highlightItem$ = new ReplaySubject<string>(1);

  private minOrder = 0;

  constructor(private router: Router, private cd: ChangeDetectorRef, private dataService: DataService) {
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
    this.showSearchResults = this.selectingSearchResult;
  }

  onSelectSearchItem(item: ArtBoardItem): void {
    this.showSearchResults = false;
    this.selectingSearchResult = false;
    if (!item.boardId) {
      this.dataService.showArtBoardItem(item, this.minOrder - 1);
    }
    this.highlightItem$.next(item.id);
  }

  hideArtboardItem(item: ArtBoardItem): void {
    this.dataService.hideArtBoardItem(item);
  }

  goGoWelcomePage(): void {
    this.router.navigate(['/']);
  }
}
