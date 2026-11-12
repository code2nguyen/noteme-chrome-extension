import type { commonEn } from './common';
import type { Translation } from './types';

export const commonFr: Translation<typeof commonEn> = {
  'common.note': 'Note',
  'common.page': 'Feuille',
  'common.flow': 'Flux',
  'common.list': 'À faire',
  'common.sheet': 'Feuille de calcul',
  'common.notes': 'Notes',
  'common.archive': 'Archives',
  'common.settings': 'Réglages',
  'common.cancel': 'Annuler',
  'common.undo': 'Annuler',
  'omnibox.search': (query: string) => `Rechercher ${query} dans Noteme`,
  'common.delete': 'Supprimer',
  'common.loading': 'Chargement…',
  'common.untitled.note': 'Note vide',
  'common.untitled.page': 'Feuille sans titre',
  'common.untitled.flow': 'Flux sans titre',
  'common.untitled.list': 'À faire sans titre',
  'common.untitled.sheet': 'Feuille de calcul sans titre',
  'common.nothingWritten': 'Rien d’écrit pour l’instant.',
  'common.image.tooLarge': 'Cette image est trop lourde : 10 Mo au plus.',
  'common.image.notImage': 'Seules des images peuvent être collées ou déposées ici.',
  'common.image.notSaved': 'L’image n’a pas pu être enregistrée sur cet appareil.',
};
