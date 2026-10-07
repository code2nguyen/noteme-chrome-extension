// The c2 elements of the board, loaded with its route.
import '@c2n/components/accordion';
import '@c2n/components/autocomplete';
import '@c2n/components/badge';
import '@c2n/components/border-beam';
import '@c2n/components/button-group';
import '@c2n/components/checkbox';
import '@c2n/components/details';
import '@c2n/components/list';
import '@c2n/components/list-item';
import '@c2n/components/masonry';
import '@c2n/components/masonry/masonry-item';
import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';
import '@c2n/components/modal';
import { loadNotepadFont } from '@c2n/components/notepad';
import '@c2n/components/search-field';
import '@c2n/components/sheet';
import '@c2n/components/spinner';
import '@c2n/components/split-panel';
import '@c2n/components/status-panel';
import '@c2n/components/toast';

import '@c2n/phosphor-icons/icons/push-pin.js';
import '@c2n/phosphor-icons/icons/push-pin-slash.js';
import '@c2n/symbols/symbols/archive.js';
import '@c2n/symbols/symbols/create-new.js';
import '@c2n/symbols/symbols/no-results.js';

import '@c2n/feather-icons/icons/archive.js';
import '@c2n/feather-icons/icons/chevron-down.js';
import '@c2n/feather-icons/icons/clock.js';
import '@c2n/feather-icons/icons/edit-3.js';
import '@c2n/feather-icons/icons/file-text.js';
import '@c2n/feather-icons/icons/more-vertical.js';
import '@c2n/feather-icons/icons/move.js';
import '@c2n/feather-icons/icons/rotate-ccw.js';
import '@c2n/feather-icons/icons/share-2.js';
import '@c2n/feather-icons/icons/trash-2.js';
import '@c2n/feather-icons/icons/x.js';

// A notepad asks for its handwriting face only if its writing surface resolves to it on first render, but a note's
// first render comes before its masonry tile slots it, when the surface has no computed style yet: load it here.
void loadNotepadFont();
