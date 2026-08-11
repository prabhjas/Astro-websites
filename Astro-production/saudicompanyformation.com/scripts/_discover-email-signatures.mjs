#!/usr/bin/env node
/**
 * Discover email signature images on live saudicompanyformation.com (WP media + HTML mirrors).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://saudicompanyformation.com';

function isSignatureUrl(u) {
  return /signature|email-sign|e-sign/i.test(u);
}

async function fetchMedia() {
  const urls = new Set();
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${ORIGIN}/wp-json/wp/v2/media?per_page=100&page=${page}`, {
      headers: { 'User-Agent': 'KPM-Astro-signatures' },
    });
    if (!r.ok) {
      console.warn('media API', r.status);
      break;
    }
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const m of batch) {
      const u = String(m.source_url || '').split('?')[0];
      const meta = `${m.title?.rendered || ''} ${m.slug || ''}`;
      if (isSignatureUrl(u + meta)) urls.add(u);
    }
    if (page >= Number(r.headers.get('X-WP-TotalPages') || 1)) break;
  }
  return urls;
}

function scanLegacy() {
  const urls = new Set();
  const dir = path.join(ROOT, 'src/legacy');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.cleaned.html')) continue;
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of t.matchAll(/(?:https?:\/\/saudicompanyformation\.com)?(\/wp-content\/uploads\/[^"'\s)]+)/gi)) {
      let u = m[1] || m[0];
      if (u.startsWith('http')) {
        try {
          u = new URL(u).pathname;
        } catch {
          continue;
        }
      }
      if (isSignatureUrl(u)) urls.add(`${ORIGIN}${u}`);
    }
  }
  return urls;
}

async function scanConnectGroupUploads() {
  // KPM may share Connect Group signature assets on connectresources uploads
  const crUrls = path.join(
    ROOT,
    '../connectresources.ae/public/media/email-signatures/urls.txt',
  );
  if (!fs.existsSync(crUrls)) return new Set();
  const kpm = new Set();
  for (const line of fs.readFileSync(crUrls, 'utf8').split('\n')) {
    const u = line.trim();
    if (!u) continue;
    if (/kpm|kpmp/i.test(u)) kpm.add(u);
  }
  return kpm;
}

const fromMedia = await fetchMedia();
const fromLegacy = scanLegacy();
const fromCr = await scanConnectGroupUploads();

const all = new Set([...fromMedia, ...fromLegacy, ...fromCr]);
const sorted = [...all].sort();

const outDir = path.join(ROOT, 'public/media/email-signatures');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'urls.txt'), `${sorted.join('\n')}\n`);

console.log(
  JSON.stringify(
    {
      fromMedia: fromMedia.size,
      fromLegacy: fromLegacy.size,
      fromCr: fromCr.size,
      total: sorted.length,
      sample: sorted.slice(0, 15),
    },
    null,
    2,
  ),
);
