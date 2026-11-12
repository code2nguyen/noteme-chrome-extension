import type { NoteKind } from '../../board/older-notes';

/** The Archive: its list, filters, preview, selection and the delete confirmation. */
export const archiveEn = {
  'archive.selectAll': 'Select every note listed',
  'archive.kinds': 'Kind of note',
  'archive.filter.all': (count: number) => `All · ${count}`,
  'archive.filter.note': (count: number) => `Notes · ${count}`,
  'archive.filter.page': (count: number) => `Papers · ${count}`,
  'archive.filter.flow': (count: number) => `Flows · ${count}`,
  'archive.filter.list': (count: number) => `To do · ${count}`,
  'archive.filter.sheet': (count: number) => `Sheets · ${count}`,
  'archive.sortBy': 'Sort by',
  'archive.sort.archived': 'Recently archived',
  'archive.sort.edited': 'Recently edited',
  'archive.sort.name': 'Name',
  'archive.none.note': 'No archived note here.',
  'archive.none.page': 'No archived paper here.',
  'archive.none.flow': 'No archived flow here.',
  'archive.none.list': 'No archived to do here.',
  'archive.none.sheet': 'No archived sheet here.',
  'archive.list': 'Archived notes',
  'archive.select': (label: string) => `Select ${label}`,
  'archive.selected': (count: number) => `${count} selected`,
  'archive.restore': 'Restore',
  /** "Note · edited", before how long ago; the kind decides the agreement in French. */
  'archive.meta.edited': (name: string, _kind: NoteKind) => `${name} · edited`,
  /** "· archived Oct 3", after how long ago it was edited. */
  'archive.meta.archived': (date: string, _kind: NoteKind) => `· archived ${date}`,
  'archive.restoreToBoard': 'Restore to the board',
  'archive.open': 'Open',
  'archive.deleteForever': 'Delete forever',
  'archive.resize': 'Resize the list',
  'archive.confirm.one': (title: string) => `Delete “${title}” forever?`,
  'archive.confirm.many': (count: number) => `Delete ${count} archived notes forever?`,
  'archive.confirm.text': (count: number) => `${count === 1 ? 'It' : 'They'} can’t be brought back.`,
};
