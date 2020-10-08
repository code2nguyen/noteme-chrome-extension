import { v4 } from 'uuid';
import { ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';

export function uuid(): string {
  return v4();
}

export function getCurrentDate(): string {
  return new Date().toISOString();
}

export function createEmptyItemData(id: string): ItemData {
  return {
    id,
    data: null,
    createdDate: getCurrentDate(),
    modifiedDate: getCurrentDate(),
    empty: true,
    dataType: DataType.NA,
  };
}

export function getElementDataAction(element: HTMLElement): string {
  return element.dataset.action || '';
}

export function getElementDataActionDelay(element: HTMLElement): boolean {
  return !!element.dataset.actionDelay || false;
}

export function isNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input != null;
}

export function convertItemData(itemData: ItemData, toType: DataType): ItemData {
  let data = itemData.data;
  if (!data) {
    return itemData;
  }
  switch (itemData.dataType) {
    case DataType.DELTA: {
      if (toType === DataType.TEXT) {
        data = convertDelta2Text(data);
      }
      break;
    }
    case DataType.TEXT: {
      if (toType === DataType.DELTA) {
        data = convertText2Delta(data);
      }
      break;
    }
  }
  return { ...itemData, ...{ data, dataType: toType } };
}

function convertDelta2Text(data: any): string {
  return data.ops
    .filter((op: any) => typeof op.insert === 'string')
    .map((op: any) => op.insert)
    .join('');
}

function convertText2Delta(data: any): any {
  const lines = data.split('\n');
  const ops = [];
  for (const line of lines) {
    ops.push(
      {
        insert: line,
      },
      {
        insert: '\n',
        attributes: { 'code-block': true },
      }
    );
  }

  return {
    ops,
  };
}

export function getText(data: any, type: string): string {
  let text = '';
  if (type === 'html') {
    text = data.replace(/<[^>]+>/g, '');
  } else if (type === 'delta') {
    text = data.ops
      .filter((op: any) => typeof op.insert === 'string')
      .map((op: any) => op.insert)
      .join('');
  } else if (type === 'text') {
    text = data;
  }
  return text;
}
export const IndexableItemTypes = ['text', 'html', 'delta'];

export function hasProperty(context: any, name: string): boolean {
  if (name in context) {
    return true;
  }

  const prototype = Object.getPrototypeOf(context);

  if (prototype) {
    return hasProperty(prototype, name);
  }

  return false;
}

export function getObjectPropertyValue(target: any, property: string): any {
  let currentValue = target;
  for (const propertyName of property.split('.')) {
    currentValue = currentValue[propertyName] || {};
  }
  return currentValue;
}
