#!/usr/bin/env node
/**
 * Audit local asset coverage for Connect Group Astro cutover.
 * Scans legacy HTML, chrome, blog JSON, SEO YAML, and public CSS/JS.
 *
 * Usage: node scripts/audit-local-assets.mjs
 */
import { existsSync } from 'node:fs';
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectgroup.co';

async function walkFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;

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
        if (['node_modules', '.git', 'dist'].includes(ent.name)) continue;
        await walk(full);
      } else if (!exts || exts.has(extname(ent.name).toLowerCase())) {
        out.push(full);
      }
    }
  }

  await walk(dir);
  return out;
}

function shouldTrackPath(pathname) {
  if (!pathname.startsWith('/')) return false;
  return (
    pathname.startsWith('/wp-content/') ||
    pathname.startsWith('/wp-includes/') ||
    /\.(css|js|mjs|map|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|json|mp4|webm|mov)$/i.test(
      pathname,
    )
  );
}

function cleanPath(raw) {
  let p = String(raw || '')
    .replace(/\\/g, '')
    .trim()
    .split('"')[0]
    .split("'")[0]
    .split('&')[0]
    .split('#')[0]
    .split('?')[0]
    .replace(/[.,;)\]]+$/g, '');
  if (p.startsWith('https://connectgroup.co')) {
    try {
      p = new URL(p).pathname;
    } catch {
      return null;
    }
  }
  if (!p.startsWith('/')) return null;
  if (!shouldTrackPath(p)) return null;
  return p;
}

function collectPaths(text) {
  const found = new Set();
  const normalized = text
    .replace(/https:\\\/\\\/connectgroup\.co/gi, 'https://connectgroup.co')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  const patterns = [
    /https:\/\/connectgroup\.co(\/[^"'<>)\s]+)/gi,
    /url\(\s*['"]?(https:\/\/connectgroup\.co[^'")]+)['"]?\s*\)/gi,
    /url\(\s*['"]?(\/wp-(?:content|includes)\/[^'")]+)['"]?\s*\)/gi,
    /(?:^|["'\s(:,=])(\/wp-content\/(?:uploads|plugins|themes)\/[^"'<>?\s]+)/gi,
    /(?:^|["'\s(:,=])(\/wp-includes\/[^"'<>?\s]+)/gi,
  ];

  for (const re of patterns) {
    for (const match of normalized.matchAll(re)) {
      const candidate = match[1] || match[0];
      if (/\s+\d+[wx]\b/i.test(candidate) || candidate.includes(', http') || candidate.includes(', /')) {
        for (const part of candidate.split(/,\s*/)) {
          const piece = cleanPath(part.trim().split(/\s+/)[0]);
          if (piece) found.add(piece);
        }
        continue;
      }
      const path = cleanPath(candidate);
      if (path) found.add(path);
    }
  }

  return found;
}

async function main() {
  console.log('Auditing local asset coverage…');

  const sources = [
    ...(await walkFiles(join(ROOT, 'src/legacy'), new Set(['.html', '.css', '.js']))),
    ...(await walkFiles(join(ROOT, 'src/content'), new Set(['.json']))),
    ...(await walkFiles(join(ROOT, 'src/data/seo'), new Set(['.yml']))),
    ...(await walkFiles(join(PUBLIC, 'chrome'), new Set(['.html', '.css']))),
    ...(await walkFiles(join(PUBLIC, 'wp-content'), new Set(['.css', '.js', '.mjs']))),
    ...(await walkFiles(join(PUBLIC, 'wp-includes'), new Set(['.css', '.js', '.mjs']))),
  ];

  console.log(`Scanning ${sources.length} source files`);

  const allPaths = new Set();
  let absoluteLiveAssetRefs = 0;

  for (const file of sources) {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    absoluteLiveAssetRefs += (
      raw.match(/https:\/\/connectgroup\.co\/(?:wp-content|wp-includes)\//gi) || []
    ).length;
    for (const p of collectPaths(raw)) allPaths.add(p);
  }

  const missing = [];
  const empty = [];
  let present = 0;

  for (const pathname of [...allPaths].sort()) {
    const local = join(PUBLIC, ...pathname.split('/').filter(Boolean));
    try {
      await access(local);
      const st = await stat(local);
      if (st.size <= 50) empty.push({ path: pathname, size: st.size });
      else present += 1;
    } catch {
      missing.push(pathname);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: sources.length,
    uniqueAssetPaths: allPaths.size,
    present,
    empty: empty.length,
    missing: missing.length,
    absoluteLiveAssetRefs,
    missingSample: missing.slice(0, 80),
    emptySample: empty.slice(0, 40),
  };

  const outPath = join(ROOT, 'src/legacy/chrome/assets-audit-report.json');
  await writeFile(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (missing.length || empty.length) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
