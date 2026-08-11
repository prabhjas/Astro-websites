import { readFileSync, writeFileSync } from 'node:fs';

const envPath = 'd:/Astro-websites/Astro-production/emiratisationnafis.org/.env';
let raw = readFileSync(envPath, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

const map = new Map();
const order = [];
for (const line of raw.split(/\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#')) {
    order.push({ type: 'raw', line });
    continue;
  }
  const i = line.indexOf('=');
  if (i < 0) {
    order.push({ type: 'raw', line });
    continue;
  }
  const k = line.slice(0, i);
  const v = line.slice(i + 1);
  map.set(k, v);
  order.push({ type: 'kv', key: k });
}

function set(k, v) {
  map.set(k, v);
  if (![...order].some((o) => o.type === 'kv' && o.key === k)) {
    order.push({ type: 'kv', key: k });
  }
}

// Local smoke needs non-empty Pipedrive fields so getServerEnv() can load.
// Token is intentionally invalid for live PD — lead file store still works.
set('INTERNAL_JOB_SECRET', 'local-fleet-test-secret');
set('PIPEDRIVE_API_TOKEN', 'local-smoke-token-not-for-prod');
set('PIPEDRIVE_COMPANY_DOMAIN', 'connectgroup2');
set('PIPEDRIVE_OWNER_ID', '1');
set('PIPEDRIVE_LEAD_SOURCE_ID', '270');
set('WEBSITE_ID', '5108');
set('WEBSITE_NAME', 'Emiratisation Nafis');
set('FORM_NAME', 'Emiratisation Nafis Contact Form');
set('LEAD_TITLE_PREFIX', 'Emiratisation Nafis');
set('PUBLIC_SITE_URL', 'https://emiratisationnafis.org');
set('PUBLIC_GTM_ID', '');

const written = new Set();
const out = [];
for (const item of order) {
  if (item.type === 'raw') {
    out.push(item.line);
    continue;
  }
  if (written.has(item.key)) continue;
  written.add(item.key);
  out.push(`${item.key}=${map.get(item.key) ?? ''}`);
}
for (const [k, v] of map) {
  if (!written.has(k)) out.push(`${k}=${v}`);
}

writeFileSync(envPath, out.join('\n').replace(/\n+$/, '\n'), 'utf8');
console.log('Updated .env for local smoke (no secrets printed)');
for (const k of [
  'INTERNAL_JOB_SECRET',
  'PIPEDRIVE_API_TOKEN',
  'PIPEDRIVE_OWNER_ID',
  'WEBSITE_ID',
]) {
  console.log(k, 'len', String(map.get(k) || '').trim().length);
}
