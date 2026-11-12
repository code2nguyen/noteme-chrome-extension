import type { Catalog } from './index';
import type { Translation } from './types';
import { commonVi } from './common.vi';
import { settingsVi } from './settings.vi';
import { homeVi } from './home.vi';
import { boardVi } from './board.vi';
import { archiveVi } from './archive.vi';
import { viewsVi } from './views.vi';

/** Every message in Vietnamese: a module of its own, loaded only when Noteme speaks it (`loadCatalog`). */
export const vi: Translation<Catalog> = { ...commonVi, ...settingsVi, ...homeVi, ...boardVi, ...archiveVi, ...viewsVi };
