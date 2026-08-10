#!/usr/bin/env node
/**
 * Wire local .env for forms/GTM without printing secrets.
 * Copies Pipedrive token/owner from a same-company peer when empty.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
const PEER = join(ROOT, '..', 'emiratisationgate.org', '.env');

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    // Drop accidental inline comments (value must not contain # for our keys)
    if (!val.startsWith('"') && !val.startsWith("'") && val.includes(' #')) {
      val = val.split(' #')[0].trim();
    }
    out[key] = val;
  }
  return out;
}

function setLine(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) return text.replace(re, `${key}=${value}`);
  return `${text.trimEnd()}\n${key}=${value}\n`;
}

if (!existsSync(ENV_PATH)) {
  console.error('Missing .env');
  process.exit(1);
}

let text = readFileSync(ENV_PATH, 'utf8');
const cur = parseEnv(text);
const peer = existsSync(PEER) ? parseEnv(readFileSync(PEER, 'utf8')) : {};

const updates = {
  WEBSITE_ID: '4795',
  PUBLIC_GTM_ID: '',
  PUBLIC_GA4_ID: 'G-7B6EW1N2SB',
};

if (!cur.PIPEDRIVE_API_TOKEN && peer.PIPEDRIVE_API_TOKEN) {
  updates.PIPEDRIVE_API_TOKEN = peer.PIPEDRIVE_API_TOKEN;
}
if (!cur.PIPEDRIVE_OWNER_ID && peer.PIPEDRIVE_OWNER_ID) {
  updates.PIPEDRIVE_OWNER_ID = peer.PIPEDRIVE_OWNER_ID;
}
if (!cur.PIPEDRIVE_COMPANY_DOMAIN) {
  updates.PIPEDRIVE_COMPANY_DOMAIN = peer.PIPEDRIVE_COMPANY_DOMAIN || 'connectgroup2';
}

for (const [k, v] of Object.entries(updates)) {
  text = setLine(text, k, v);
}

writeFileSync(ENV_PATH, text, 'utf8');

const after = parseEnv(text);
console.log(
  JSON.stringify(
    {
      WEBSITE_ID: after.WEBSITE_ID || 'EMPTY',
      PUBLIC_GTM_ID: after.PUBLIC_GTM_ID ? `SET(len=${after.PUBLIC_GTM_ID.length})` : 'EMPTY',
      PUBLIC_GA4_ID: after.PUBLIC_GA4_ID || 'EMPTY',
      PIPEDRIVE_API_TOKEN: after.PIPEDRIVE_API_TOKEN ? `SET(len=${after.PIPEDRIVE_API_TOKEN.length})` : 'EMPTY',
      PIPEDRIVE_OWNER_ID: after.PIPEDRIVE_OWNER_ID || 'EMPTY',
      PIPEDRIVE_COMPANY_DOMAIN: after.PIPEDRIVE_COMPANY_DOMAIN || 'EMPTY',
      copiedTokenFromPeer: Boolean(updates.PIPEDRIVE_API_TOKEN),
      copiedOwnerFromPeer: Boolean(updates.PIPEDRIVE_OWNER_ID),
    },
    null,
    2,
  ),
);
