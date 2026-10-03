/** Kind of note shown in a board tile. The string values are persisted, so they never change. */
export enum ExtensionId {
  /** A quick note, written right on its card. */
  TextNote = 'ntm-text-note-element',
  /** A full page (c2-page-editor), opened full screen. */
  Page = 'ntm-page',
}

/** Code notes (3.0 and 2.x). Read as a page holding one code block, and saved as a page once edited. */
export const LEGACY_CODE_NOTE_EXTENSION_ID = 'ntm-code-note-element';

/** Note type removed in 3.0. Stored notes of this kind are opened as a page with a JSON code block. */
export const LEGACY_VOCABULARY_EXTENSION_ID = 'vocabulary-extension';
