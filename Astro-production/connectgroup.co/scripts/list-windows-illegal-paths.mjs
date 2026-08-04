#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv[2] || 'origin/main';
const outFile = join(ROOT, 'scripts/.windows-illegal-paths.txt');

function isIllegalPath(line) {
  // Full-path checks for srcset/CSS leaks that embed '/' inside the filename
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

const res = spawnSync(
  'git',
  ['-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', ref],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (res.status !== 0) {
  console.error(res.stderr);
  process.exit(1);
}

const paths = res.stdout.split(/\r?\n/).filter(Boolean);
const bad = paths.filter(isIllegalPath);
writeFileSync(outFile, bad.join('\n') + '\n', 'utf8');
console.log(`total=${paths.length} illegal=${bad.length}`);
for (const b of bad) console.log(b);
