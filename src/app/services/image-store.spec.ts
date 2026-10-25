import { describe, expect, it } from 'vitest';
import { imageIds, ImageStore, referencedImages } from './image-store';
import { markdownToText, pageMarkdownToText } from './utils';
import { DataType } from '../store/models/data-type';
import type { ItemData } from '../store/models';

const A = '0b6f7f5e-2f8e-4a4f-9d55-6f1c1a4e2b10';
const B = 'f3c1b0d2-7a1e-4c9b-8b0a-2d5e6f7a8b9c';

describe('images', () => {
  it('finds the ids of the store images a note refers to', () => {
    expect(
      imageIds(`Before\n![chart|320](noteme-image:${A})\n![](https://example.com/a.png)\n![](noteme-image:${B})`),
    ).toEqual([A, B]);
  });

  it('collects the images of every note, whatever its data', () => {
    const items = [
      { id: '1', dataType: DataType.MARKDOWN, data: `![](noteme-image:${A})` },
      { id: '2', dataType: DataType.FLOW, data: { nodes: [`noteme-image:${B}`] } },
      { id: '3', dataType: DataType.NA, data: null },
    ] as unknown as ItemData[];
    expect([...referencedImages(items)].sort()).toEqual([A, B].sort());
  });

  it('draws data and https images as they are, and nothing else that is not its own', () => {
    const store = new ImageStore();
    expect(store.resolve('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(store.resolve('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(store.resolve('http://example.com/a.png')).toBe('');
    expect(store.resolve('javascript:alert(1)')).toBe('');
  });

  it('reads an image line as its alt text in search and previews', () => {
    expect(markdownToText(`Look:\n![A \\*chart\\*|320](noteme-image:${A})\nAfter`)).toBe('Look:\nA *chart*\nAfter');
    expect(pageMarkdownToText(`# Title\n\n![|320](noteme-image:${A})\n\nText`)).toBe('Title\nText');
  });

  it('reads an image beside text as its alt text too, and leaves a typed one as written', () => {
    expect(markdownToText(`See ![chart|320](noteme-image:${A}) here`)).toBe('See chart here');
    expect(pageMarkdownToText(`See ![chart|320](noteme-image:${A}) here`)).toBe('See chart here');
    expect(markdownToText('a \\![b](c)')).toBe('a ![b](c)');
    // An escaped backslash, then an image.
    expect(markdownToText(`a \\\\![chart|320](noteme-image:${A})`)).toBe('a \\chart');
  });
});
