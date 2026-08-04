#!/usr/bin/env node
/**
 * Merge origin/main into the current branch on Windows, skipping
 * NTFS-illegal paths (usually srcset/CSS filename leaks from main).
 *
 * Usage: node scripts/merge-main-windows-safe.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(args, opts = {}) {
  const res = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
  if (res.status !== 0 && !opts.allowFail) {
    console.error(res.stderr || res.stdout);
    throw new Error(`git ${args.join(' ')} failed (${res.status})`);
  }
  return res;
}

function isIllegalPath(line) {
  if (
    /https?:/i.test(line) ||
    /no-repeat/i.test(line) ||
    /background-color/i.test(line) ||
    /%20https/i.test(line) ||
    /\d+w,\s*/i.test(line) ||
    /,\s*https?/i.test(line)
  ) {
    return true;
  }
  for (const seg of line.split('/')) {
    if (/[<>:"|?*\u0000-\u001f]/.test(seg)) return true;
  }
  return false;
}

function listIllegal(ref) {
  const out = git(['-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', ref]);
  return out.stdout.split(/\r?\n/).filter(Boolean).filter(isIllegalPath);
}

console.log('Fetching origin/main…');
git(['fetch', 'origin', 'main']);

const head = git(['rev-parse', 'HEAD']).stdout.trim();
const main = git(['rev-parse', 'origin/main']).stdout.trim();
console.log('HEAD', head);
console.log('origin/main', main);

const base = git(['merge-base', 'HEAD', 'origin/main']).stdout.trim();
if (base === main) {
  console.log('Already contains origin/main');
  process.exit(0);
}

const illegal = listIllegal('origin/main');
console.log(`Excluding ${illegal.length} Windows-illegal paths from checkout`);
writeFileSync(join(ROOT, 'scripts/.windows-illegal-paths.txt'), illegal.join('\n') + '\n');

git(['sparse-checkout', 'init', '--no-cone'], { allowFail: true });
const patterns = ['/*', ...illegal.map((p) => '!' + (p.startsWith('/') ? p : `/${p}`))];
writeFileSync(join(ROOT, '.git/info/sparse-checkout'), patterns.join('\n') + '\n', 'utf8');
git(['sparse-checkout', 'reapply'], { allowFail: true });

console.log('Merging origin/main…');
const merge = git(['merge', '--no-edit', 'origin/main', '-m', 'Merge origin/main into astro-mushtaq'], {
  allowFail: true,
});
process.stdout.write(merge.stdout || '');
process.stderr.write(merge.stderr || '');

if (merge.status === 0) {
  console.log('\nMerge succeeded.');
  console.log(git(['status', '-sb']).stdout);
  console.log(git(['log', '--oneline', '-6']).stdout);
  process.exit(0);
}

console.error('\nMerge failed. Fix conflicts or local changes, then retry.');
process.exit(merge.status || 1);
