// Bundles the background service worker (src/worker/worker.ts) into the build as background.js, the name the manifest
// gives it. Angular's builder only emits the page; the worker shares its framework-free code (search, plans, texts)
// and must hold nothing that needs a document.
//
//   node scripts/build-worker.ts            -> dist/noteme-chrome-extension/background.js (after `ng build`)
//   node scripts/build-worker.ts --watch    -> the same, again on each change (next to `npm run watch`)

import { build, context, type BuildOptions, type Plugin } from 'esbuild';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist/noteme-chrome-extension');
const watch = process.argv.includes('--watch');

/** Angular and the c2 elements need a DOM: one of them in the worker's imports is a mistake, caught here. */
const noDom: Plugin = {
  name: 'no-dom',
  setup(build) {
    build.onResolve({ filter: /^(@angular|@ngrx|@c2n|rxjs)(\/|$)/ }, (args) => ({
      errors: [{ text: `The worker cannot import ${args.path} (from ${args.importer}): it has no document` }],
    }));
  },
};

const options: BuildOptions = {
  entryPoints: [resolve(root, 'src/worker/worker.ts')],
  outfile: resolve(out, 'background.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome130',
  minify: !watch,
  sourcemap: watch,
  legalComments: 'none',
  tsconfig: resolve(root, 'tsconfig.app.json'),
  plugins: [noDom],
  logLevel: 'info',
};

if (!watch && !existsSync(resolve(out, 'manifest.json'))) {
  throw new Error('No build in dist/noteme-chrome-extension: run ng build first');
}

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}
