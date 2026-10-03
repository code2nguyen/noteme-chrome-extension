import { describe, expect, it } from 'vitest';
import { editedLabel } from './utils';

describe('editedLabel', () => {
  const now = new Date(2026, 9, 3, 12, 0);
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it('says how recent an edit is', () => {
    expect(editedLabel(undefined, now)).toBe('');
    expect(editedLabel(ago(0), now)).toBe('just now');
    expect(editedLabel(ago(2), now)).toBe('2 min ago');
    expect(editedLabel(new Date(2026, 9, 2, 9).toISOString(), now)).toBe('yesterday');
    expect(editedLabel(new Date(2026, 8, 24).toISOString(), now)).toMatch(/24/);
    expect(editedLabel(new Date(2025, 8, 24).toISOString(), now)).toMatch(/2025/);
  });
});
