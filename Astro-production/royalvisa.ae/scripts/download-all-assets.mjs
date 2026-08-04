#!/usr/bin/env node
/**
 * Download ALL localizable Royal Visa assets referenced by cleaned HTML + public CSS/JS.
 *
 * Usage: node scripts/download-all-assets.mjs
 */
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://royalvisa.ae';
const ORIGIN_ALIASES = [
  'https://royalvisa.ae',
  'https://www.royalvisa.ae',
  'http://royalvisa.ae',
  'http://www.royalvisa.ae',
];
const CONCURRENCY = 10;

function shouldLocalize(url) {
  try {
    const u = new URL(url);
    if (!ORIGIN_ALIASES.includes(u.origin)) return false;
    if (/[<>:"|?*\s]/.test(u.pathname) || u.pathname.includes('%20')) return false;
    return (
      u.pathname.startsWith('/wp-content/') ||
      u.pathname.startsWith('/wp-includes/') ||
      /\.(css|js|mjs|map|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|json|mp4|webm|mov)$/i.test(
        u.pathname,
      )
    );
  } catch {
    return false;
  }
}

function sanitizePathSegment(text) {
  return text.replace(/[\u2028\u2029]/g, '-');
}

function toLocalPath(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const parts = pathname.split('/');
  return parts.map((part, i) => (i < parts.length - 1 ? part : sanitizePathSegment(part))).join('/');
}

function unescapeElementorUrls(text) {
  return text.replace(
    /https?:\\\/\\\/(?:www\.)?royalvisa\.ae/gi,
    'https://royalvisa.ae',
  );
}

function collectUrls(text) {
  const found = new Set();
  const normalized = unescapeElementorUrls(text)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/');

  const patterns = [
    /https?:\/\/(?:www\.)?royalvisa\.ae\/[^"'<>\\)\s]+/gi,
    /url\(\s*['"]?(https?:\/\/(?:www\.)?royalvisa\.ae[^'")]+)['"]?\s*\)/gi,
    /(?:^|["'\s(:,])(\/wp-content\/(?:uploads|plugins|themes|cache)\/[^"'<>?\s,]+\.(?:mp4|webm|mov|svg|json|png|jpe?g|webp|gif|woff2?|ttf|eot|otf|css|js|mjs|map|ico|avif))/gi,
    /(?:^|["'\s(:,])(\/wp-includes\/[^"'<>?\s,]+\.(?:css|js|mjs|map|png|svg|woff2?|ttf|eot|otf|json))/gi,
  ];

  for (const re of patterns) {
    for (const match of normalized.matchAll(re)) {
      let raw = match[1] || match[0];
      raw = raw.replace(/\\/g, '').trim();
      raw = raw.split('"')[0].split("'")[0].split('&')[0];
      raw = raw.split(/\s+\d+w/)[0].split(/\s*\*\//)[0].split(',')[0];
      raw = raw.replace(/[.,;)\]]+$/, '').replace(/\s+\*$/, '').trim();
      if (raw.startsWith('/wp-content/') || raw.startsWith('/wp-includes/')) {
        raw = ORIGIN + raw;
      }
      if (shouldLocalize(raw)) found.add(raw.split('#')[0].split('?')[0]);
    }
  }
  return [...found];
}

function rewriteOriginUrls(text) {
  let out = text.replace(/https?:\\\/\\\/(?:www\.)?royalvisa\.ae/gi, '');
  // Absolute origins FIRST — bare //domain before this turns https://x into https:/x
  out = out.replace(/https?:\/\/(?:www\.)?royalvisa\.ae(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&').split('#')[0],
  );
  out = out.replace(/(?<!:)\/\/(?:www\.)?royalvisa\.ae(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&').split('#')[0],
  );
  out = out.replace(/https?:\/(?!\/)(wp-content|wp-includes)\//gi, '/$1/');
  return out;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(remoteUrl, destPath) {
  if (await fileExists(destPath)) return { remoteUrl, destPath, status: 'skipped' };
  await mkdir(dirname(destPath), { recursive: true });
  const res = await fetch(remoteUrl, {
    headers: {
      'User-Agent': 'Royal Visa-Astro-Migrator/0.1',
      Accept: '*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    return { remoteUrl, destPath, status: 'failed', error: `${res.status} ${res.statusText}` };
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return { remoteUrl, destPath, status: 'downloaded' };
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function walkFiles(dir, exts) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (!exts || exts.has(extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

async function downloadList(remotes) {
  if (!remotes.length) return { downloaded: 0, skipped: 0, failed: 0 };
  const jobs = remotes.map((remote) => ({
    remote,
    dest: join(PUBLIC, toLocalPath(remote).replace(/^\//, '')),
  }));
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const results = await mapPool(jobs, CONCURRENCY, async (job) => {
    try {
      return await downloadOne(job.remote, job.dest);
    } catch (err) {
      return { remoteUrl: job.remote, destPath: job.dest, status: 'failed', error: String(err) };
    }
  });
  for (const r of results) {
    if (r.status === 'downloaded') downloaded++;
    else if (r.status === 'skipped') skipped++;
    else {
      failed++;
      console.warn('FAIL', r.remoteUrl, r.error);
    }
  }
  return { downloaded, skipped, failed };
}

async function main() {
  const urls = new Set();
  const legacyDir = join(ROOT, 'src/legacy');
  const htmlFiles = await walkFiles(legacyDir, new Set(['.html']));
  console.log(`Scanning ${htmlFiles.length} cleaned HTML filesâ€¦`);
  for (const file of htmlFiles) {
    const raw = await readFile(file, 'utf8');
    for (const u of collectUrls(raw)) urls.add(u);
  }

  console.log(`Found ${urls.size} asset URLs from HTML`);
  let stats = await downloadList([...urls]);
  console.log(
    `HTML pass: ${stats.downloaded} new, ${stats.skipped} cached, ${stats.failed} failed`,
  );

  // Nested CSS/JS pass (up to 2 rounds)
  for (let round = 1; round <= 2; round++) {
    const files = await walkFiles(PUBLIC, new Set(['.css', '.js', '.mjs']));
    const nested = new Set();
    let rewritten = 0;
    for (const file of files) {
      const raw = await readFile(file, 'utf8');
      if (!/royalvisa\.ae/.test(raw) && !raw.includes('/wp-content/') && !raw.includes('/wp-includes/')) {
        continue;
      }
      for (const u of collectUrls(raw)) nested.add(u);
      const next = rewriteOriginUrls(raw);
      if (next !== raw) {
        await writeFile(file, next, 'utf8');
        rewritten++;
      }
    }
    console.log(`Round ${round}: rewrote ${rewritten} CSS/JS, found ${nested.size} nested URLs`);
    if (!nested.size) break;
    stats = await downloadList([...nested]);
    console.log(
      `Round ${round} download: ${stats.downloaded} new, ${stats.skipped} cached, ${stats.failed} failed`,
    );
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
