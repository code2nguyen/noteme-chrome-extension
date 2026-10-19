import type { NoteKind } from '../board/older-notes';
import type { MessageKey } from './messages';

/** A kind of note as shown: `t(kindKey(kind))` reads "Page", « Page », "Trang". */
export function kindKey(kind: NoteKind): MessageKey {
  return KIND_KEYS[kind];
}

/** What a note of that kind with nothing written in it is called: "Untitled page", « Page sans titre »… */
export function untitledKey(kind: NoteKind): MessageKey {
  return UNTITLED_KEYS[kind];
}

const KIND_KEYS: Record<NoteKind, MessageKey> = {
  Note: 'common.note',
  Page: 'common.page',
  Flow: 'common.flow',
  List: 'common.list',
  Sheet: 'common.sheet',
};

const UNTITLED_KEYS: Record<NoteKind, MessageKey> = {
  Note: 'common.untitled.note',
  Page: 'common.untitled.page',
  Flow: 'common.untitled.flow',
  List: 'common.untitled.list',
  Sheet: 'common.untitled.sheet',
};
