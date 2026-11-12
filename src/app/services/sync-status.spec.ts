import { describe, expect, it } from 'vitest';
import { parseSyncStatus, syncError, syncErrorKind } from './sync-status';

describe('syncErrorKind', () => {
  it('tells a full storage from one taking no more writes for now', () => {
    expect(syncErrorKind('QUOTA_BYTES quota exceeded')).toBe('full');
    expect(syncErrorKind('QUOTA_BYTES_PER_ITEM quota exceeded')).toBe('full');
    expect(syncErrorKind('MAX_ITEMS quota exceeded')).toBe('full');
    expect(syncErrorKind('This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.')).toBe('busy');
    expect(syncErrorKind('MAX_WRITE_OPERATIONS_PER_HOUR quota exceeded')).toBe('busy');
    expect(syncErrorKind('The browser is shutting down.')).toBe('other');
  });
});

describe('syncError', () => {
  it("keeps Chrome's words, whatever was thrown", () => {
    expect(syncError(new Error('QUOTA_BYTES quota exceeded'), 5)).toEqual({
      kind: 'full',
      detail: 'QUOTA_BYTES quota exceeded',
      at: 5,
    });
    expect(syncError({ message: 'Sync is off' }, 5)).toEqual({ kind: 'other', detail: 'Sync is off', at: 5 });
    expect(syncError('failed', 5).detail).toBe('failed');
  });
});

describe('parseSyncStatus', () => {
  it('reads the stored record', () => {
    const status = { at: 10, error: { kind: 'busy', detail: 'MAX_WRITE_OPERATIONS_PER_MINUTE', at: 12 } };
    expect(parseSyncStatus(JSON.stringify(status))).toEqual(status);
    expect(parseSyncStatus(JSON.stringify({ at: 10 }))).toEqual({ at: 10 });
  });

  it('reads nothing stored, or a corrupt record, as never synced', () => {
    expect(parseSyncStatus(undefined)).toEqual({});
    expect(parseSyncStatus('{not json')).toEqual({});
    expect(parseSyncStatus(JSON.stringify({ at: 'yesterday', error: 'bad' }))).toEqual({});
    expect(parseSyncStatus(JSON.stringify({ error: { kind: 'odd', detail: 'x' } }))).toEqual({
      error: { kind: 'other', detail: 'x', at: 0 },
    });
  });
});
