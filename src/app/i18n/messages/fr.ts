import type { Catalog } from './index';
import type { Translation } from './types';
import { commonFr } from './common.fr';
import { settingsFr } from './settings.fr';
import { homeFr } from './home.fr';
import { boardFr } from './board.fr';
import { archiveFr } from './archive.fr';
import { viewsFr } from './views.fr';

/** Every message in French: a module of its own, loaded only when Noteme speaks it (`loadCatalog`). */
export const fr: Translation<Catalog> = { ...commonFr, ...settingsFr, ...homeFr, ...boardFr, ...archiveFr, ...viewsFr };
