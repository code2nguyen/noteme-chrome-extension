// Points the installed c2n packages at a local checkout of the web-components repo, to try component changes in the
// app before they are published. package.json and the lockfile stay on the published versions.
//
//   node scripts/link-c2n.ts             -> node_modules/@c2n/{components,core,feather-icons,theme,mcp} link to ../web-components
//   node scripts/link-c2n.ts --unlink    -> back to the published packages (npm install)
//
// C2N_REPO overrides where the checkout is. Build it first, and again after each change (wireit skips what is fresh):
//   npm run build -w packages/umbrella && npm run build -w packages/icons/feather-icons && npm run build -w packages/tools/theme
//   npm run build:tools   (the MCP server's catalog, after the root build)

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = resolve(root, process.env['C2N_REPO'] ?? '../web-components');
const links = {
  components: 'packages/umbrella',
  // The translations registry: the app and the components must share one copy.
  core: 'packages/core',
  'feather-icons': 'packages/icons/feather-icons',
  // The theme stylesheet @c2n/components/theme.css imports, with every component's token mapping.
  theme: 'packages/tools/theme',
  // The MCP server the agents run (.mcp.json): its catalog must know the components of the checkout.
  mcp: 'packages/tools/mcp',
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
  // Every build is checked before anything is replaced: a missing one must not leave half the packages linked.
  // The MCP server is the agents' tool, not the app's: without its build the published one stays, and says so.
  const built = (path: string) => existsSync(resolve(repo, path, 'dist'));
  const optional = new Set(['mcp']);
  const unbuilt = Object.entries(links).filter(([name, path]) => !optional.has(name) && !built(path));
  if (unbuilt.length > 0) {
    const paths = unbuilt.map(([, path]) => path).join(', ');
    throw new Error(`No build in ${repo} for ${paths}: run npm run build -w <path> there first`);
  }
  for (const [name, path] of Object.entries(links)) {
    if (!built(path)) {
      console.log(`@c2n/${name} stays the published one: no build in ${path} (npm run build:tools in ${repo})`);
      continue;
    }
    const source = resolve(repo, path);
    rmSync(target(name), { recursive: true, force: true });
    symlinkSync(source, target(name), 'dir');
    console.log(`@c2n/${name} -> ${source}`);
  }
}
