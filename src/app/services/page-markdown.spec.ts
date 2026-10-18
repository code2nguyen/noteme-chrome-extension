import { describe, expect, it } from 'vitest';
import { pageMarkdownToText } from './utils';

describe('pageMarkdownToText', () => {
  it('keeps the text of links and images, whatever their destination holds', () => {
    expect(pageMarkdownToText('See [the docs](https://example.com/a).')).toBe('See the docs.');
    expect(pageMarkdownToText('[Mercury](https://en.wikipedia.org/wiki/Mercury_(planet)) is hot')).toBe(
      'Mercury is hot',
    );
    expect(pageMarkdownToText('![Chart](chart_(v2).png "Q3 (draft)")')).toBe('Chart');
  });

  it('reads a table as its cells, row by row, without its options or delimiter row', () => {
    const table = '<!-- table: formula-bar -->\n| Item | Cost |\n| --- | ---: |\n| Bus \\| night | 450 |\n|  |  |';
    expect(pageMarkdownToText(`Budget\n\n${table}\n\nAfter`)).toBe('Budget\nItem · Cost\nBus | night · 450\nAfter');
  });
});
