import { ExtensionId } from '../../extension-id';
import { DataType } from './data-type';

export interface ExtensionProperty {
  name: string;
  value: string;
}
interface ExtensionEvent {
  event: string;
  propertyName: string;
}

export interface ExtensionConfig {
  extensionId: ExtensionId;
  element?: string;
  properties: ExtensionProperty[];
  dataChangeEvent: ExtensionEvent;
  dataInputProperty: string;
  dataType: DataType;
  toolbarComponent:
    | {
        element?: string;
      }
    | false;
  viewComponent: boolean;
}
