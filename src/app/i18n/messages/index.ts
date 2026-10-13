import type { Language } from '../language';
import { commonEn, commonFr, commonVi } from './common';
import { settingsEn, settingsFr, settingsVi } from './settings';
import { homeEn, homeFr, homeVi } from './home';
import { boardEn, boardFr, boardVi } from './board';
import { archiveEn, archiveFr, archiveVi } from './archive';
import { viewsEn, viewsFr, viewsVi } from './views';
import type { Translation } from './types';

/** Every message in English, the source the other languages are typed against. Each area adds its record here. */
export const en = { ...commonEn, ...settingsEn, ...homeEn, ...boardEn, ...archiveEn, ...viewsEn };

export type Catalog = typeof en;
export type MessageKey = keyof Catalog;
/** The values a message takes: none for a string, the function's own for a function. */
export type MessageArgs<K extends MessageKey> = Catalog[K] extends (...args: infer A) => string ? A : [];

const fr: Translation<Catalog> = { ...commonFr, ...settingsFr, ...homeFr, ...boardFr, ...archiveFr, ...viewsFr };
const vi: Translation<Catalog> = { ...commonVi, ...settingsVi, ...homeVi, ...boardVi, ...archiveVi, ...viewsVi };

export const CATALOGS: Record<Language, Translation<Catalog>> = { en, fr, vi };
