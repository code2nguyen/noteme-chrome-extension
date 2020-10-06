export interface User {
  noteType: string;
  language: string;
}

export const initialUser: User = { noteType: 'ntm-text-note-element', language: 'markdown' };
