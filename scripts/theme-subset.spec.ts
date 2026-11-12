import { describe, expect, it } from 'vitest';
import { declared, neededSections, splitTheme } from './theme-subset';

const css = `/* header */
@layer c2n-theme {
  /* @c2n/list */
  :root,
  :host {
    --c2-list--gap: var(--c2-theme--space-sm, 4px);
  }

  /* @c2n/list-item */
  :root,
  :host {
    --c2-list-item__label--color: var(--c2-theme--color-on-surface, #18181b);
    --c2-list-item--padding: 8px;
  }

  /* @c2n/table */
  :root,
  :host {
    --c2-table--border: 1px solid;
  }
}
`;

describe('splitTheme', () => {
  const { head, sections, tail } = splitTheme(css);

  it('reads the header, each component and the end of the layer', () => {
    expect(head).toBe('/* header */\n@layer c2n-theme {');
    expect(sections.map((section) => section.name)).toEqual(['@c2n/list', '@c2n/list-item', '@c2n/table']);
    expect(tail).toBe('\n}\n');
  });

  it('puts the theme back together when every section is kept', () => {
    expect(`${head}\n${sections.map((section) => section.css).join('\n')}${tail}`).toBe(css);
  });
});

describe('declared', () => {
  it('lists the variables a section sets, not the tokens it reads', () => {
    expect(declared(splitTheme(css).sections[1].css)).toEqual([
      '--c2-list-item__label--color',
      '--c2-list-item--padding',
    ]);
  });
});

describe('neededSections', () => {
  const { sections } = splitTheme(css);
  const names = (code: string) => neededSections(sections, code).map((section) => section.name);

  it('keeps a section when the code names one of its variables', () => {
    expect(names('color: var(--c2-list-item__label--color, #000)')).toEqual(['@c2n/list-item']);
  });

  it('matches a variable by its whole name', () => {
    // --c2-list--gap is not named by a longer variable, nor by a shorter one.
    expect(names('var(--c2-list--gap-large) var(--c2-list)')).toEqual([]);
    expect(names('var(--c2-list--gap)')).toEqual(['@c2n/list']);
  });

  it('drops the components nothing reads', () => {
    expect(names('.a { --c2-list--gap: 0; --c2-table--border: none }')).toEqual(['@c2n/list', '@c2n/table']);
    expect(names('no variables here')).toEqual([]);
  });
});
