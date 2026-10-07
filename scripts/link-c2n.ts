// Points the installed c2n packages at a local checkout of the web-components repo, to try component changes in the
// app before they are published. package.json and the lockfile stay on the published versions.
//
//   node scripts/link-c2n.ts             -> node_modules/@c2n/{components,feather-icons,theme} link to ../web-components
//   node scripts/link-c2n.ts --unlink    -> back to the published packages (npm install)
//
// C2N_REPO overrides where the checkout is. Build it first, and again after each change (wireit skips what is fresh):
//   npm run build -w packages/umbrella && npm run build -w packages/icons/feather-icons && npm run build -w packages/tools/theme

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = resolve(root, process.env['C2N_REPO'] ?? '../web-components');
const links = {
  components: 'packages/umbrella',
  'feather-icons': 'packages/icons/feather-icons',
  // The theme stylesheet @c2n/components/theme.css imports, with every component's token mapping.
  theme: 'packages/tools/theme',
};

const target = (name: string) => resolve(root, 'node_modules/@c2n', name);
const isLink = (path: string) => existsSync(path) && lstatSync(path).isSymbolicLink();

if (process.argv.includes('--unlink')) {
  for (const name of Object.keys(links)) {
    if (isLink(target(name))) {
      rmSync(target(name));
    }
  }
  execFileSync('npm', ['install'], { cwd: root, stdio: 'inherit' });
  console.log('@c2n packages are the published ones again');
} else {
  for (const [name, path] of Object.entries(links)) {
    const source = resolve(repo, path);
    if (!existsSync(resolve(source, 'dist'))) {
      throw new Error(`${source} has no build: run npm run build -w ${path} in ${repo}`);
    }
    rmSync(target(name), { recursive: true, force: true });
    symlinkSync(source, target(name), 'dir');
    console.log(`@c2n/${name} -> ${source}`);
  }
}
