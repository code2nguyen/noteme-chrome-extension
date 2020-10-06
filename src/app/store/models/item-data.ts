import { DataType } from './data-type';

export interface ItemData {
  id: string;
  data: string | null;
  compressedData?: string;
  modifiedDate: string;
  createdDate: string;
  dataType: DataType;
  empty: boolean;
}
