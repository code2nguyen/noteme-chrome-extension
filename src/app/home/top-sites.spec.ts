import { describe, expect, it } from 'vitest';
import { toSite } from './top-sites.service';

describe('toSite', () => {
  it('names a site after its title, its host and its first letter', () => {
    expect(toSite('https://www.github.com/code2nguyen', 'GitHub')).toEqual({
      url: 'https://www.github.com/code2nguyen',
      host: 'github.com',
      title: 'GitHub',
      letter: 'G',
      icon: undefined,
    });
  });

  it('shortens long titles, falls back to the host and builds the favicon url', () => {
    const site = toSite('https://news.ycombinator.com/', '', 'chrome-extension://id/_favicon/');
    expect(site.title).toBe('news.ycombinator…');
    expect(site.icon).toBe('chrome-extension://id/_favicon/?pageUrl=https%3A%2F%2Fnews.ycombinator.com%2F&size=64');
  });
});
