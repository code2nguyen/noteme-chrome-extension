/** Kind of note shown in a board tile. The string values are persisted, so they never change. */
export enum ExtensionId {
  /** A quick note, written right on its card. */
  TextNote = 'ntm-text-note-element',
  /** A full page (c2-page-editor), opened full screen. */
  Page = 'ntm-page',
}
