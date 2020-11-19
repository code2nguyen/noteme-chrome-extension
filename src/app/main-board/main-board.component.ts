import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { BehaviorSubject, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { DataService } from '../services/data.service';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { getCurrentDate, uuid } from '../services/utils';
import { map, switchMap, takeUntil, tap, timeout } from 'rxjs/operators';
import { DEFAULT_EXTENSION_ID, extensionDefaultProperties } from '../extension-config';
import { ExtensionId } from '../extension-id';
import { NBR_COLORS } from '../extension-config';
import cloneDeep from 'lodash-es/cloneDeep';
import { Router } from '@angular/router';
import { DeviceSyncService } from '../services/device-sync.service';
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
  highlightItem$ = new Subject<string>();
  focusItem$ = new ReplaySubject<string>(1);
  selectedTab = 'Notes';
  searchQuery$ = new BehaviorSubject<string>('');
  isSearching$: Observable<boolean>;
  inNoteTab = true;
  synchronizedStatus$: Observable<number>;
  @ViewChild('dashboardLayout', { static: true }) dashboardLayoutRed: ElementRef;

  private minOrder = 0;
  private destroyed$ = new Subject<void>();
  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private deviceSync: DeviceSyncService
  ) {
    this.setupNotesDataStream();
  }

  ngOnInit(): void {
    this.searchQuery$.pipe(takeUntil(this.destroyed$)).subscribe((query) => {
      this.dataService.searchArtBoardItem(query);
    });
    this.isSearching$ = this.dataService.selectArtBoardItemSearchLoading();
    this.synchronizedStatus$ = this.deviceSync.synState$;
    this.deviceSync.sync();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

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
      this.focusItem$.next(newArtBoardItem.id);
    }, 0);
  }

  handleToolbarMenuItemSelected(index: number): void {
    if (index === 1) {
      this.newNote(ExtensionId.CodeNote);
    } else if (index === 2) {
      this.newNote(ExtensionId.Vocabulary);
    }
  }

  removeArtBoardItem(item: ArtBoardItem): void {
    this.dataService.removeArtBoardItem(item);
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

  onItemDataChange(itemData: Partial<ItemData>): void {
    this.dataService.updateDataItem(itemData);
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
    this.searchQuery$.next(query);
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

  toggleArchiveArtboardItem(item: ArtBoardItem): void {
    if (this.inNoteTab) {
      this.dataService.hideArtBoardItem(item);
    } else {
      this.dataService.showArtBoardItem(item, item.gridPosition?.order || 0);
    }
  }

  reDeviceSync(): void {
    this.deviceSync.sync();
  }

  goGoWelcomePage(): void {
    this.router.navigate(['/']);
  }

  changeTab(tab: string): void {
    this.selectedTab = tab;
    this.searchQuery$.next('');
    this.dashboardLayoutRed.nativeElement.disableFirstRenderAnimation = true;
    switch (tab) {
      case 'Archive':
        this.inNoteTab = false;
        this.setupArchiveDataStream();

        break;

      default:
        this.inNoteTab = true;
        this.setupNotesDataStream();
        break;
    }
  }

  private setupNotesDataStream(): void {
    this.items$ = this.dataService.getArtBoardItems(DEFAULT_BOARD_ID).pipe(
      tap((items) => {
        this.minOrder = items.length > 0 ? Math.min(...items.map((item) => item.gridPosition?.order ?? 0)) : 0;
      })
    );
    this.searchItems$ = this.dataService.getSearchResults();
  }

  private setupArchiveDataStream(): void {
    this.searchItems$ = of([]);
    this.items$ = this.searchQuery$.pipe(
      switchMap((query) => {
        return query
          ? this.dataService.getSearchResults().pipe(map((items) => items.filter((item) => !item.boardId)))
          : this.dataService.getArchivedArtBoardItems().pipe(
              map((items) => {
                return items.sort((a, b) =>
                  (a.dataModifiedDate || a.modifiedDate).localeCompare(b.dataModifiedDate || b.modifiedDate)
                );
              })
            );
      })
    );
  }
}
