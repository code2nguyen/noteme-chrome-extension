import { describe, expect, it } from 'vitest';

import { newSheet, parseSheet, serializeSheet, sheetLines, sheetText, sheetToMarkdown } from './sheet-doc';

describe('sheet-doc', () => {
  it('reads back what it stored', () => {
    const sheet = {
      columns: [{ label: 'Item' }, { label: 'Cost', format: 'currency' as const, width: 120 }],
      data: [
        ['Hotel', '420'],
        ['Total', '=SUM(B1:B1)'],
      ],
      rows: 4,
      styles: { A2: { bold: true } },
      formulaBar: true,
      summary: false,
    };
    expect(parseSheet(serializeSheet(sheet))).toEqual(sheet);
  });

  it('falls back to a new sheet on anything malformed', () => {
    expect(parseSheet(null)).toEqual(newSheet());
    expect(parseSheet('not json')).toEqual(newSheet());
    expect(parseSheet('[1,2]')).toEqual(newSheet());
    expect(parseSheet('{"data":[["a",3,null]],"rows":-2}')).toEqual({ ...newSheet(), data: [['a', '3', '']] });
  });

  it('counts its lines with the formula bar and the totals', () => {
    expect(sheetLines({ ...newSheet(), rows: 5, formulaBar: true, summary: true })).toBe(7);
  });

  it('reads as its column names and cells, without formulas', () => {
    const sheet = {
      ...newSheet(),
      columns: [{ label: 'Item' }, { label: 'Cost' }],
      data: [
        ['Hotel', '420'],
        ['Total', '=SUM(B1)'],
      ],
    };
    expect(sheetText(sheet)).toBe('Item · Cost\nHotel · 420\nTotal');
  });

  it('copies as a pipe table a page reads back', () => {
    const sheet = { ...newSheet(), columns: [{ label: 'Item' }, {}], data: [['a|b', '=SUM(B2:B2)']], rows: 2 };
    expect(sheetToMarkdown(sheet)).toBe('| Item |  |\n| --- | --- |\n| a\\|b | =SUM(B2:B2) |\n|  |  |');
  });
});
