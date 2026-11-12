import type { homeEn } from './home';
import type { Translation } from './types';

export const homeFr: Translation<typeof homeEn> = {
  'home.logo': 'Accueil Noteme',
  'home.plan': 'Agenda',
  'home.search': 'Rechercher dans mes notes',
  'home.sites': 'Vos sites les plus visités',
  'home.sites.allow': 'Afficher mes sites les plus visités',
  'home.sites.later': 'Plus tard',
  'home.photo.noteme': 'Photo de Noteme',
  'home.photo.by': (artist: string) => `Photo : ${artist}`,
  'home.clock.open': 'Ouvrir mes notes',
  'home.notes': 'Vos notes',
  'home.notes.previous': 'Note précédente',
  'home.notes.next': 'Note suivante',
  'home.notes.slide': '{index} sur {count}',
  'home.notes.open': (title: string) => `${title}, ouvrir dans Notes`,
  'home.notes.pinned': 'Épinglée',
  'home.notes.none': 'Aucune note épinglée pour l’instant. Épinglez-en une dans Notes pour la voir ici.',
};
