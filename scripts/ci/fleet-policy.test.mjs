#!/usr/bin/env node

import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const sourceRoot = path.resolve(import.meta.dirname, '../..');

function command(cwd, executable, values, expected = 0) {
  const result = spawnSync(executable, values, {
    cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
  });
  assert.equal(result.error, undefined, `${executable} could not start: ${String(result.error)}`);
  assert.equal(result.status, expected, `${executable} ${values.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fleet-policy-'));
  mkdirSync(path.join(root, 'scripts/ci'), { recursive: true });
  mkdirSync(path.join(root, 'Astro-production/one.example/src/pages'), { recursive: true });
  mkdirSync(path.join(root, 'Astro-production/two.example/src/pages'), { recursive: true });
  cpSync(path.join(sourceRoot, 'scripts/ci/fleet-plan.mjs'), path.join(root, 'scripts/ci/fleet-plan.mjs'));
  const policy = JSON.parse(readFileSync(path.join(sourceRoot, 'scripts/ci/fleet-policy.json'), 'utf8'));
  policy.minimumFleetSites = 2;
  writeFileSync(path.join(root, 'scripts/ci/fleet-policy.json'), `${JSON.stringify(policy)}\n`);
  writeFileSync(path.join(root, 'scripts/fleet-sites.json'), `${JSON.stringify({
    productionRoot: 'Astro-production',
    sites: [
      { id: 'one', domain: 'one.example', dir: 'one.example', port: 6001, unit: 'one' },
      { id: 'two', domain: 'two.example', dir: 'two.example', port: 6002, unit: 'two' },
    ],
  })}\n`);
  for (const domain of ['one.example', 'two.example']) {
    writeFileSync(path.join(root, `Astro-production/${domain}/package.json`), `${JSON.stringify({ name: domain, scripts: { build: 'astro build' } })}\n`);
    writeFileSync(path.join(root, `Astro-production/${domain}/src/pages/index.astro`), `<h1>${domain}</h1>\n`);
  }
  writeFileSync(path.join(root, 'package.json'), '{}\n');
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  command(root, '/usr/bin/git', ['init', '-q']);
  command(root, '/usr/bin/git', ['config', 'user.name', 'Fleet test']);
  command(root, '/usr/bin/git', ['config', 'user.email', 'fleet@example.invalid']);
  command(root, '/usr/bin/git', ['add', '.']); command(root, '/usr/bin/git', ['commit', '-qm', 'base']);
  return root;
}

function plan(root, relative, payload, expected = 0) {
  const base = command(root, '/usr/bin/git', ['rev-parse', 'HEAD']).stdout.trim();
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, payload);
  command(root, '/usr/bin/git', ['add', '.']); command(root, '/usr/bin/git', ['commit', '-qm', 'change']);
  const head = command(root, '/usr/bin/git', ['rev-parse', 'HEAD']).stdout.trim();
  return command(root, '/usr/bin/node', ['scripts/ci/fleet-plan.mjs', '--base', base, '--head', head], expected);
}

test('ordinary site presentation code selects exactly its site', () => {
  const root = fixture();
  try {
    const result = plan(root, 'Astro-production/one.example/src/pages/index.astro', '<h1>changed</h1>\n');
    const value = JSON.parse(result.stdout); assert.deepEqual(value.sites.map((site) => site.id), ['one']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('workflow and backend API changes fail closed', () => {
  for (const relative of ['.github/workflows/escape.yml', 'Astro-production/one.example/src/pages/api/steal.ts']) {
    const root = fixture();
    try { assert.match(plan(root, relative, 'blocked\n', 77).stderr, /BLOCKED/); }
    finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('lockfile changes select every registered package', () => {
  const root = fixture();
  try {
    const result = plan(root, 'pnpm-lock.yaml', 'lockfileVersion: 9\nchanged: true\n');
    const value = JSON.parse(result.stdout); assert.deepEqual(value.sites.map((site) => site.id), ['one', 'two']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
