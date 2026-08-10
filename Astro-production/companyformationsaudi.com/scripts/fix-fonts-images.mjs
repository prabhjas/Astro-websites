#!/usr/bin/env node
/**
 * 1) Un-lazy Google Fonts / Elementor font CSS in cleaned mirrors (media=print onload → all)
 * 2) Download any still-missing /wp-content assets referenced by cleaned HTML
 */
import { createWriteStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const LIVE = '';
const BASE = process.env.CFS_BASE || 'http://127.0.0.1:5114';

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (['chrome', 'blog-shell', 'tag-shell', 'author-shell'].includes(name.name)) continue;
      walkHtml(full, acc);
    } else if (name.name.endsWith('.cleaned.html')) acc.push(full);
  }
  return acc;
}

function fixFontLinks(html) {
  let out = html;
  // WP Rocket: media=print onload=this.media='all' → load immediately
  out = out.replace(
    /(<link[^>]+href=["'][^"']*fonts\.googleapis\.com[^"']*["'][^>]*)\smedia=["']print["']([^>]*)\sonload=["'][^"']*["']/gi,
    '$1 media="all"$2',
  );
  out = out.replace(
    /(<link[^>]+href=["'][^"']*uploads\/elementor\/google-fonts[^"']*["'][^>]*)\smedia=["']print["']([^>]*)\sonload=["'][^"']*["']/gi,
    '$1 media="all"$2',
  );
  // data-rocket-preload stylesheets for google fonts
  out = out.replace(
    /<link[^>]+data-rocket-preload[^>]+href=["'](https:\/\/fonts\.googleapis\.com\/css[^"']+)["'][^>]*>\s*/gi,
    '',
  );
  // Ensure primary GF stylesheet is media=all
  out = out.replace(
    /(<link[^>]+href=["']https:\/\/fonts\.googleapis\.com\/css[^"']+["'][^>]*?)(?:\smedia=["'][^"']*["'])?/gi,
    (full, start) => {
      if (/rel=["']stylesheet["']/i.test(full) || /rel=['']stylesheet['']/i.test(full)) {
        if (/\smedia=/i.test(full)) {
          return full.replace(/\smedia=["'][^"']*["']/i, ' media="all"');
        }
        return `${start} media="all"`;
      }
      return full;
    },
  );
  return out;
}

function collectWpPaths(html) {
  const paths = new Set();
  const push = (u) => {
    if (!u) return;
    u = u.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\\\//g, '/');
    try {
      const abs = new URL(u, LIVE + '/');
      if (abs.pathname.startsWith('/wp-content/') || abs.pathname.startsWith('/wp-includes/')) {
        paths.add(abs.pathname);
      }
    } catch {
      /* ignore */
    }
  };
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) push(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) push(part.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/"url"\s*:\s*"((?:\\\/|\/)wp-content[^"\\]+)"/gi)) push(m[1]);
  return [...paths];
}

async function statusLocal(path) {
  try {
    const r = await fetch(new URL(path, BASE).href, { method: 'GET' });
    return r.status;
  } catch {
    return 0;
  }
}

async function download(path) {
  const dest = join(PUBLIC, path.replace(/^\//, ''));
  if (existsSync(dest)) return 'skip';
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(LIVE + path, {
    headers: { 'User-Agent': 'cfs-fix-fonts-images/0.1' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error(String(res.status));
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'ok';
}

async function main() {
  const files = walkHtml(LEGACY);
  let rewritten = 0;
  const needed = new Set();

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const next = fixFontLinks(raw);
    if (next !== raw) {
      writeFileSync(file, next, 'utf8');
      rewritten++;
    }
    for (const p of collectWpPaths(next)) {
      const dest = join(PUBLIC, p.replace(/^\//, ''));
      if (!existsSync(dest)) needed.add(p);
    }
  }
  console.log(`cleaned_html=${files.length} font_link_rewrites=${rewritten} missing_on_disk=${needed.size}`);

  // Also check a sample of on-disk paths that might not be in dist yet — download disk gaps only
  let ok = 0;
  let fail = 0;
  for (const path of [...needed].sort()) {
    try {
      await download(path);
      ok++;
      if (ok % 40 === 0) console.log(`downloaded ${ok}/${needed.size}`);
    } catch (e) {
      fail++;
      if (fail <= 20) console.log('FAIL', path, e.message);
    }
  }
  console.log(`download ok=${ok} fail=${fail}`);

  // Spot-check key fonts after download (disk)
  for (const p of [
    '/wp-content/uploads/elementor/google-fonts/fonts/poppins-pxiayp8kv8jhgfvrjjlme0tdmpkzsq.woff2',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
  ]) {
    console.log('disk', p, existsSync(join(PUBLIC, p.slice(1))));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
