/**
 * Download Connect Freelance email-signature style images from live WP media.
 * Usage: node scripts/download-signature-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, access } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ORIGIN = 'https://connectfreelance.ae';

const SEARCHES = [
  'signature',
  'EMAIL-SIGNATURE',
  'EMAIL SIGNATURE',
  'Vadakkan',
  'Jennifer-Nathan-Connect-Freelance',
  'Connect-Freelance-scaled',
  'andre-signature',
];

/** Keep signature banners / email signatures; drop logos, CTAs, videos, blog hero fluff. */
function isSignatureAsset(url) {
  const u = url.toLowerCase();
  if (!/\.(png|jpe?g|webp)$/i.test(u)) return false;
  if (/\/logo-|cta|spring-offer|video|\.mp4|working-visa|obtain-a-dubai/i.test(u)) return false;
  return (
    /email-signature|email_signature|signature/i.test(u) ||
    /-[Cc]onnect-[Ff]reelance(-scaled)?\.(png|jpe?g|webp)$/.test(url) ||
    /Martin-J\.-Vadakkan|Jennifer-Nathan-Connect-Freelance/i.test(url)
  );
}

async function fetchMedia(search) {
  const urls = [];
  let page = 1;
  while (page <= 5) {
    const api = `${ORIGIN}/wp-json/wp/v2/media?search=${encodeURIComponent(search)}&per_page=100&page=${page}&_fields=source_url,mime_type,slug`;
    const res = await fetch(api, {
      headers: { Accept: 'application/json', 'User-Agent': 'CF-Signature-Download/1.0' },
    });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const item of batch) {
      if (item.source_url) urls.push(item.source_url);
    }
    if (batch.length < 100) break;
    page += 1;
  }
  return urls;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(absoluteUrl) {
  const u = new URL(absoluteUrl);
  const rel = u.pathname; // /wp-content/uploads/...
  const dest = path.join(PUBLIC, rel.replace(/^\//, ''));
  if (await exists(dest)) {
    return { status: 'skip', rel };
  }
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(absoluteUrl, {
    headers: { 'User-Agent': 'CF-Signature-Download/1.0' },
  });
  if (!res.ok) return { status: 'fail', rel, code: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { status: 'ok', rel, bytes: buf.length };
}

async function main() {
  const found = new Set();
  for (const q of SEARCHES) {
    console.log('search:', q);
    const urls = await fetchMedia(q);
    for (const url of urls) found.add(url.split('?')[0]);
  }

  // Always include the example the user shared (+ common variants)
  found.add(`${ORIGIN}/wp-content/uploads/2026/07/Martin-J.-Vadakkan-Connect-Freelance-scaled.png`);
  found.add(`${ORIGIN}/wp-content/uploads/2025/11/Martin-Vadakkan.png`);
  found.add(`${ORIGIN}/wp-content/uploads/2026/02/Jennifer-Nathan-Connect-Freelance.png`);
  found.add(`${ORIGIN}/wp-content/uploads/2026/02/Jennifer-Nathan-Connect-Freelance-2.png`);

  const targets = [...found].filter(isSignatureAsset).sort();
  console.log(`\nUnique signature assets: ${targets.length}`);

  const results = { ok: 0, skip: 0, fail: 0, files: [] };
  for (const url of targets) {
    const r = await downloadOne(url);
    results[r.status] = (results[r.status] || 0) + 1;
    results.files.push({ url, ...r });
    console.log(r.status.toUpperCase(), r.rel, r.bytes ? `(${r.bytes} bytes)` : r.code || '');
  }

  const manifest = path.join(ROOT, 'imports', 'signatures', 'downloaded.json');
  await mkdir(path.dirname(manifest), { recursive: true });
  await writeFile(
    manifest,
    JSON.stringify({ downloadedAt: new Date().toISOString(), count: targets.length, results }, null, 2) +
      '\n',
  );
  console.log(`\nDone. ok=${results.ok} skip=${results.skip} fail=${results.fail}`);
  console.log('Manifest:', manifest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
