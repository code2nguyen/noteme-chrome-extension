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

  it('reads the <br> of an empty line or a line break in a cell as nothing, not as text', () => {
    expect(
      pageMarkdownToText('Transfer\n\n<br>\n\n| Project | Info |\n| --- | --- |\n| TMC<br>Smart home | <br> |\n\n<br>'),
    ).toBe('Transfer\nProject · Info\nTMC Smart home');
  });

  it('keeps a <br> written in code', () => {
    expect(pageMarkdownToText('Use `a<br>b` here\n\n```html\n<br>\nline<br/>break\n```\n\nEnd<br>')).toBe(
      'Use a<br>b here\n<br>\nline<br/>break\nEnd',
    );
  });
});
