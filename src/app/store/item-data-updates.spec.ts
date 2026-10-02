import { describe, expect, it } from 'vitest';
import { DataType } from './models/data-type';
import { mergeItemDataUpdates } from './item-data-updates';

describe('mergeItemDataUpdates', () => {
  it('keeps the code typed before a language change made within the debounce window', () => {
    expect(
      mergeItemDataUpdates([
        { id: 'a', data: 'const x = 1', dataType: DataType.TEXT, properties: { language: 'plaintext' } },
        { id: 'a', dataType: DataType.TEXT, properties: { language: 'javascript' } },
      ]),
    ).toEqual({ id: 'a', data: 'const x = 1', dataType: DataType.TEXT, properties: { language: 'javascript' } });
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
