import { DataType } from './data-type';

export interface ItemData {
  id: string;
  // Delta objects (2.x text notes) and JSON values (2.x vocabulary notes) are normalised to strings on load.
  data: string | null;
  properties?: {
    /** Title of a page. */
    title?: string;
  };
  compressedData?: string;
  modifiedDate: string;
  createdDate: string;
  dataType: DataType;
  empty: boolean;
  sourceId?: string;
}
