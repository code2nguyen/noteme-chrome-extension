import { describe, expect, it } from 'vitest';
import { changelogMarkdown, classify, releaseMarkdown, releases, releaseText, releaseVersion } from './changelog';

const commits = (...subjects: string[]) => subjects.map((subject) => ({ subject }));

describe('changelog', () => {
  it('recognises the commits that make a release', () => {
    expect(releaseVersion('3.0.1')).toBe('3.0.1');
    expect(releaseVersion('v3.1.0')).toBe('3.1.0');
    expect(releaseVersion('release 2.1.1')).toBe('2.1.1');
    expect(releaseVersion('prepare 2.1.0')).toBe('2.1.0');
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

  it('leaves releases with nothing to say out of the file', () => {
    const file = changelogMarkdown(releases(commits('chore: deps', '1.0.1', 'feat: notes', '1.0.0')));
    expect(file).toContain('## 1.0.0');
    expect(file).not.toContain('## 1.0.1');
  });
});
