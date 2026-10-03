// The c2 elements of the app shell and Home, the first thing every new tab shows. Each route and the settings sheet
// register their own elements when they load (board-elements.ts, settings-elements.ts, page-view.ts), so a new tab
// only loads what Home renders. Imported before bootstrap so Angular's first property binding lands on an upgraded
// element rather than on an unknown tag.
import '@c2n/button';
import '@c2n/icon-button';
import '@c2n/tooltip';

import '@c2n/feather-icons/icons/plus.js';
import '@c2n/feather-icons/icons/search.js';
import '@c2n/feather-icons/icons/settings.js';
