// import Fuse from 'fuse.js';
// import { IndexableItemTypes, getText } from './app/services/utils';

chrome.runtime.onInstalled.addListener(() => {
  // indexDB();
  // syncChromeSyncToLocal();
});

chrome.runtime.onStartup.addListener(() => {
  // indexDB();
  // syncChromeSyncToLocal();
});

syncChromeSyncToLocal();

// function indexDB(): void {
//   // tslint:disable-next-line: typedef
//   chrome.storage.local.get(null, function (items) {
//     const docs = [];
//     for (const key in items) {
//       if (key.startsWith('ITEM_DATA__') && items[key]) {
//         const dataItem = JSON.parse(items[key]);
//         if (IndexableItemTypes.includes(dataItem.dataType)) {
//           docs.push({ id: dataItem.id, text: getText(dataItem.data, dataItem.dataType) });
//         }
//       }
//     }
//     const fuse = Fuse.createIndex(['text'], docs);
//     chrome.storage.local.set({ _ITEM_DATA_INDEX: JSON.stringify(fuse.toJSON()) });
//   });
// }

/**
 * Sync algorithm
 * Remote => Local
 *  - Found =>
 *        remote modifiedDate > local modifieddate =>  update local, set trust = remote
 *  - Not found => add to local, set trust = remote
 * Local => Remote
 *  - Not found => if trust = remote => remove from local
 *
 */
async function syncChromeSyncToLocal(): Promise<any> {
  const remoteItems = (await get(chrome.storage.sync, null)) || {};
  const localItems = (await get(chrome.storage.local, null)) || {};
  const remoteKeys = Object.keys(remoteItems);
  const localKeys = Object.keys(localItems);
  for (const remoteKey of remoteKeys) {
    if (remoteKey.startsWith('ITEM_DATA__') || remoteKey.startsWith('ART_BOARD_ITEM__')) {
      const remoteData = jsonParse(remoteItems[remoteKey]);
      if (localKeys.includes(remoteKey)) {
        // update
        const localData = jsonParse(localItems[remoteKey]);
        if (
          remoteData.modifiedDate &&
          localData.modifiedDate &&
          getTime(remoteData.modifiedDate) > getTime(localData.modifiedDate)
        ) {
          remoteData.trust = 'remote';
          await set(chrome.storage.local, remoteKey, remoteData);
        }
      } else {
        // add
        if (remoteKey.startsWith('ART_BOARD_ITEM__')) {
          if (remoteData.boardId) {
            let artBoardArtBoardItemIds = await get(
              chrome.storage.local,
              `_ART_BOARD__ART_BOARD_ITEM_IDS__${remoteData.boardId}`
            );
            artBoardArtBoardItemIds = artBoardArtBoardItemIds || [];
            artBoardArtBoardItemIds.push(remoteData.id);
            await set(
              chrome.storage.local,
              `_ART_BOARD__ART_BOARD_ITEM_IDS__${remoteData.boardId}`,
              artBoardArtBoardItemIds
            );
          }

          let artBoardItemIds = await get(chrome.storage.local, `_ART_BOARD_ITEM__IDS`);
          artBoardItemIds = artBoardItemIds || [];
          artBoardItemIds.push(remoteData.id);
          await set(chrome.storage.local, `_ART_BOARD_ITEM__IDS`, artBoardItemIds);
        }
        remoteData.trust = 'remote';
        await set(chrome.storage.local, remoteKey, remoteData);
      }
    }
  }

  for (const localKey of localKeys) {
    if (!remoteKeys.includes(localKey)) {
      if (localKey.startsWith('ITEM_DATA__') || localKey.startsWith('ART_BOARD_ITEM__')) {
        const localData = jsonParse(localItems[localKey]);
        if (localData.trust === 'remote') {
          await remove(chrome.storage.local, localKey);
        }
      }
    }
  }
}

function getTime(value: string): number {
  return new Date(value).getTime();
}

function jsonParse(value: any): any {
  if (value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function set(storage: any, key: string, value: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const valueStr = JSON.stringify(value);
    storage.set({ [key]: valueStr }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
      resolve();
    });
  });
}

function get(storage: any, key: string | string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    storage.get(key, (value) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return resolve(null);
      }
      if (Array.isArray(key)) {
        resolve(key.map((itemKey) => jsonParse(value[itemKey])));
      } else {
        resolve(key ? jsonParse(value[key]) : value);
      }
    });
  });
}

function remove(storage: any, key: string | string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    storage.remove(key, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
      resolve(null);
    });
  });
}
