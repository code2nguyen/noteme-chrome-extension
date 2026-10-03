// Zips the production build for the Chrome Web Store, after checking that every place naming the version agrees:
// package.json, the built manifest and, on a release tag, the tag itself.
//
//   node scripts/package-extension.ts            -> dist/noteme-<version>.zip
//   node scripts/package-extension.ts --sync     -> copies package.json's version into src/manifest.json
//                                                   (the npm `version` script, so `npm version patch` bumps both)

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const build = resolve(root, 'dist/noteme-chrome-extension');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as { version: string };
const version = readJson(resolve(root, 'package.json')).version;

if (process.argv.includes('--sync')) {
  const path = resolve(root, 'src/manifest.json');
  const source = readFileSync(path, 'utf8');
  writeFileSync(path, source.replace(/"version": "[^"]*"/, `"version": "${version}"`));
  console.log(`src/manifest.json is now version ${version}`);
} else {
  if (!existsSync(resolve(build, 'manifest.json'))) {
    throw new Error('No build in dist/noteme-chrome-extension: run npm run build first');
  }
  const manifest = readJson(resolve(build, 'manifest.json')).version;
  if (manifest !== version) {
    throw new Error(
      `The manifest says ${manifest} and package.json ${version}: bump with npm version, which updates both`,
    );
  }
  // On a tag push, GITHUB_REF_NAME is the tag.
  const tag = process.env['GITHUB_REF_TYPE'] === 'tag' ? process.env['GITHUB_REF_NAME'] : undefined;
  if (tag && tag !== `v${version}`) {
    throw new Error(`Tag ${tag} does not match version ${version}`);
  }
  const zip = resolve(root, `dist/noteme-${version}.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', '-X', zip, '.', '-x', '*.map'], { cwd: build, stdio: 'inherit' });
  console.log(zip);
}
