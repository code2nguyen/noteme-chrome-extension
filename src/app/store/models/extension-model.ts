import { ExtensionId } from '../../extension-id';
import { DataType } from './data-type';

export interface ExtensionProperty {
  name: string;
  value: string;
}
interface ExtensionEvent {
  event: string;
  propertyName: string;
  dataType: DataType;
}

export interface ExtensionConfig {
  extensionId: ExtensionId;
  element?: string;
  properties: ExtensionProperty[];
  dataChangeEvent: ExtensionEvent;
  dataInputProperty: string;
  toolbarComponent:
    | {
        element?: string;
      }
    | false;
  viewComponent: boolean;
}
