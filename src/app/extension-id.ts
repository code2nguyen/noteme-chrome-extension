/** Kind of note shown in a board tile. The string values are persisted, so they never change. */
export enum ExtensionId {
  TextNote = 'ntm-text-note-element',
  CodeNote = 'ntm-code-note-element',
}

/** Note type removed in 3.0. Stored notes of this kind are opened as JSON code notes. */
export const LEGACY_VOCABULARY_EXTENSION_ID = 'vocabulary-extension';
