import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

/**
 * The c2n packages are released together and must be upgraded together: the MCP server and the skill describe the
 * components of their own version, so an older one tells the agents that a component Noteme has does not exist.
 */
describe('the c2n packages', () => {
  it('are all pinned to one version, the MCP server and the skill included', () => {
    const { dependencies, devDependencies } = JSON.parse(read('package.json')) as Record<
      string,
      Record<string, string>
    >;
    const versions = Object.entries({ ...dependencies, ...devDependencies }).filter(([name]) =>
      name.startsWith('@c2n/'),
    );
    expect(versions.map(([name]) => name)).toEqual(
      expect.arrayContaining(['@c2n/components', '@c2n/mcp', '@c2n/skill']),
    );
    const expected = dependencies['@c2n/components'];
    expect(expected).toMatch(/^\d+\.\d+\.\d+$/);
    expect(versions.filter(([, version]) => version !== expected)).toEqual([]);
  });

  it('have their MCP server run from node_modules, never from a version written in an agent config', () => {
    // `npx c2n-skill install` writes these; with @c2n/mcp installed it points them at node_modules.
    const configs = [
      '.mcp.json',
      '.claude/settings.json',
      '.codex/config.toml',
      '.agents/mcp_config.json',
      '.vscode/mcp.json',
    ];
    const pinned = configs.filter((path) => existsSync(resolve(root, path)) && /@c2n\/mcp@\d/.test(read(path)));
    expect(pinned).toEqual([]);
  });
});
