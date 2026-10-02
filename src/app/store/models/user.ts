import { ExtensionId } from '../../extension-id';

export interface User {
  noteType: string;
  language: string;
}

export const initialUser: User = { noteType: ExtensionId.TextNote, language: 'markdown' };
