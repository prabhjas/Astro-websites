#!/usr/bin/env node
/**
 * Local fleet control — mirrors server site-ctl + systemd PORT layout.
 *
 * Usage:
 *   node scripts/fleet-local.mjs <command> [site-id|all]
 *
 * Commands:
 *   list | env | install | build | start | stop | restart | status | smoke | up
 *
 * Examples:
 *   node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental
 *   node scripts/fleet-local.mjs smoke evolutionmiddleast,cbss,spheavyrental
 *   node scripts/fleet-local.mjs stop all
 */
import { spawn, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  copyFileSync,
  openSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'scripts/fleet-sites.json'), 'utf8'));
const PID_DIR = join(ROOT, REGISTRY.pidDir);
const LOG_DIR = join(ROOT, REGISTRY.logDir);
const PROD = join(ROOT, REGISTRY.productionRoot);

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function ensureDirs() {
  mkdirSync(PID_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
}

function isRunnable(site) {
  if (site.status === 'placeholder') return false;
  if (site.status === 'scaffolded') return true;
  return existsSync(join(sitePath(site), 'package.json'));
}

function resolveSites(selector) {
  const all = REGISTRY.sites;
  if (!selector || selector === 'all') {
    const runnable = all.filter(isRunnable);
    const skipped = all.length - runnable.length;
    if (skipped > 0) {
      console.log(`Note: skipping ${skipped} placeholder site(s); use "list" to see all reserved ports.`);
    }
    return runnable;
  }
  const ids = selector.split(',').map((s) => s.trim()).filter(Boolean);
  const found = [];
  for (const id of ids) {
    const site = all.find((s) => s.id === id || s.dir === id || s.domain === id);
    if (!site) die(`Unknown site: ${id}\nKnown: ${all.map((s) => s.id).join(', ')}`);
    if (!isRunnable(site)) {
      die(
        `${site.id} is a placeholder (port ${site.port} reserved). Scaffold it first — see docs/00-NEW-SITE-MASTER.md and docs/FLEET-PORT-REGISTRY.md`,
      );
    }
    found.push(site);
  }
  return found;
}

function sitePath(site) {
  return join(PROD, site.dir);
}

function pidFile(site) {
  return join(PID_DIR, `${site.id}.pid`);
}

function logFile(site) {
  return join(LOG_DIR, `${site.id}.log`);
}

function readPid(site) {
  const f = pidFile(site);
  if (!existsSync(f)) return null;
  const pid = Number(readFileSync(f, 'utf8').trim());
  return Number.isFinite(pid) ? pid : null;
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function cmdList() {
  console.log('Fleet sites (same ports as production systemd units):\n');
  console.log(['ID', 'DOMAIN', 'PORT', 'STATUS', 'PATH'].map((h) => h.padEnd(22)).join(''));
  for (const s of REGISTRY.sites) {
    console.log(
      [s.id, s.domain, String(s.port), s.status || '?', `Astro-production/${s.dir}`]
        .map((v, i) => v.padEnd(i === 4 ? 48 : 22))
        .join(''),
    );
  }
  const next = Math.max(...REGISTRY.sites.map((s) => s.port)) + 1;
  console.log(`\nNext free port: ${next}  ·  Full registry: docs/FLEET-PORT-REGISTRY.md`);
}

function ensureEnv(site) {
  const dir = sitePath(site);
  const envPath = join(dir, '.env');
  const example = join(dir, '.env.example');
  if (!existsSync(envPath)) {
    if (existsSync(example)) copyFileSync(example, envPath);
    else writeFileSync(envPath, '');
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  const map = new Map();
  const order = [];
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      order.push({ type: 'raw', line });
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) {
      order.push({ type: 'raw', line });
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);
    map.set(key, value);
    order.push({ type: 'kv', key });
  }

  const set = (key, value, { overwrite = false } = {}) => {
    const current = map.has(key) ? String(map.get(key)).trim() : '';
    if (!map.has(key)) {
      map.set(key, value);
      order.push({ type: 'kv', key });
      return;
    }
    if (overwrite || !current) map.set(key, value);
  };

  // Always keep the production canonical host. PUBLIC_* is inlined at `astro build`,
  // so overwriting with http://127.0.0.1:<port> ships localhost canonicals/og:url to prod.
  // Local fleet still listens on 127.0.0.1:<port>; only SEO absolute URLs use https://domain.
  const canonicalHost =
    site.canonicalHost ||
    (site.domain === 'evolutionmiddleast.com' ? 'www.evolutionmiddleast.com' : site.domain);
  const localUrl = `http://127.0.0.1:${site.port}`;
  set('PUBLIC_SITE_URL', `https://${canonicalHost}`, { overwrite: true });
  // Convenience for local testing — not used for Astro SEO/canonical bake-in.
  set('FLEET_LOCAL_URL', localUrl, { overwrite: true });
  set('INTERNAL_JOB_SECRET', 'local-fleet-test-secret', { overwrite: true });
  set('LEAD_STORE_DIR', '.data/leads', { overwrite: true });
  set('LOG_LEVEL', 'info');

  // Required by getServerEnv() when missing — do NOT overwrite real secrets.
  // Prefer empty over baking a fake token into the Astro server bundle.
  set('PIPEDRIVE_API_TOKEN', '');
  set('PIPEDRIVE_COMPANY_DOMAIN', 'connectgroup2');
  set('PIPEDRIVE_OWNER_ID', '');
  set('PIPEDRIVE_LEAD_SOURCE_ID', '270');
  set('WEBSITE_ID', '');

  // If a previous run left the local placeholder, clear it so .env can be fixed
  // without a manual edit, and so rebuilds don't keep baking a dead token.
  if (String(map.get('PIPEDRIVE_API_TOKEN') || '').trim() === 'local-dev-placeholder') {
    map.set('PIPEDRIVE_API_TOKEN', '');
  }
  const out = [];
  const written = new Set();
  let injectedLocalHint = false;
  for (const item of order) {
    if (item.type === 'raw') {
      // Drop stale local-hint comments so we don't stack duplicates on every env run.
      if (/^#\s*Local test URL \(fleet-local\)/.test(item.line)) continue;
      out.push(item.line);
      continue;
    }
    if (written.has(item.key)) continue;
    written.add(item.key);
    if (item.key === 'PUBLIC_SITE_URL' && !injectedLocalHint) {
      out.push(`# Local test URL (fleet-local): ${localUrl}  — keep PUBLIC_SITE_URL as https canonical`);
      injectedLocalHint = true;
    }
    out.push(`${item.key}=${map.get(item.key)}`);
  }
  for (const [key, value] of map) {
    if (written.has(key)) continue;
    if (key === 'PUBLIC_SITE_URL' && !injectedLocalHint) {
      out.push(`# Local test URL (fleet-local): ${localUrl}  — keep PUBLIC_SITE_URL as https canonical`);
      injectedLocalHint = true;
    }
    out.push(`${key}=${value}`);
  }

  writeFileSync(envPath, `${out.join('\n').replace(/\n+$/, '')}\n`);
  mkdirSync(join(dir, '.data', 'leads'), { recursive: true });
  console.log(`  env ready: ${site.dir}/.env → canonical https://${canonicalHost} · local ${localUrl}`);
}

/** Windows: Node execFileSync does not resolve .cmd shims without the extension. */
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runPnpm(site, args, label) {
  console.log(`\n▸ ${site.id}: ${label}`);
  execFileSync(PNPM, args, { cwd: sitePath(site), stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
}

function runPnpmRoot(args, label) {
  console.log(`\n▸ root: ${label}`);
  execFileSync(PNPM, args, { cwd: ROOT, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
}

async function stopSite(site) {
  const pid = readPid(site);
  if (pid && isAlive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* ignore */
    }
    for (let i = 0; i < 50 && isAlive(pid); i += 1) await sleep(100);
    if (isAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* ignore */
      }
    }
    console.log(`  stopped ${site.id} (pid ${pid})`);
  } else {
    console.log(`  ${site.id}: not running`);
  }
  if (existsSync(pidFile(site))) unlinkSync(pidFile(site));
}

function startSite(site) {
  const dir = sitePath(site);
  const entry = join(dir, 'dist/server/entry.mjs');
  if (!existsSync(entry)) die(`${site.id}: missing ${entry} — run build first`);
  ensureEnv(site);
  ensureDirs();

  const existing = readPid(site);
  if (existing && isAlive(existing)) {
    console.log(`  ${site.id}: already running (pid ${existing}) on :${site.port}`);
    return;
  }

  const fd = openSync(logFile(site), 'a');
  const child = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(site.port),
      NODE_ENV: 'production',
    },
    detached: true,
    stdio: ['ignore', fd, fd],
  });
  child.unref();
  writeFileSync(pidFile(site), String(child.pid));
  console.log(
    `  started ${site.id} pid=${child.pid} http://127.0.0.1:${site.port}/  (log: local/logs/${site.id}.log)`,
  );
}

function cmdStatus(sites) {
  for (const site of sites) {
    const pid = readPid(site);
    const alive = isAlive(pid);
    console.log(
      `${alive ? 'UP  ' : 'DOWN'}  ${site.id.padEnd(22)} :${String(site.port).padEnd(6)} ${alive ? `pid ${pid}` : ''}`,
    );
  }
}

async function fetchStatus(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: 'manual', ...opts });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: 0, body: String(err) };
  }
}

async function smokeSite(site) {
  const base = `http://127.0.0.1:${site.port}`;
  const rows = [];

  {
    const r = await fetchStatus(`${base}/`);
    rows.push({ name: 'homepage', pass: r.status === 200, detail: `HTTP ${r.status}` });
  }

  {
    const r = await fetchStatus(`${base}/api/health/`);
    let jsonOk = false;
    try {
      jsonOk = JSON.parse(r.body).ok === true;
    } catch {
      /* */
    }
    rows.push({
      name: 'health',
      pass: r.status === 200 && jsonOk,
      detail: `HTTP ${r.status} ${r.body.slice(0, 90)}`,
    });
  }

  {
    const r = await fetchStatus(`${base}/this-should-404-fleet-test/`);
    rows.push({ name: '404', pass: r.status === 404, detail: `HTTP ${r.status}` });
  }

  {
    const r = await fetchStatus(`${base}/api/internal/leads/?limit=1`);
    rows.push({
      name: 'internal-deny',
      pass: r.status === 401 || r.status === 403,
      detail: `HTTP ${r.status}`,
    });
  }

  {
    const r = await fetchStatus(`${base}/api/internal/leads/?limit=1`, {
      headers: { Authorization: 'Bearer local-fleet-test-secret' },
    });
    rows.push({
      name: 'internal-auth',
      pass: r.status === 200,
      detail: `HTTP ${r.status} ${r.body.slice(0, 80)}`,
    });
  }

  {
    const r = await fetchStatus(`${base}/api/contact/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: base,
      },
      body: JSON.stringify({
        name: 'Local Smoke',
        email: 'smoke@example.com',
        phone: '+971500000000',
        message: 'local fleet smoke',
        website: '',
      }),
    });
    let success = false;
    try {
      const j = JSON.parse(r.body);
      success = j.success === true || j.ok === true;
    } catch {
      /* */
    }
    rows.push({
      name: 'contact',
      pass: r.status === 200 && success,
      detail: `HTTP ${r.status} ${r.body.slice(0, 100)}`,
    });
  }

  console.log(`\n=== smoke ${site.id} (${base}) ===`);
  let failed = 0;
  for (const row of rows) {
    if (!row.pass) failed += 1;
    console.log(`  ${row.pass ? 'PASS' : 'FAIL'}  ${row.name.padEnd(16)} ${row.detail}`);
  }
  return failed;
}

async function cmdSmoke(sites) {
  let failed = 0;
  for (const site of sites) {
    const pid = readPid(site);
    if (!isAlive(pid)) {
      console.log(`\n=== smoke ${site.id} ===`);
      console.log('  FAIL  site not running — start first');
      failed += 1;
      continue;
    }
    failed += await smokeSite(site);
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
  return failed;
}

async function main() {
  const [command, selector] = process.argv.slice(2);
  if (!command) {
    console.log(`Usage: node scripts/fleet-local.mjs <command> [site-id|all]

Commands: list | env | install | build | start | stop | restart | status | smoke | up

Package manager: pnpm workspace (shared .pnpm-store + root catalog in pnpm-workspace.yaml)

Primary local trio:
  evolutionmiddleast, cbss, spheavyrental

Example:
  node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental
  node scripts/fleet-local.mjs smoke evolutionmiddleast,cbss,spheavyrental
`);
    process.exit(0);
  }

  const sites =
    command === 'list' ? REGISTRY.sites : resolveSites(selector || 'all');
  ensureDirs();

  switch (command) {
    case 'list':
      cmdList();
      break;
    case 'env':
      for (const s of sites) ensureEnv(s);
      break;
    case 'install':
      for (const s of sites) ensureEnv(s);
      runPnpmRoot(['install'], 'pnpm install (workspace)');
      break;
    case 'build':
      for (const s of sites) {
        ensureEnv(s);
        if (!existsSync(join(sitePath(s), 'node_modules', 'astro'))) {
          runPnpmRoot(['install'], 'pnpm install (workspace)');
        }
        runPnpm(s, ['run', 'build'], 'pnpm run build');
      }
      break;
    case 'stop':
      for (const s of sites) await stopSite(s);
      break;
    case 'start':
      for (const s of sites) startSite(s);
      break;
    case 'restart':
      for (const s of sites) {
        await stopSite(s);
        startSite(s);
      }
      break;
    case 'status':
      cmdStatus(sites);
      break;
    case 'smoke': {
      const failed = await cmdSmoke(sites);
      process.exit(failed ? 1 : 0);
      break;
    }
    case 'up': {
      for (const s of sites) ensureEnv(s);
      if (!existsSync(join(ROOT, 'pnpm-lock.yaml')) || !existsSync(join(PROD, sites[0].dir, 'node_modules', 'astro'))) {
        runPnpmRoot(['install'], 'pnpm install (workspace)');
      }
      for (const s of sites) {
        runPnpm(s, ['run', 'build'], 'pnpm run build');
        startSite(s);
      }
      console.log('\nWaiting for listen…');
      await sleep(2000);
      const failed = await cmdSmoke(sites);
      process.exit(failed ? 1 : 0);
      break;
    }
    default:
      die(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
