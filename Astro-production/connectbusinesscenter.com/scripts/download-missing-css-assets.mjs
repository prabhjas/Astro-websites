#!/usr/bin/env node
/**
 * Collect url(...) from Elementor/theme CSS linked by cleaned pages + any CSS under public/,
 * then download missing assets from the live origin.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectbusinesscenter.com';
const CONCURRENCY = 8;
const dry = process.argv.includes('--dry');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function normalizeAssetPath(raw, cssPath = '/') {
  let u = String(raw || '')
    .trim()
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&')
    .split('#')[0]
    .split('?')[0]
    .trim();
  if (!u || u.startsWith('data:') || u.includes('*')) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  if (/^https?:\/\//i.test(u)) {
    if (!/connectbusinesscenter\.com/i.test(u)) return null;
    u = u.replace(/^https?:\/\/(?:www\.)?connectbusinesscenter\.com/i, '');
  } else if (u.startsWith('/')) {
    // ok
  } else {
    try {
      u = new URL(u, 'https://connectbusinesscenter.com' + cssPath.replace(/\/[^/]*$/, '/')).pathname;
    } catch {
      return null;
    }
  }
  if (!/\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf|eot|otf|mp4|webm)($)/i.test(u)) return null;
  if (/[<>:"|?*]/.test(u)) return null;
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep */
  }
  return u;
}

function urlsFromCss(text, cssPath) {
  const found = new Set();
  for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    const p = normalizeAssetPath(m[2], cssPath);
    if (p) found.add(p);
  }
  return found;
}

function cssHrefsFromHtml(html) {
  const hrefs = new Set();
  for (const m of html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)) {
    let u = m[1].split('?')[0].replace(/^https?:\/\/(?:www\.)?connectbusinesscenter\.com/i, '');
    if (u.startsWith('/')) hrefs.add(u);
  }
  return hrefs;
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
    headers: { 'User-Agent': 'CBC-css-asset-backfill/1.0', Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) return { rel, ok: false, status: res.status };
  await pipeline(Readable.fromWeb(res.body), createWriteStream(abs));
  const size = statSync(abs).size;
  if (!size) return { rel, ok: false, status: 'empty' };
  return { rel, ok: true, size };
}

async function main() {
  const needed = new Set();

  // 1) CSS linked from cleaned HTML
  for (const f of readdirSync(LEGACY).filter((x) => x.endsWith('.cleaned.html'))) {
    const html = readFileSync(join(LEGACY, f), 'utf8');
    for (const href of cssHrefsFromHtml(html)) {
      const abs = join(PUBLIC, href.replace(/^\//, ''));
      if (!existsSync(abs)) continue;
      for (const p of urlsFromCss(readFileSync(abs, 'utf8'), href)) needed.add(p);
    }
  }

  // 2) All CSS already under public (catches nested urls)
  for (const abs of walk(PUBLIC).filter((p) => extname(p).toLowerCase() === '.css')) {
    const rel = '/' + abs.slice(PUBLIC.length + 1).replace(/\\/g, '/');
    for (const p of urlsFromCss(readFileSync(abs, 'utf8'), rel)) needed.add(p);
  }

  const missing = [...needed].filter((p) => !localExists(p)).sort();
  console.log(JSON.stringify({ referencedFromCss: needed.size, missing: missing.length, dry }, null, 2));
  writeFileSync(join(ROOT, 'source/missing-css-asset-paths.json'), JSON.stringify(missing, null, 2));
  if (dry) {
    console.log(missing.slice(0, 60).join('\n'));
    return;
  }

  let ok = 0;
  let fail = 0;
  const failures = [];
  let i = 0;
  async function worker() {
    while (i < missing.length) {
      const rel = missing[i++];
      try {
        const r = await downloadOne(rel);
        if (r.ok) {
          ok++;
          if (ok % 20 === 0) console.log(`progress ok=${ok} fail=${fail}`);
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
    join(ROOT, 'source/missing-css-download-report.json'),
    JSON.stringify({ ok, fail, failures }, null, 2),
  );
  console.log(JSON.stringify({ ok, fail, sampleFails: failures.slice(0, 20) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
