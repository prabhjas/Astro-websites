#!/usr/bin/env node
/**
 * Download missing /wp-content assets referenced by cleaned HTML from the live origin.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectbusinesscenter.com';
const CONCURRENCY = 8;

function normalizeAssetPath(raw) {
  let u = String(raw || '')
    .trim()
    .replace(/\\+\//g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .split('#')[0]
    .split('?')[0]
    .trim();
  if (!u || u.startsWith('data:') || u.includes('*')) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  u = u.replace(/^https?:\/\/(?:www\.)?connectbusinesscenter\.com/i, '');
  if (!u.startsWith('/')) return null;
  // reject srcset blobs that weren't split
  if (u.includes(',')) return null;
  if (/\s+\d+w$/i.test(u)) u = u.replace(/\s+\d+w$/i, '');
  if (!u.includes('/wp-content/') && !u.includes('/wp-includes/')) return null;
  if (!/\.(png|jpe?g|webp|gif|svg|avif|ico|css|js|mjs|map|woff2?|ttf|eot|otf|mp4|webm|json)($)/i.test(u)) {
    // allow extensionless only under plugins themes rarely — skip
    return null;
  }
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep encoded */
  }
  // illegal windows
  if (/[<>:"|?*]/.test(u)) return null;
  return u;
}

function splitSrcset(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function collectFromHtml(html) {
  const found = new Set();
  const add = (raw) => {
    const p = normalizeAssetPath(raw);
    if (p) found.add(p);
  };

  for (const m of html.matchAll(/\b(?:src|data-src|data-lazy-src|data-bg|data-large_image|href|poster)=["']([^"']+)["']/gi)) {
    add(m[1]);
  }
  for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const part of splitSrcset(m[1])) add(part);
  }
  for (const m of html.matchAll(/\bdata-lazy-srcset=["']([^"']+)["']/gi)) {
    for (const part of splitSrcset(m[1])) add(part);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    add(m[1]);
  }
  // Elementor escaped JSON urls
  for (const m of html.matchAll(/https?:\\\/\\\/(?:www\.)?connectbusinesscenter\.com(\\\/[^"'\\]+)/gi)) {
    add(m[0].replace(/\\\//g, '/'));
  }
  for (const m of html.matchAll(/["'](\/wp-content\/[^"']+)["']/gi)) {
    if (m[1].includes(',')) {
      for (const part of splitSrcset(m[1])) add(part);
    } else {
      add(m[1]);
    }
  }
  return found;
}

function localExists(rel) {
  const abs = join(PUBLIC, rel.replace(/^\//, ''));
  return existsSync(abs) && statSync(abs).size > 0;
}

async function downloadOne(rel) {
  const abs = join(PUBLIC, rel.replace(/^\//, ''));
  mkdirSync(dirname(abs), { recursive: true });
  const url = ORIGIN + encodeURI(rel).replace(/%2F/gi, '/');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CBC-asset-backfill/1.0', Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    return { rel, ok: false, status: res.status };
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(abs));
  const size = statSync(abs).size;
  if (size === 0) {
    return { rel, ok: false, status: 'empty' };
  }
  return { rel, ok: true, status: 200, size };
}

async function main() {
  const dry = process.argv.includes('--dry');
  const files = readdirSync(LEGACY).filter((f) => f.endsWith('.cleaned.html'));
  const needed = new Set();
  for (const f of files) {
    const html = readFileSync(join(LEGACY, f), 'utf8');
    for (const p of collectFromHtml(html)) needed.add(p);
  }
  const missing = [...needed].filter((p) => !localExists(p)).sort();
  console.log(JSON.stringify({ pages: files.length, referenced: needed.size, missing: missing.length, dry }, null, 2));
  writeFileSync(join(ROOT, 'source/missing-asset-paths.json'), JSON.stringify(missing, null, 2));
  if (dry) {
    console.log(missing.slice(0, 40).join('\n'));
    return;
  }

  let ok = 0;
  let fail = 0;
  const failures = [];
  let i = 0;
  async function worker() {
    while (i < missing.length) {
      const idx = i++;
      const rel = missing[idx];
      try {
        const r = await downloadOne(rel);
        if (r.ok) {
          ok++;
          if (ok % 25 === 0) console.log(`[${ok + fail}/${missing.length}] ok=${ok} fail=${fail}`);
        } else {
          fail++;
          failures.push(r);
        }
      } catch (e) {
        fail++;
        failures.push({ rel, ok: false, status: String(e.message || e) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  writeFileSync(
    join(ROOT, 'source/missing-asset-download-report.json'),
    JSON.stringify({ ok, fail, failures: failures.slice(0, 200) }, null, 2),
  );
  console.log(JSON.stringify({ ok, fail, sampleFails: failures.slice(0, 15) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
