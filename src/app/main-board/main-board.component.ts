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
import { ArtBoardItem, Board, DEFAULT_BOARD_ID } from '../store/models';
import { getCurrentDate, uuid } from '../services/utils';
import { tap } from 'rxjs/operators';
import { DEFAULT_EXTENSION_ID, extensionDefaultProperties } from '../extension-config';
import { ExtensionId } from '../extension-id';
import { NBR_COLORS } from '../extension-config';
import cloneDeep from 'lodash-es/cloneDeep';

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
  @ViewChild('addButton') addButton!: ElementRef;
  @ViewChild('addMenu') addMenu!: ElementRef;

  mainContainerOverlap = false;
  items$: Observable<ArtBoardItem[]>;

  private mousePressTime = 0;
  private minOrder = 0;

  displayBoard: Board = {
    id: DEFAULT_BOARD_ID,
    name: 'Default',
    type: 'ArtBoard',
  };

  constructor(private ngZone: NgZone, private cd: ChangeDetectorRef, private dataService: DataService) {
    this.items$ = dataService.getArtBoardItems(DEFAULT_BOARD_ID).pipe(
      tap((items) => {
        this.minOrder = items.length > 0 ? Math.min(...items.map((item) => item.gridPosition?.order ?? 0)) : 0;
      })
    );
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  ngAfterViewInit(): void {
    this.addMenu.nativeElement.anchor = this.addButton.nativeElement;
  }

  onAddButtonMouseDown(): void {
    this.mousePressTime = new Date().getTime();
  }

  onButtonMouseUp(): void {
    const currentTime = new Date().getTime();
    console.log(currentTime - this.mousePressTime);
    if (currentTime - this.mousePressTime > 400) {
      this.addMenu.nativeElement.show();
      return;
    } else {
      this.newNote();
    }
  }

  onSelectedNoteType(event: any): void {
    console.log(event);
  }

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
  }

  trackByItemId(item: ArtBoardItem): string {
    return item.id;
  }

  navbarOverlappedHandler(overlapped: boolean): void {
    this.mainContainerOverlap = overlapped;
    this.cd.markForCheck();
  }
}
