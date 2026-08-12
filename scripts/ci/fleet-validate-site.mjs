#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, lstatSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const shaPattern = /^[0-9a-f]{40}$/;

function fail(message) {
  console.error(`FLEET VALIDATION BLOCKED: ${message}`);
  process.exit(77);
}

function argumentsValue(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1];
    if (!['--site', '--base', '--head'].includes(key) || value === undefined) fail('usage: fleet-validate-site.mjs --site ID --base SHA --head SHA');
    result[key.slice(2)] = value;
  }
  if (!result.site || !result.base || !result.head || !shaPattern.test(result.base) || !shaPattern.test(result.head)) fail('invalid validation arguments');
  return result;
}

function run(command, values, timeout = 20 * 60 * 1000, cwd = root) {
  const completed = spawnSync(command, values, {
    cwd, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024,
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', CI: '1', NODE_ENV: 'production' },
  });
  if (completed.error) fail(`${path.basename(command)} failed: ${completed.error.message}`);
  if (completed.status !== 0) fail(`${path.basename(command)} ${values.join(' ')} failed:\n${completed.stdout.slice(-8192)}\n${completed.stderr.slice(-8192)}`);
  return completed.stdout;
}

function changedPaths(base, head, prefix) {
  const output = run('/usr/bin/git', ['diff', '--name-only', '-z', base, head, '--', prefix], 60_000);
  return output.split('\0').filter(Boolean);
}

function scanChangedFiles(paths) {
  const forbidden = [
    /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bghp_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /\bsk_live_[A-Za-z0-9]{16,}\b/,
  ];
  for (const relative of paths) {
    let info;
    try { info = lstatSync(path.join(root, relative)); } catch { continue; }
    if (!info.isFile() || info.size > 8 * 1024 * 1024) continue;
    const payload = readFileSync(path.join(root, relative));
    if (payload.includes(0)) continue;
    const text = payload.toString('utf8');
    if (forbidden.some((pattern) => pattern.test(text))) fail(`high-confidence credential material detected: ${relative}`);
  }
}

function artifactInventory(directory, policy) {
  let objects = 0; let bytes = 0; const records = [];
  function visit(current) {
    for (const name of readdirSync(current).sort()) {
      const item = path.join(current, name); const relative = path.relative(directory, item).split(path.sep).join('/'); const info = lstatSync(item);
      objects += 1;
      if (objects > policy.maximumSiteArtifactFiles) fail('artifact object ceiling exceeded');
      if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile()) || (info.isFile() && info.nlink !== 1)) fail(`artifact has link/special object: ${relative}`);
      if (info.isDirectory()) { records.push(`d ${info.mode & 0o7777} ${relative}`); visit(item); }
      else {
        bytes += info.size; if (bytes > policy.maximumSiteArtifactBytes) fail('artifact byte ceiling exceeded');
        const digest = createHash('sha256').update(readFileSync(item)).digest('hex');
        records.push(`f ${info.mode & 0o7777} ${info.size} ${digest} ${relative}`);
      }
    }
  }
  visit(directory);
  return { objects, bytes, sha256: createHash('sha256').update(`${records.join('\n')}\n`).digest('hex') };
}

async function probe(site, sitePath) {
  const entry = path.join(sitePath, 'dist/server/entry.mjs');
  if (!statSync(entry).isFile()) fail('build omitted dist/server/entry.mjs');
  const port = 6200 + (site.port % 500);
  const child = spawn('/usr/bin/node', [entry], {
    cwd: sitePath, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), PUBLIC_SITE_URL: `https://${site.domain}` },
    detached: true,
  });
  let output = '';
  child.stdout.on('data', (value) => { output = `${output}${value}`.slice(-65536); });
  child.stderr.on('data', (value) => { output = `${output}${value}`.slice(-65536); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) break;
      try { const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual', signal: AbortSignal.timeout(1000) }); if (response.status === 200) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) fail(`secretless preview did not become ready: ${output}`);
    const results = [];
    for (const route of ['/', '/robots.txt', '/__fleet_missing_8c1e954e/']) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > 8 * 1024 * 1024) fail(`${route} response exceeds 8 MiB`);
      if (route === '/' && (response.status !== 200 || !String(response.headers.get('content-type')).toLowerCase().includes('text/html'))) fail('homepage is not 200 HTML');
      if (route === '/robots.txt' && (response.status !== 200 || /disallow:\s*\/\s*$/im.test(body.toString('utf8')))) fail('robots.txt is missing or blocks all crawlers');
      if (route.startsWith('/__fleet_missing_') && response.status !== 404) fail('random missing route does not return 404');
      results.push({ route, status: response.status, contentType: response.headers.get('content-type'), bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
    }
    return results;
  } finally {
    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (child.exitCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  }
}

const args = argumentsValue(process.argv.slice(2));
const policy = JSON.parse(readFileSync(path.join(root, 'scripts/ci/fleet-policy.json'), 'utf8'));
const registry = JSON.parse(readFileSync(path.join(root, 'scripts/fleet-sites.json'), 'utf8'));
const site = registry.sites.find((candidate) => candidate.id === args.site);
if (!site) fail(`unknown site: ${args.site}`);
const sitePath = path.join(root, policy.productionRoot, site.dir);
const packageValue = JSON.parse(readFileSync(path.join(sitePath, 'package.json'), 'utf8'));
if (!policy.allowedBuildScripts.includes(packageValue.scripts?.build)) fail(`unapproved build script for ${site.id}: ${packageValue.scripts?.build}`);
const changed = changedPaths(args.base, args.head, `${policy.productionRoot}/${site.dir}`);
scanChangedFiles(changed);
run(path.join(root, 'node_modules/.bin/astro'), ['check'], 15 * 60 * 1000, sitePath);
run('/usr/bin/pnpm', ['--filter', packageValue.name, 'run', 'build'], 30 * 60 * 1000);
const artifact = artifactInventory(path.join(sitePath, 'dist'), policy);
const probes = await probe(site, sitePath);
mkdirSync(path.join(root, 'fleet-evidence'), { recursive: true });
const evidence = { format: 'astro-fleet-ci-evidence-v1', site: site.id, domain: site.domain, packageName: packageValue.name, base: args.base, head: args.head, changedPaths: changed.sort(), artifact, probes };
writeFileSync(path.join(root, 'fleet-evidence', `${site.id}.json`), `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(`FLEET VALIDATION PASS: ${site.id} files=${artifact.objects} bytes=${artifact.bytes}`);
