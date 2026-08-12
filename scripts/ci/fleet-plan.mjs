#!/usr/bin/env node

import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const shaPattern = /^[0-9a-f]{40}$/;

function fail(message) {
  console.error(`FLEET PLAN BLOCKED: ${message}`);
  process.exit(77);
}

function parseArguments(values) {
  const result = { allowControlPlane: false, githubOutput: null };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--allow-control-plane') result.allowControlPlane = true;
    else if (value === '--base' || value === '--head' || value === '--github-output') {
      if (index + 1 >= values.length) fail(`${value} requires one value`);
      result[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = values[++index];
    } else fail(`unknown argument: ${value}`);
  }
  if (!result.base || !result.head) fail('--base and --head are required');
  return result;
}

function git(argumentsValue, encoding = 'utf8') {
  const completed = spawnSync('/usr/bin/git', argumentsValue, {
    cwd: root,
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
  });
  if (completed.status !== 0) fail(`git ${argumentsValue[0]} failed: ${String(completed.stderr).slice(-2048)}`);
  return completed.stdout;
}

function exactCommit(value, label) {
  const resolved = git(['rev-parse', '--verify', `${value}^{commit}`]).trim();
  if (!shaPattern.test(resolved)) fail(`${label} did not resolve to a full commit SHA`);
  return resolved;
}

function changedRecords(base, head) {
  const raw = git(['diff', '--name-status', '--find-renames=90%', '-z', base, head, '--'], 'buffer');
  const tokens = raw.toString('utf8').split('\0');
  if (tokens.at(-1) === '') tokens.pop();
  const records = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (!/^(?:[ACDMRTUXB]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) fail(`unexpected Git status: ${status}`);
    if (status.startsWith('R') || status.startsWith('C')) {
      if (index + 1 >= tokens.length) fail('truncated rename/copy record');
      records.push({ status, oldPath: tokens[index++], path: tokens[index++] });
    } else {
      if (index >= tokens.length) fail('truncated changed-path record');
      records.push({ status, path: tokens[index++] });
    }
  }
  return records;
}

function treeMetadata(head, relative) {
  const output = git(['ls-tree', '-z', head, '--', relative], 'buffer').toString('utf8');
  if (!output) return null;
  const line = output.replace(/\0$/, '');
  const match = /^([0-9]{6}) ([a-z]+) ([0-9a-f]{40})\t(.+)$/.exec(line);
  if (!match || match[4] !== relative) fail(`ambiguous Git tree entry: ${relative}`);
  return { mode: match[1], type: match[2], object: match[3] };
}

function blobSize(head, relative) {
  const metadata = treeMetadata(head, relative);
  if (metadata === null) return 0;
  if (metadata.mode === '120000' || metadata.mode === '160000' || metadata.type !== 'blob') fail(`symlink, submodule, or non-blob path is forbidden: ${relative}`);
  const value = git(['cat-file', '-s', `${head}:${relative}`]).trim();
  if (!/^[0-9]+$/.test(value)) fail(`invalid blob size for ${relative}`);
  return Number(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

const args = parseArguments(process.argv.slice(2));
const base = exactCommit(args.base, 'base');
const head = exactCommit(args.head, 'head');
const policy = JSON.parse(readFileSync(path.join(root, 'scripts/ci/fleet-policy.json'), 'utf8'));
const registry = JSON.parse(readFileSync(path.join(root, 'scripts/fleet-sites.json'), 'utf8'));
if (policy.format !== 'astro-fleet-policy-v1' || registry.productionRoot !== policy.productionRoot || !Array.isArray(registry.sites)) fail('fleet policy/registry schema mismatch');

const sites = new Map();
for (const site of registry.sites) {
  if (!site || typeof site !== 'object' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(site.id) || !/^[a-z0-9.-]+$/.test(site.domain) || site.dir !== site.domain || !Number.isInteger(site.port)) fail('invalid site registry entry');
  const packagePath = path.join(root, policy.productionRoot, site.dir, 'package.json');
  try {
    if (!statSync(packagePath).isFile()) continue;
  } catch {
    continue;
  }
  const packageValue = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (!packageValue.name || !packageValue.scripts?.build) fail(`site package lacks name/build: ${site.id}`);
  sites.set(site.dir, { id: site.id, domain: site.domain, dir: site.dir, port: site.port, unit: site.unit, packageName: packageValue.name });
}
if (sites.size < policy.minimumFleetSites) fail(`fleet package registry unexpectedly contains fewer than ${policy.minimumFleetSites} sites`);

const records = changedRecords(base, head);
if (records.length > policy.maximumChangedFiles) fail(`changed-file count ${records.length} exceeds ${policy.maximumChangedFiles}`);
let changedBytes = 0;
const selected = new Set();
const rejected = [];
let sharedImpact = false;

function classify(relative, status) {
  if (!relative || relative.startsWith('/') || relative.includes('..') || relative.includes('\\') || relative.includes('\0')) {
    rejected.push(`${relative}: unsafe path`); return;
  }
  const repositoryPrefix = policy.blockedRepositoryPrefixes.find((prefix) => relative.startsWith(prefix));
  if (repositoryPrefix) {
    if (!args.allowControlPlane) rejected.push(`${relative}: protected control-plane path`);
    return;
  }
  if (policy.allowedSharedFiles.includes(relative)) { sharedImpact = true; return; }
  if (relative === 'README.md' || relative.startsWith('docs/')) return;
  if (!relative.startsWith(`${policy.productionRoot}/`)) { rejected.push(`${relative}: unclassified repository path`); return; }
  const remainder = relative.slice(policy.productionRoot.length + 1);
  const separator = remainder.indexOf('/');
  if (separator <= 0) { rejected.push(`${relative}: site root deletion/addition is forbidden`); return; }
  const directory = remainder.slice(0, separator);
  const siteRelative = remainder.slice(separator + 1);
  const site = sites.get(directory);
  if (!site) { rejected.push(`${relative}: site is not in the deployable package registry`); return; }
  const framed = `/${siteRelative}`;
  if (policy.blockedSiteSegments.some((segment) => framed === segment || framed.startsWith(segment)) ||
      policy.blockedSiteNames.includes(path.posix.basename(siteRelative)) ||
      policy.blockedSiteSuffixes.some((suffix) => siteRelative.toLowerCase().endsWith(suffix))) {
    rejected.push(`${relative}: protected runtime/credential/deploy path`); return;
  }
  if (status === 'D' && siteRelative === 'package.json') { rejected.push(`${relative}: package deletion is forbidden`); return; }
  selected.add(directory);
}

for (const record of records) {
  classify(record.path, record.status);
  if (record.oldPath) classify(record.oldPath, 'D');
  if (record.status !== 'D') {
    const size = blobSize(head, record.path);
    if (size > policy.maximumSourceFileBytes) rejected.push(`${record.path}: file exceeds source-size ceiling`);
    changedBytes += size;
    if (changedBytes > policy.maximumChangedBytes) rejected.push(`changed bytes exceed ${policy.maximumChangedBytes}`);
  }
}
if (sharedImpact) for (const directory of sites.keys()) selected.add(directory);
if (rejected.length) fail([...new Set(rejected)].sort().join('\n'));

const include = [...selected].sort().map((directory) => sites.get(directory));
const plan = canonical({
  format: 'astro-fleet-plan-v1', base, head, changedFiles: records.length, changedBytes,
  sharedImpact, sites: include,
});
const encoded = JSON.stringify(plan);
console.log(encoded);
if (args.githubOutput) {
  appendFileSync(args.githubOutput, `matrix=${JSON.stringify({ include })}\ncount=${include.length}\nbase=${base}\nhead=${head}\nplan=${encoded}\n`, { encoding: 'utf8' });
}
