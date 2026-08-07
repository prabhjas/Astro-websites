#!/usr/bin/env node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
/**
 * Download email signature images listed in public/media/email-signatures/urls.txt
 * into the same folder (flat filenames like connectresources.ae).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const listPath = path.join(ROOT, 'public/media/email-signatures/urls.txt');
const outDir = path.dirname(listPath);

if (!fs.existsSync(listPath)) {
  console.error('Run scripts/_discover-email-signatures.mjs first');
  process.exit(1);
}

const urls = fs
  .readFileSync(listPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

function destName(url) {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean);
  // uploads/2024/11/CONNECT-EMAIL-SIGNATURE-MARVEL.jpg → 2024-11-CONNECT-EMAIL-SIGNATURE-MARVEL.jpg
  const uploadsIdx = parts.indexOf('uploads');
  const rel = uploadsIdx >= 0 ? parts.slice(uploadsIdx + 1) : parts.slice(-2);
  return rel.join('-').replace(/[^a-zA-Z0-9._-]+/g, '-');
}

let saved = 0;
let skipped = 0;
const failed = [];

for (const url of urls) {
  const name = destName(url);
  const dest = path.join(outDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
    skipped++;
    continue;
  }
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'KPM-Astro-signatures' } });
    if (!r.ok) {
      failed.push([url, r.status]);
      continue;
    }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    saved++;
    console.log('saved', name);
  } catch (e) {
    failed.push([url, e.message]);
  }
}

console.log(JSON.stringify({ total: urls.length, saved, skipped, failed: failed.length }, null, 2));
if (failed.length) {
  console.log('failures', failed.slice(0, 20));
}
