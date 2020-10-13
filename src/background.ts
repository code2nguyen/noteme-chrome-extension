// import Fuse from 'fuse.js';
// import { IndexableItemTypes, getText } from './app/services/utils';

// chrome.runtime.onInstalled.addListener(() => {
//   indexDB();
// });

// chrome.runtime.onStartup.addListener(() => {
//   indexDB();
// });

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

// // function syncChromeSyncToLocal() {
// // chrome.storage.sync.get(null, (remoteItems) => {
// //   chrome.storage.local.get(null, (localItems) => {
// //     // console.log(remoteItems, localItems);
// //     // TODO
// //   });
// // });
// // }
