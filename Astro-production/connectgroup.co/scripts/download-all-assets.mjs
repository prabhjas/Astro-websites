#!/usr/bin/env node
/**
 * Download ALL localizable Connect Group assets referenced by:
 * - src/legacy/*.cleaned.html
 * - src/legacy/chrome/*
 * - public/chrome/*
 * - CSS/JS already under public/wp-content and public/wp-includes
 *
 * Usage: node scripts/download-all-assets.mjs
 */
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectgroup.co';
const CONCURRENCY = 10;

function shouldLocalize(url) {
  try {
    const u = new URL(url);
    if (u.origin !== ORIGIN) return false;
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
  return text.replace(/https:\\\/\\\/connectgroup\.co/gi, 'https://connectgroup.co');
}

function collectUrls(text) {
  const found = new Set();
  const normalized = unescapeElementorUrls(text)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/');

  const patterns = [
    /https:\/\/connectgroup\.co\/[^"'<>\\)\s]+/gi,
    /url\(\s*['"]?(https:\/\/connectgroup\.co[^'")]+)['"]?\s*\)/gi,
    /(?:^|["'\s(:,])(\/wp-content\/(?:uploads|plugins|themes)\/[^"'<>?]+\.(?:mp4|webm|mov|svg|json|png|jpe?g|webp|gif|woff2?|ttf|eot|otf|css|js|mjs|map|ico|avif))/gi,
    /(?:^|["'\s(:,])(\/wp-includes\/[^"'<>?]+\.(?:css|js|mjs|map|png|svg|woff2?|ttf|eot|otf|json))/gi,
  ];

  for (const re of patterns) {
    for (const match of normalized.matchAll(re)) {
      let raw = match[1] || match[0];
      raw = raw.replace(/\\/g, '').trim();
      raw = raw.split('"')[0].split("'")[0].split('&')[0];
      // Split srcset-like concatenations
      if (/\s+\d+[wx]\b/i.test(raw) || raw.includes(', http') || raw.includes(', /')) {
        const parts = raw.split(/,\s*/);
        for (const p of parts) {
          let piece = p.trim().split(/\s+/)[0];
          piece = piece.replace(/[.,;)\]]+$/, '');
          if (piece.startsWith('/wp-content/') || piece.startsWith('/wp-includes/')) {
            piece = ORIGIN + piece;
          }
          if (shouldLocalize(piece)) found.add(piece.split('#')[0].split('?')[0]);
        }
        continue;
      }
      raw = raw.replace(/[.,;)\]]+$/, '');
      // Strip trailing CSS junk from bad regex captures
      raw = raw.replace(/\s*\*\/.*$/, '').replace(/\s+no-repeat.*$/i, '');
      if (raw.startsWith('/wp-content/') || raw.startsWith('/wp-includes/')) {
        raw = ORIGIN + raw;
      }
      if (shouldLocalize(raw)) found.add(raw.split('#')[0].split('?')[0]);
    }
  }
  return [...found];
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
  const safeDestPath = destPath
    .split(/[/\\]/)
    .map((part, i, arr) => (i < arr.length - 1 ? part : sanitizePathSegment(part)))
    .join('/');

  // Skip if exists and non-trivial size
  if (await fileExists(safeDestPath)) {
    try {
      const st = await stat(safeDestPath);
      if (st.size > 50) return { remoteUrl, destPath: safeDestPath, status: 'skipped' };
    } catch {
      /* download */
    }
  }

  await mkdir(dirname(safeDestPath), { recursive: true });

  const res = await fetch(new URL(remoteUrl).href, {
    headers: {
      'User-Agent': 'ConnectGroup-Astro-Migrator/0.1',
      Accept: '*/*',
    },
    redirect: 'follow',
  });

  if (!res.ok || !res.body) {
    return { remoteUrl, destPath: safeDestPath, status: 'failed', error: `${res.status} ${res.statusText}` };
  }

  const ctype = res.headers.get('content-type') || '';
  // Reject HTML error pages saved as images
  if (ctype.includes('text/html') && !/\.html?$/i.test(safeDestPath)) {
    return { remoteUrl, destPath: safeDestPath, status: 'failed', error: `HTML content-type for asset: ${ctype}` };
  }

  await pipeline(Readable.fromWeb(res.body), createWriteStream(safeDestPath));
  return { remoteUrl, destPath: safeDestPath, status: 'downloaded' };
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
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '.git') continue;
        await walk(full);
      } else if (!exts || exts.has(extname(ent.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

async function gatherSourceFiles() {
  const files = [];
  const legacy = join(ROOT, 'src/legacy');
  files.push(...(await walkFiles(legacy, new Set(['.html', '.css', '.js']))));
  files.push(...(await walkFiles(join(PUBLIC, 'chrome'), new Set(['.html', '.css']))));
  // Blog/author JSON still references /wp-content/uploads media
  files.push(...(await walkFiles(join(ROOT, 'src/content'), new Set(['.json']))));
  files.push(...(await walkFiles(join(ROOT, 'src/data/seo'), new Set(['.yml']))));
  // Scan existing public CSS/JS for nested urls
  files.push(
    ...(await walkFiles(join(PUBLIC, 'wp-content'), new Set(['.css', '.js', '.mjs']))),
  );
  files.push(
    ...(await walkFiles(join(PUBLIC, 'wp-includes'), new Set(['.css', '.js', '.mjs']))),
  );
  return files;
}

async function downloadList(remotes) {
  const jobs = remotes.map((remote) => ({
    remote,
    dest: join(PUBLIC, toLocalPath(remote).replace(/^\//, '')),
  }));

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

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
      failures.push(r);
      console.warn('FAIL', r.remoteUrl, r.error);
    }
  }

  return { downloaded, skipped, failed, failures };
}

function rewriteOriginUrls(text) {
  let out = text.replace(/https:\\\/\\\/connectgroup\.co/gi, '');
  out = out.replace(/https:\/\/connectgroup\.co(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&').split('#')[0],
  );
  return out;
}

async function main() {
  console.log('Scanning sources for asset URLs…');
  const sources = await gatherSourceFiles();
  console.log(`Scanning ${sources.length} files`);

  const all = new Set();
  for (const file of sources) {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const u of collectUrls(raw)) all.add(u);
  }

  // Always include known chrome + flag sprites
  for (const extra of [
    `${ORIGIN}/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png`,
    `${ORIGIN}/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png`,
    `${ORIGIN}/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js`,
    `${ORIGIN}/wp-content/uploads/2025/09/Connect-Group-White.svg`,
  ]) {
    all.add(extra);
  }

  const remotes = [...all];
  console.log(`Unique asset URLs: ${remotes.length}`);
  console.log(`Downloading (concurrency ${CONCURRENCY})…`);

  let pass = 1;
  let totalDownloaded = 0;
  let totalFailed = 0;
  let pending = remotes;

  // Multi-pass: download, then re-scan CSS/JS for newly nested refs
  while (pending.length && pass <= 4) {
    console.log(`\n=== Pass ${pass}: ${pending.length} URLs ===`);
    const stats = await downloadList(pending);
    totalDownloaded += stats.downloaded;
    totalFailed += stats.failed;
    console.log(
      `Pass ${pass}: ${stats.downloaded} new, ${stats.skipped} cached, ${stats.failed} failed`,
    );

    // Rewrite absolute URLs inside newly touched public CSS/JS
    const cssJs = await walkFiles(PUBLIC, new Set(['.css', '.js', '.mjs']));
    const nested = new Set();
    for (const file of cssJs) {
      let raw;
      try {
        raw = await readFile(file, 'utf8');
      } catch {
        continue;
      }
      if (!raw.includes('connectgroup.co')) continue;
      for (const u of collectUrls(raw)) nested.add(u);
      const next = rewriteOriginUrls(raw);
      if (next !== raw) await writeFile(file, next, 'utf8');
    }

    pending = [...nested].filter((u) => !all.has(u));
    for (const u of nested) all.add(u);
    pass++;
    if (!pending.length) break;
  }

  // Sync chrome copies public ↔ src
  try {
    const header = await readFile(join(ROOT, 'src/legacy/chrome/header.html'), 'utf8');
    await mkdir(join(PUBLIC, 'chrome'), { recursive: true });
    await writeFile(join(PUBLIC, 'chrome/header.html'), header, 'utf8');
    const footer = await readFile(join(ROOT, 'src/legacy/chrome/footer.html'), 'utf8');
    await writeFile(join(PUBLIC, 'chrome/footer.html'), footer, 'utf8');
    if (await fileExists(join(ROOT, 'src/legacy/chrome/header.css'))) {
      const css = await readFile(join(ROOT, 'src/legacy/chrome/header.css'), 'utf8');
      await writeFile(join(PUBLIC, 'chrome/header.css'), css, 'utf8');
    }
  } catch (e) {
    console.warn('chrome sync warning', e);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    uniqueUrls: all.size,
    downloaded: totalDownloaded,
    failedApprox: totalFailed,
  };
  await writeFile(join(ROOT, 'src/legacy/chrome/assets-download-report.json'), JSON.stringify(report, null, 2));
  console.log('\nDone.', report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
