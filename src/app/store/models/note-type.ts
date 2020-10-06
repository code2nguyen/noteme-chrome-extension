export interface NoteType {
  name: string;
  element: string;
  classIcon: string;
  properties?: {
    [key: string]: any;
  };
}
