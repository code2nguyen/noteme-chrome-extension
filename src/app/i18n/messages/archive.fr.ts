import type { archiveEn } from './archive';
import type { Translation } from './types';

/** French plural: 0 and 1 are singular. */
const frPlural = (count: number, one: string, many: string) => (count > 1 ? many : one);

export const archiveFr: Translation<typeof archiveEn> = {
  'archive.selectAll': 'Sélectionner toutes les notes affichées',
  'archive.kinds': 'Type de note',
  'archive.filter.all': (count) => `Tout · ${count}`,
  'archive.filter.note': (count) => `Notes · ${count}`,
  'archive.filter.page': (count) => `Feuilles · ${count}`,
  'archive.filter.flow': (count) => `Flux · ${count}`,
  'archive.filter.list': (count) => `À faire · ${count}`,
  'archive.filter.sheet': (count) => `Feuilles de calcul · ${count}`,
  'archive.sortBy': 'Trier par',
  'archive.sort.archived': 'Date d’archivage',
  'archive.sort.edited': 'Date de modification',
  'archive.sort.name': 'Nom',
  'archive.none.note': 'Aucune note archivée ici.',
  'archive.none.page': 'Aucune feuille archivée ici.',
  'archive.none.flow': 'Aucun flux archivé ici.',
  'archive.none.list': 'Aucun À faire archivé ici.',
  'archive.none.sheet': 'Aucune feuille de calcul archivée ici.',
  'archive.list': 'Notes archivées',
  'archive.select': (label) => `Sélectionner « ${label} »`,
  'archive.selected': (count) => frPlural(count, `${count} sélectionnée`, `${count} sélectionnées`),
  'archive.restore': 'Restaurer',
  'archive.meta.edited': (name, kind) => `${name} · modifié${kind === 'Flow' || kind === 'Sheet' ? '' : 'e'}`,
  'archive.meta.archived': (date, kind) => `· archivé${kind === 'Flow' || kind === 'Sheet' ? '' : 'e'} le ${date}`,
  'archive.restoreToBoard': 'Remettre sur le tableau',
  'archive.open': 'Ouvrir',
  'archive.deleteForever': 'Supprimer définitivement',
  'archive.resize': 'Redimensionner la liste',
  'archive.confirm.one': (title) => `Supprimer « ${title} » définitivement ?`,
  'archive.confirm.many': (count) =>
    frPlural(
      count,
      `Supprimer ${count} note archivée définitivement ?`,
      `Supprimer ${count} notes archivées définitivement ?`,
    ),
  'archive.confirm.text': () => 'Cette action est irréversible.',
};
