#!/usr/bin/env node
/**
 * Fail the build/deploy if referenced media is missing or is HTML junk
 * (WordPress 301→homepage HTML saved as .png/.jpg — the Connect FZ live outage mode).
 *
 * Usage: node scripts/verify-local-assets.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif']);

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

function collectHtmlCssPaths() {
  const roots = [
    join(ROOT, 'src/legacy'),
    join(PUBLIC, 'css'),
    join(PUBLIC, 'chrome'),
    join(PUBLIC, 'wp-content/uploads/elementor/css'),
  ];
  const files = [];
  for (const r of roots) files.push(...walk(r).filter((f) => /\.(html|css)$/i.test(f)));
  return files;
}

function extractUrls(text) {
  const urls = new Set();
  const re =
    /(?:src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|srcset=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1] || m[2] || m[3] || '';
    for (const part of raw.split(',')) {
      let u = part.trim().split(/\s+/)[0];
      if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('tel:')) {
        continue;
      }
      if (u.startsWith('https://snapsale.ae')) u = u.slice('https://snapsale.ae'.length);
      if (u.startsWith('http://snapsale.ae')) u = u.slice('http://snapsale.ae'.length);
      if (u.startsWith('//snapsale.ae')) u = u.slice('//snapsale.ae'.length);
      u = u.split('?')[0];
      if (u.startsWith('/wp-content/') || u.startsWith('/images/') || u.startsWith('/chrome/')) {
        urls.add(u);
      }
    }
  }
  return urls;
}

function classify(absPath) {
  if (!existsSync(absPath)) return 'missing';
  const ext = extname(absPath).toLowerCase();
  if (!IMG_EXT.has(ext)) return 'ok';
  let buf;
  try {
    buf = readFileSync(absPath);
  } catch {
    return 'unreadable';
  }
  if (buf.length < 24) return 'tiny';
  const head = buf.subarray(0, 200);
  const ls = head.toString('utf8', 0, Math.min(80, head.length)).trimStart();
  if (ext === '.svg') {
    const t = head.toString('utf8').toLowerCase();
    if (t.includes('<svg') || t.includes('<?xml')) return 'ok';
    if (ls.startsWith('<!doctype') || ls.startsWith('<html')) return 'html-junk';
    return 'bad-svg';
  }
  if (ls.startsWith('<!doctype') || ls.startsWith('<html') || ls.startsWith('<HTML')) return 'html-junk';
  if (ext === '.png' && !(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
    // Allow JPEG bytes stored under .png (Footer_bkg) — still a real image file.
    if (buf[0] === 0xff && buf[1] === 0xd8) return 'ok-jpeg-as-png';
    return 'bad-magic';
  }
  if ((ext === '.jpg' || ext === '.jpeg') && !(buf[0] === 0xff && buf[1] === 0xd8)) return 'bad-magic';
  if (ext === '.webp' && !(buf.toString('ascii', 0, 4) === 'RIFF')) {
    if (ls.startsWith('<')) return 'html-junk';
  }
  if (ext === '.gif' && buf.toString('ascii', 0, 4) !== 'GIF8') return 'bad-magic';
  return 'ok';
}

const refs = new Set();
for (const f of collectHtmlCssPaths()) {
  try {
    for (const u of extractUrls(readFileSync(f, 'utf8'))) refs.add(u);
  } catch {
    /* skip */
  }
}

const problems = [];
for (const u of [...refs].sort()) {
  const ext = extname(u).toLowerCase();
  if (!IMG_EXT.has(ext) && !u.includes('/uploads/')) continue;
  if (!IMG_EXT.has(ext)) continue;
  const st = classify(join(PUBLIC, u.replace(/^\//, '')));
  if (st !== 'ok' && st !== 'ok-jpeg-as-png') {
    problems.push({ u, st });
  }
}

// Also flag any junk files sitting in uploads even if currently unreferenced
for (const f of walk(join(PUBLIC, 'wp-content/uploads'))) {
  const ext = extname(f).toLowerCase();
  if (!IMG_EXT.has(ext)) continue;
  const st = classify(f);
  if (st === 'html-junk' || st === 'bad-magic' || st === 'tiny') {
    const u = '/' + relative(PUBLIC, f).replaceAll('\\', '/');
    if (!problems.some((p) => p.u === u)) problems.push({ u, st: `${st} (unreferenced-or-extra)` });
  }
}

if (!problems.length) {
  console.log(`verify-local-assets: PASS (${refs.size} media refs checked)`);
  process.exit(0);
}

console.error(`verify-local-assets: FAIL (${problems.length} problems)`);
for (const p of problems.slice(0, 100)) {
  console.error(`  ${p.st}\t${p.u}`);
}
if (problems.length > 100) console.error(`  … +${problems.length - 100} more`);
process.exit(1);
