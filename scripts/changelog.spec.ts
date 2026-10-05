import { describe, expect, it } from 'vitest';
import {
  changelogMarkdown,
  classify,
  releaseMarkdown,
  releases,
  releaseText,
  releaseVersion,
  storeText,
} from './changelog';

const commits = (...subjects: string[]) => subjects.map((subject) => ({ subject }));

describe('changelog', () => {
  it('recognises the commits that make a release', () => {
    expect(releaseVersion('3.0.1')).toBe('3.0.1');
    expect(releaseVersion('v3.1.0')).toBe('3.1.0');
    expect(releaseVersion('release 2.1.1')).toBe('2.1.1');
    expect(releaseVersion('prepare 2.1.0')).toBe('2.1.0');
    expect(releaseVersion('v3.0.0-rc.1')).toBe('3.0.0-rc.1');
    expect(releaseVersion('v3.0.0-rc-1')).toBe('3.0.0-rc-1');
    expect(releaseVersion('fix: crash on 3.0.1')).toBeNull();
    expect(releaseVersion('update angular 11')).toBeNull();
  });

  it('keeps what users notice and labels it with its scope', () => {
    expect(classify({ subject: 'feat(home): one background photo a day' })).toEqual({
      section: 'new',
      text: 'Home: one background photo a day',
    });
    expect(classify({ subject: 'fix(search): find words anywhere in a page' })?.section).toBe('fixes');
    expect(classify({ subject: 'perf: load each screen with its components' })).toEqual({
      section: 'performance',
      text: 'Load each screen with its components',
    });
    expect(classify({ subject: 'feat(sync)!: pages no longer sync' })?.section).toBe('breaking');
    expect(classify({ subject: 'feat: x', body: 'BREAKING CHANGE: y' })?.section).toBe('breaking');
    for (const subject of [
      'ci: release workflow',
      'chore: deps',
      'test: e2e',
      'refactor(pages): drop',
      'docs: readme',
    ]) {
      expect(classify({ subject })).toBeNull();
    }
    // Free-form subjects, from before conventional commits, are left out.
    expect(classify({ subject: 'add delete button' })).toBeNull();
    expect(classify({ subject: 'fix tab sync' })).toBeNull();
  });

  it('takes the wording for users from a Changelog line in the body', () => {
    expect(
      classify({
        subject: 'feat(board): actions slot; @c2n 0.0.22',
        body: 'Why.\n\nChangelog: delete a note from its menu',
      }),
    ).toEqual({
      section: 'new',
      text: 'Board: delete a note from its menu',
    });
    expect(classify({ subject: 'fix: typo in a test helper', body: 'Changelog: skip' })).toBeNull();
  });

  it('groups commits into releases, newest first, and files pending ones under the next version', () => {
    const history = commits(
      'feat: notes',
      '1.0.0',
      'fix: crash',
      'ci: build',
      '1.0.1',
      'feat(plan): weeks',
      'chore: x',
    );
    expect(releases(history).map((release) => release.version)).toEqual(['1.0.1', '1.0.0']);
    const withNext = releases(history, '1.1.0');
    expect(withNext[0]).toEqual({ version: '1.1.0', changes: [{ section: 'new', text: 'Plan: weeks' }] });
    // Nothing pending: no empty release.
    expect(releases(commits('feat: a', '1.0.0'), '1.0.1').map((release) => release.version)).toEqual(['1.0.0']);
    // A next version that is already released keeps its own notes; the newer commits are not filed under it again.
    expect(releases(history, '1.0.1')).toEqual(releases(history));
    expect(storeText(releases(history, '1.0.1'), '1.0.1').match(/What's new in 1\.0\.1/g)).toHaveLength(1);
  });

  it('writes markdown for the file and plain text for the store', () => {
    const [release] = releases(commits('fix: crash', 'feat(home): photos', 'feat!: new storage', '2.0.0'));
    expect(releaseMarkdown(release)).toBe(
      '### Breaking changes\n\n- New storage\n\n### New\n\n- Home: photos\n\n### Fixes\n\n- Crash\n',
    );
    expect(releaseText(release)).toBe(
      "What's new in 2.0.0\n\nBreaking changes:\n• New storage\n\nNew:\n• Home: photos\n\nFixes:\n• Crash\n",
    );
    expect(releaseText({ version: '2.0.1', changes: [] })).toContain('Small fixes and improvements.');
  });

  it('gives the store the release and the ones before it, not the whole history', () => {
    // 1.0.0 … 1.0.11, each with one fix, and 1.0.12 with nothing to say.
    const history = Array.from({ length: 12 }, (_, n) => [`fix: bug ${n}`, `1.0.${n}`]).flat();
    const all = releases(commits(...history, 'chore: deps', '1.0.12'));
    const versions = (text: string) => [...text.matchAll(/What's new in (\S+)/g)].map((match) => match[1]);

    expect(versions(storeText(all, '1.0.11'))).toEqual(Array.from({ length: 10 }, (_, n) => `1.0.${11 - n}`));
    expect(versions(storeText(all, '1.0.11', 3))).toEqual(['1.0.11', '1.0.10', '1.0.9']);
    // An older release starts from itself; a newer one with nothing to say still heads the text.
    expect(versions(storeText(all, '1.0.1'))).toEqual(['1.0.1', '1.0.0']);
    expect(versions(storeText(all, '1.0.12', 2))).toEqual(['1.0.12', '1.0.11']);
    expect(() => storeText(all, '9.9.9')).toThrow('No release 9.9.9');
  });

  it('leaves releases with nothing to say out of the file', () => {
    const file = changelogMarkdown(releases(commits('chore: deps', '1.0.1', 'feat: notes', '1.0.0')));
    expect(file).toContain('## 1.0.0');
    expect(file).not.toContain('## 1.0.1');
  });
});
