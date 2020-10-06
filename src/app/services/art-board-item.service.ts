import { Injectable } from '@angular/core';
import { ArtBoardItem, DEFAULT_BOARD_ID } from '../store/models';
import { AppState, selectArtBoardItemsByBoardId, selectItemDataById } from '../store/reducers';
import { Store, select } from '@ngrx/store';
import { ArtBoardItemActions } from '../store/actions';
import { take } from 'rxjs/operators';
import { ExtensionsService } from './extensions.service';
@Injectable({ providedIn: 'root' })
export class ArtBoardItemService {
  constructor(private store: Store<AppState>, private extensionsService: ExtensionsService) {}

  toggleStarState(artBoardItem: ArtBoardItem) {
    this.updateArtBoardItem({ ...artBoardItem, ...{ starred: !artBoardItem.starred } });
  }

  changeArtBoardItemProperties(properties: { [key: string]: any }, artBoardItem: ArtBoardItem) {
    const boardProperties = { ...artBoardItem.properties, ...properties };
    this.updateArtBoardItem({ ...artBoardItem, ...{ properties: boardProperties } });
  }

  addArtBoardItem(artBoardItem: ArtBoardItem) {
    this.store.dispatch(ArtBoardItemActions.createArtBoardItem({ artBoardItem }));
  }

  changeArtBoardItemType(artBoardItem: ArtBoardItem) {
    const changedDataType = this.extensionsService.getNoteDataType(artBoardItem.element);
    this.store.dispatch(ArtBoardItemActions.changeArtBoardItemType({ artBoardItem, changedDataType }));
  }

  updateArtBoardItem(artBoardItem: ArtBoardItem) {
    this.store.dispatch(ArtBoardItemActions.updateArtBoardItem({ artBoardItem }));
  }

  removeArtBoardItem(artBoardItem: ArtBoardItem) {
    this.store.dispatch(
      ArtBoardItemActions.deleteArtBoardItem({ boardId: artBoardItem.boardId, artBoardItemId: artBoardItem.id })
    );
  }

  hideArtBoardItem(artBoardItem: ArtBoardItem) {
    if (!artBoardItem.boardId) {
      return;
    }

    this.store
      .pipe(select(selectItemDataById, { itemDataId: artBoardItem.id }))
      .pipe(take(1))
      .subscribe((data) => {
        if (!data || data.empty) {
          this.removeArtBoardItem(artBoardItem);
        } else {
          this.store.dispatch(
            ArtBoardItemActions.hideArtBoardItem({ boardId: artBoardItem.boardId!, artBoardItemId: artBoardItem.id })
          );
        }
      });
  }

  removeZIndexOfOverlapItems(artBoardItem: ArtBoardItem, boardId: string = DEFAULT_BOARD_ID) {
    this.store.pipe(select(selectArtBoardItemsByBoardId, { boardId }), take(1)).subscribe((artBoardItems) => {
      const collisionItems = artBoardItems.filter(
        (item) =>
          item.id !== artBoardItem.id && this._isIntersecting(item, artBoardItem) && item.properties.zIndex !== 0
      );
      for (const item of collisionItems) {
        this.updateArtBoardItem(this._changeZIndex(item, 0));
      }
    });
  }

  private _changeZIndex(item: ArtBoardItem, zIndex: number): ArtBoardItem {
    return {
      ...item,
      ...{
        properties: { ...item.properties, ...{ zIndex } },
      },
    };
  }

  private _isIntersecting(item1: ArtBoardItem, item2: ArtBoardItem): boolean {
    const layout1 = item1.layout;
    const layout2 = item2.layout;
    return (
      Math.max(layout1.left, layout2.left) <= Math.min(layout1.left + layout1.width, layout2.left + layout2.width) &&
      Math.max(layout1.top, layout2.top) <= Math.min(layout1.top + layout1.height, layout2.top + layout2.height)
    );
  }
}
