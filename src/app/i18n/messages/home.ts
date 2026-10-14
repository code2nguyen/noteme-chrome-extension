import type { Translation } from './types';

/** Home: the bar, search, shortcuts, the clock, the quote and the notes carousel. */
export const homeEn = {
  'home.logo': 'Noteme home',
  'home.plan': 'Plan',
  'home.search': 'Search my notes',
  'home.sites': 'Your most visited sites',
  'home.sites.allow': 'Show my most visited sites',
  'home.sites.later': 'Not now',
  'home.photo.noteme': 'Photo from Noteme',
  'home.photo.by': (artist: string) => `Photo by ${artist}`,
  'home.clock.open': 'Open my notes',
  'home.notes': 'Your notes',
  'home.notes.previous': 'Previous note',
  'home.notes.next': 'Next note',
  'home.notes.slide': '{index} of {count}',
  'home.notes.open': (title: string) => `${title}, open in Notes`,
  'home.notes.pinned': 'Pinned',
  'home.notes.none': 'No pinned notes yet. Pin one in Notes to see it here.',
};

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

export const homeVi: Translation<typeof homeEn> = {
  'home.logo': 'Trang chủ Noteme',
  'home.plan': 'Kế hoạch',
  'home.search': 'Tìm trong ghi chú',
  'home.sites': 'Các trang bạn hay truy cập nhất',
  'home.sites.allow': 'Hiện các trang tôi hay truy cập nhất',
  'home.sites.later': 'Để sau',
  'home.photo.noteme': 'Ảnh của Noteme',
  'home.photo.by': (artist: string) => `Ảnh: ${artist}`,
  'home.clock.open': 'Mở ghi chú của tôi',
  'home.notes': 'Ghi chú của bạn',
  'home.notes.previous': 'Ghi chú trước',
  'home.notes.next': 'Ghi chú sau',
  'home.notes.slide': '{index}/{count}',
  'home.notes.open': (title: string) => `${title}, mở trong Ghi chú`,
  'home.notes.pinned': 'Đã ghim',
  'home.notes.none': 'Chưa có ghi chú nào được ghim. Ghim một ghi chú trong Ghi chú để thấy nó ở đây.',
};
