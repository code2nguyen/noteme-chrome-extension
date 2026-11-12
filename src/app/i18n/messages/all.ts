import type { Language } from '../language';
import { fr } from './fr';
import { addCatalog, Catalog, en } from './index';
import type { Translation } from './types';
import { vi } from './vi';

/**
 * Every language at once, for code that cannot wait for one to load: the background worker, and the tests. Importing
 * this module makes `message` speak them all. The app never imports it: it reads a language when it is spoken.
 */
export const CATALOGS: Record<Language, Translation<Catalog>> = { en, fr, vi };

addCatalog('fr', fr);
addCatalog('vi', vi);
