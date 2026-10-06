import { describe, expect, it } from 'vitest';
import { DataType } from './models/data-type';
import { mergeItemDataUpdates } from './item-data-updates';

describe('mergeItemDataUpdates', () => {
  it('keeps the text typed before a title change made within the debounce window', () => {
    expect(
      mergeItemDataUpdates([
        { id: 'a', data: 'Bus at 22:00', dataType: DataType.PAGE },
        { id: 'a', dataType: DataType.PAGE, properties: { title: 'Trip' } },
      ]),
    ).toEqual({ id: 'a', data: 'Bus at 22:00', dataType: DataType.PAGE, properties: { title: 'Trip' } });
  });

  it('lets the latest value win', () => {
    expect(
      mergeItemDataUpdates([
        { id: 'a', data: 'one' },
        { id: 'a', data: 'two' },
      ]).data,
    ).toBe('two');
  });
});
