// Builds the changelog from the commit history. Releases are delimited by the commits `npm version` makes (subject
// "3.0.1"; older ones read "release 2.1.1"), not by tags, which the 2.x releases never had.
//
//   node scripts/changelog.ts                    -> writes CHANGELOG.md (released versions only, so it is stable)
//   node scripts/changelog.ts --next [version]   -> also files the unreleased commits under version (default: the
//                                                   one in package.json); the npm `version` script runs this
//   node scripts/changelog.ts --check            -> fails when CHANGELOG.md is not up to date
//   node scripts/changelog.ts --notes <version>  -> that release's notes, as markdown (the GitHub release)
//   node scripts/changelog.ts --store <version>  -> the same as plain text, for the Chrome Web Store listing
//
// Kept: Conventional Commits of type feat, fix and perf, and breaking changes (`feat!:`). Dropped: chore, ci, test,
// docs, refactor, style, build, revert, and the free-form subjects from before 3.0. The subject is the line users read
// (on the store too); a `Changelog: <text>` line in the commit body words it for them instead, `Changelog: skip`
// leaves the commit out.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Section = 'breaking' | 'new' | 'fixes' | 'performance';

export interface Change {
  section: Section;
  /** The subject without its type, with the scope as a label: "Home: one photo a day". */
  text: string;
}

export interface Release {
  version: string;
  changes: Change[];
}

export interface Commit {
  subject: string;
  body?: string;
}

const TITLES: Record<Section, string> = {
  breaking: 'Breaking changes',
  new: 'New',
  fixes: 'Fixes',
  performance: 'Faster',
};
const ORDER: Section[] = ['breaking', 'new', 'fixes', 'performance'];

/** The version a release commit makes, or null. */
export function releaseVersion(subject: string): string | null {
  return /^(?:(?:release|prepare|finish)\s+|v)?(\d+\.\d+\.\d+(?:-[\w.]+)?)$/i.exec(subject.trim())?.[1] ?? null;
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** What a commit means for someone using Noteme, or null when it means nothing to them. */
export function classify({ subject, body = '' }: Commit): Change | null {
  const conventional = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject.trim());
  if (!conventional) {
    return null;
  }
  const [, type, scope, bang, description] = conventional;
  const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(body);
  const section: Section | undefined = breaking
    ? 'breaking'
    : ({ feat: 'new', fix: 'fixes', perf: 'performance' } as Record<string, Section>)[type.toLowerCase()];
  const worded = /^Changelog:[ \t]*(.+)$/im.exec(body)?.[1].trim();
  if (!section || /^(skip|none)$/i.test(worded ?? '')) {
    return null;
  }
  const text = worded ?? description.trim();
  return { section, text: scope ? `${sentence(scope)}: ${text}` : sentence(text) };
}

/** Groups commits, oldest first, into releases, newest first. Commits after the last release go under `next`. */
export function releases(commits: Commit[], next?: string): Release[] {
  const result: Release[] = [];
  let pending: Change[] = [];
  for (const commit of commits) {
    const version = releaseVersion(commit.subject);
    if (version) {
      result.unshift({ version, changes: pending });
      pending = [];
    } else {
      const change = classify(commit);
      if (change) {
        pending.push(change);
      }
    }
  }
  if (next && pending.length > 0) {
    result.unshift({ version: next, changes: pending });
  }
  return result;
}

function grouped(release: Release): [Section, string[]][] {
  return ORDER.flatMap((section) => {
    const texts = release.changes.filter((change) => change.section === section).map((change) => change.text);
    return texts.length > 0 ? [[section, texts] as [Section, string[]]] : [];
  });
}

/** One release as markdown, under a `###` heading per section. */
export function releaseMarkdown(release: Release): string {
  const sections = grouped(release);
  if (sections.length === 0) {
    return 'Maintenance release.\n';
  }
  return sections
    .map(([section, texts]) => `### ${TITLES[section]}\n\n${texts.map((text) => `- ${text}`).join('\n')}\n`)
    .join('\n');
}

/** One release as plain text, for the store's description field, which shows no markdown. */
export function releaseText(release: Release): string {
  const sections = grouped(release);
  const lines = [`What's new in ${release.version}`];
  for (const [section, texts] of sections) {
    lines.push('', `${TITLES[section]}:`, ...texts.map((text) => `• ${text}`));
  }
  if (sections.length === 0) {
    lines.push('', 'Small fixes and improvements.');
  }
  return `${lines.join('\n')}\n`;
}

export function changelogMarkdown(all: Release[]): string {
  const body = all
    // A release without one user-facing change says nothing in the file.
    .filter((release) => release.changes.length > 0)
    .map((release) => `## ${release.version}\n\n${releaseMarkdown(release)}`)
    .join('\n');
  return `# Changelog\n\nGenerated from the commit history by \`npm run changelog\`; do not edit by hand.\n\n${body}`;
}

/** Every commit reachable from HEAD, oldest first, merges left out. */
function gitCommits(root: string): Commit[] {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
    throw new Error('The changelog needs the full history: fetch with fetch-depth 0 or git fetch --unshallow');
  }
  return git('log', '--reverse', '--topo-order', '--no-merges', '--format=%s%x1f%b%x1e')
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [subject, body] = record.split('\x1f');
      return { subject, body };
    });
}

function main(args: string[]): void {
  const root = resolve(import.meta.dirname, '..');
  const file = resolve(root, 'CHANGELOG.md');
  const option = (name: string) => {
    const index = args.indexOf(name);
    if (index === -1) {
      return undefined;
    }
    const value = args[index + 1];
    return value && !value.startsWith('--') ? value : '';
  };
  const packageVersion = () =>
    (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }).version;

  const notes = option('--notes') ?? option('--store');
  if (notes !== undefined) {
    const version = notes || packageVersion();
    // The release being made may not have its version commit yet (a dry run): file the pending commits under it.
    const release = releases(gitCommits(root), version).find((candidate) => candidate.version === version);
    if (!release) {
      throw new Error(`No release ${version} in the history`);
    }
    process.stdout.write(args.includes('--store') ? releaseText(release) : releaseMarkdown(release));
    return;
  }

  const next = option('--next');
  const content = changelogMarkdown(
    releases(gitCommits(root), next === undefined ? undefined : next || packageVersion()),
  );
  if (args.includes('--check')) {
    if (readFileSync(file, 'utf8') !== content) {
      throw new Error('CHANGELOG.md is out of date: run npm run changelog');
    }
    return;
  }
  writeFileSync(file, content);
  console.log(`CHANGELOG.md written`);
}

if (import.meta.main) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
