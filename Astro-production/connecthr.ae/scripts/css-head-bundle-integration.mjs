/** Run CSS head-bundle before astro build (publisher-safe; keep package.json build = `astro build`). */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function cssHeadBundleIntegration() {
  return {
    name: 'css-head-bundle',
    hooks: {
      'astro:build:start': async () => {
        const script = join(dirname(fileURLToPath(import.meta.url)), 'build-css-head-bundle.mjs');
        const result = spawnSync(process.execPath, [script], {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        if (result.status !== 0) {
          throw new Error(`css head-bundle failed with status ${result.status}`);
        }
      },
    },
  };
}
