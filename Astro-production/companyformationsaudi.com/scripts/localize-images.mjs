#!/usr/bin/env node
/**
 * Download ONLY real image files for companyformationsaudi.com.
 * Validates Content-Type + magic bytes; never writes HTML soft-404s.
 *
 * Also rewrites remaining absolute image URLs in legacy HTML/JSON to local paths.
 */
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { openSync, readSync, closeSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LIVE = 'https://companyformationsaudi.com';
const CONCURRENCY = 6;

const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|avif|ico|bmp)(?:$|\?)/i;

function walkFiles(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.data'].includes(ent.name)) continue;
      walkFiles(full, exts, out);
      continue;
    }
    if (ent.name.startsWith('_tmp-')) continue;
    if (exts && !exts.has(extname(ent.name).toLowerCase())) continue;
    out.push(full);
  }
  return out;
}

function isLikelyImageBytes(buf) {
  if (!buf || buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') return true;
  // WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  // SVG (text)
  const head = buf.toString('utf8', 0, Math.min(buf.length, 200)).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return true;
  // ICO
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return true;
  return false;
}

function fileLooksLikeImage(path) {
  if (!existsSync(path)) return false;
  try {
    const st = statSync(path);
    if (st.size < 50) return false;
    const buf = Buffer.alloc(64);
    const fd = openSync(path, 'r');
    readSync(fd, buf, 0, 64, 0);
    closeSync(fd);
    const head = buf.toString('utf8').trimStart();
    if (/^<!DOCTYPE|^<html[\s>]/i.test(head)) return false;
    return isLikelyImageBytes(buf) || IMAGE_EXT_RE.test(path);
  } catch {
    return false;
  }
}

function collectImageUrls(text) {
  const found = new Set();
  const normalized = text
    .replace(/https?:\\\/\\\//gi, 'https://')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');

  const push = (raw) => {
    if (!raw) return;
    let u = String(raw).trim().replace(/^['"]|['"]$/g, '');
    if (!u || u.startsWith('data:') || u.includes('*')) return;
    u = u.replace(/[),;]+$/, '');
    try {
      if (u.startsWith('//')) u = `https:${u}`;
      if (/^https?:\/\//i.test(u)) {
        const abs = new URL(u);
        if (!IMAGE_EXT_RE.test(abs.pathname)) return;
        if (/fonts\.googleapis|fonts\.gstatic|googletagmanager|google-analytics/i.test(abs.hostname)) return;
        found.add(abs.href.split('#')[0]);
        return;
      }
      if (u.startsWith('/')) {
        const pathOnly = decodeURIComponent(u.split('#')[0].split('?')[0]);
        if (!IMAGE_EXT_RE.test(pathOnly)) return;
        found.add(pathOnly);
      }
    } catch {
      /* ignore */
    }
  };

  for (const m of normalized.matchAll(/\b(?:src|data-src|data-lazy-src|data-bg|content)=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of normalized.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) push(part.trim().split(/\s+/)[0]);
  }
  for (const m of normalized.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) push(m[1]);
  for (const m of normalized.matchAll(/https?:\/\/[^"'\\\s)>]+?\.(?:png|jpe?g|gif|webp|svg|avif|ico)/gi)) push(m[0]);
  for (const m of normalized.matchAll(/\/wp-content\/uploads\/[^"'\\\s)>?]+\.(?:png|jpe?g|gif|webp|svg|avif|ico)/gi)) {
    push(m[0]);
  }
  return found;
}

function toPublicPath(pathname) {
  const clean = pathname.split('?')[0];
  return join(PUBLIC, ...decodeURIComponent(clean.replace(/^\//, '')).split('/'));
}

function localPathFor(ref) {
  if (ref.startsWith('/')) return ref.split('?')[0];
  const u = new URL(ref);
  if (u.hostname.endsWith('companyformationsaudi.com')) return u.pathname;
  const safeHost = u.hostname.replace(/[^a-z0-9.-]/gi, '_');
  const base = (u.pathname.split('/').filter(Boolean).pop() || 'asset.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `/wp-content/uploads/external/${safeHost}/${base}`;
}

function remoteFor(ref) {
  if (ref.startsWith('/')) return LIVE + ref.split('?')[0];
  return new URL(ref).href.split('#')[0];
}

async function downloadImage(remote, dest) {
  if (fileLooksLikeImage(dest)) return 'skip';
  const res = await fetch(remote, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CFS-ImageLocalizer/1.1)',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: LIVE + '/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
    throw new Error(`bad content-type ${ct}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isLikelyImageBytes(buf) && !ct.startsWith('image/')) {
    throw new Error('not an image payload');
  }
  await mkdir(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return 'ok';
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const files = [
    ...walkFiles(join(ROOT, 'src/legacy'), new Set(['.html', '.json'])),
    ...walkFiles(join(PUBLIC, 'js'), new Set(['.js', '.mjs'])),
    ...walkFiles(join(PUBLIC, 'css'), new Set(['.css'])),
    ...walkFiles(join(PUBLIC, 'chrome'), new Set(['.css', '.js'])),
    ...walkFiles(join(PUBLIC, 'wp-content/uploads/elementor/css'), new Set(['.css'])),
  ];

  const refs = new Set();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const ref of collectImageUrls(text)) refs.add(ref);
  }

  const replacements = new Map();
  const jobs = [];
  const seen = new Set();

  for (const ref of refs) {
    const local = localPathFor(ref);
    if (!ref.startsWith('/') && !ref.includes('companyformationsaudi.com')) {
      replacements.set(ref.split('?')[0], local);
      // also with query
      replacements.set(ref, local);
    } else if (!ref.startsWith('/')) {
      replacements.set(ref, local);
    }
    const dest = toPublicPath(local);
    if (fileLooksLikeImage(dest)) continue;
    if (seen.has(dest)) continue;
    seen.add(dest);
    jobs.push({ remote: remoteFor(ref), dest, local, from: ref });
  }

  console.log(`image refs: ${refs.size}; missing/invalid local: ${jobs.length}; rewrites planned: ${replacements.size}`);

  let ok = 0;
  let fail = 0;
  const fails = [];
  await mapPool(jobs, CONCURRENCY, async (job) => {
    try {
      const status = await downloadImage(job.remote, job.dest);
      if (status === 'ok') {
        ok += 1;
        console.log('DL', job.local);
      }
    } catch (err) {
      fail += 1;
      fails.push({ ...job, error: String(err) });
      console.warn('FAIL', job.remote, String(err.message || err));
    }
  });

  let rewritten = 0;
  for (const file of files) {
    let text = readFileSync(file, 'utf8');
    let next = text;
    const keys = [...replacements.keys()].sort((a, b) => b.length - a.length);
    for (const from of keys) {
      const to = replacements.get(from);
      if (next.includes(from)) next = next.split(from).join(to);
    }
    // self-origin absolute images -> root-relative
    next = next.replace(
      /https?:\/\/(?:www\.)?companyformationsaudi\.com(\/wp-content\/uploads\/[^"'\\\s)>]+\.(?:png|jpe?g|gif|webp|svg|avif|ico))/gi,
      '$1',
    );
    if (next !== text) {
      writeFileSync(file, next, 'utf8');
      rewritten += 1;
      console.log('REWRITE', relative(ROOT, file));
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log({ downloaded: ok, failed: fail, rewrittenFiles: rewritten });
  if (fails.length) {
    console.log('Failures:');
    fails.slice(0, 40).forEach((f) => console.log(' ', f.remote, '->', f.local, f.error));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
