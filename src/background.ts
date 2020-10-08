import * as lunr from 'lunr';
import { IndexableItemTypes, getText } from './app/services/utils';

chrome.runtime.onInstalled.addListener(() => {
  indexDB();
  syncChromeSyncToLocal();
});

chrome.runtime.onStartup.addListener(() => {
  indexDB();
  syncChromeSyncToLocal();
});

// chrome.alarms.onAlarm.addListener(alarm => {
//   if (alarm && alarm.name.startsWith('index__')) {
//     const id = parseInt(alarm.name.substr(7, alarm.name.length - 12), 0);
//     const isNew = alarm.name.substr(alarm.name.length - 5);
//     indexDB(id, isNew === '__new');
//   }
// });

// chrome.storage.onChanged.addListener(changes => {
//   for (const key in changes) {
//     if (key.startsWith('ITEM_DATA__')) {
//       const isNewValue = changes[key].oldValue ? false : true;
//       const id = key.substr(11);
//       scheduleIndexing(id, isNewValue);
//     }
//   }
// });

// chrome.identity.getAuthToken({ interactive: true }, function(token) {
//   console.log('got the token', token);
// });

// function scheduleIndexing(id: string, isNewValue: boolean) {
//   chrome.alarms.get(`index__${id}__new`, newAlarm => {
//     if (!newAlarm) {
//       chrome.alarms.get(`index__${id}_old`, oldAlarm => {
//         if (!oldAlarm) {
//           chrome.alarms.create(`index__${id}__${isNewValue ? 'new' : 'old'}`, { delayInMinutes: 1 });
//         }
//       });
//     }
//   });
// }

function indexDB() {
  chrome.storage.local.get(null, (items) => {
    const idx = lunr(function () {
      this.ref('id');
      this.field('text');
      for (const key in items) {
        if (key.startsWith('ITEM_DATA__') && items[key]) {
          const dataItem = JSON.parse(items[key]);
          if (IndexableItemTypes.includes(dataItem.dataType)) {
            this.add({ id: dataItem.id, text: getText(dataItem.data, dataItem.dataType) });
          }
        }
      }
    });
    chrome.storage.local.set({ _ITEM_DATA_INDEX: JSON.stringify(idx) });
  });
}

function syncChromeSyncToLocal() {
  chrome.storage.sync.get(null, (remoteItems) => {
    chrome.storage.local.get(null, (localItems) => {
      // console.log(remoteItems, localItems);
      // TODO
    });
  });
}
