import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const registry = JSON.parse(readFileSync(join(root, 'scripts/fleet-sites.json'), 'utf8'));
function files(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    assert.equal(entry.isSymbolicLink(), false, 'API source must not be symlinked');
    const relative = prefix + entry.name;
    return entry.isDirectory() ? files(join(dir, entry.name), relative + '/') : [relative];
  });
}

test('all 41 form sites remove list/export/detail/manual-retry mounts and retain local-worker mount', () => {
  let formSites = 0;
  for (const site of registry.sites) {
    const dir = join(root, registry.productionRoot, site.dir, 'src/pages/api/internal');
    const paths = files(dir);
    assert.deepEqual(paths.filter((p) => /^(?:leads|export-leads|retry-lead)(?:[./]|$)/.test(p)), [], site.id);
    if (site.id === 'connectresourcesint') {
      assert.equal(existsSync(join(dir, 'run-retries.ts')), false);
      continue;
    }
    formSites++;
    assert.equal(readFileSync(join(dir, 'run-retries.ts'), 'utf8'),
      "export const prerender = false;\nexport { GET, POST } from '@connect/site-cms/astro/run-retries';\n", site.id);
  }
  assert.equal(formSites, 41);
});
