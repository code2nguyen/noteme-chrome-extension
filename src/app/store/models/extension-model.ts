import { ExtensionId } from '../../extension-id';
import { DataType } from './data-type';

export interface ExtensionProperty {
  name: string;
  value: string;
}
interface ExtensionEvent {
  event: string;
  propertyName: string;
  dataItemPropertyName: string;
}

export interface ExtensionConfig {
  extensionId: ExtensionId;
  element?: string;
  staticProperties: ExtensionProperty[];
  events: ExtensionEvent[];
  dataBindings: Array<{ propertyName: string; dataItemPropertyName: string }>;
  dataType: DataType;
  toolbarComponent:
    | {
        element?: string;
        dataBindings?: Array<{ propertyName: string; dataItemPropertyName: string }>;
      }
    | false;
  viewComponent: Omit<Partial<ExtensionConfig>, 'extensionId' | 'events' | 'toolbarComponent'> | false;
}
