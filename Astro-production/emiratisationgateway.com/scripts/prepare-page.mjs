#!/usr/bin/env node
/**
 * Prepare a WordPress HTML export for Astro Phase 1 mirror.
 *
 * Usage:
 *   node scripts/prepare-page.mjs <slug>              # clean + rewrite only
 *   node scripts/prepare-page.mjs <slug> --download   # also download assets
 *
 * Expects: source/wordpress-exports/<slug>/index-https.html
 * Writes:  src/legacy/<slug>.cleaned.html
 */
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_ASSETS = join(ROOT, 'public');
const OUT_DIR = join(ROOT, 'src/legacy');

const ORIGIN = 'https://emiratisationgateway.com';
const ORIGIN_ALIASES = [
  'https://emiratisationgateway.com',
  'https://www.emiratisationgateway.com',
  'http://emiratisationgateway.com',
  'http://www.emiratisationgateway.com',
];
const args = process.argv.slice(2).filter((a) => a !== '--');
const shouldDownload = args.includes('--download');
const slug = args.find((a) => !a.startsWith('--'));

if (!slug) {
  console.error('Usage: node scripts/prepare-page.mjs <slug> [--download]');
  console.error('Example: node scripts/prepare-page.mjs about-us --download');
  process.exit(1);
}

const SOURCE = join(ROOT, 'source/wordpress-exports', slug, 'index-https.html');
const OUT_HTML = join(OUT_DIR, `${slug}.cleaned.html`);
const MANIFEST = join(OUT_DIR, `${slug}.assets.json`);
const CONCURRENCY = 8;

/** Remove WP-exported GTM / gtag snippets (IDs belong in .env → /runtime-gtm.js). */
function stripHardcodedAnalytics(html) {
  return html
    .replace(/<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '')
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '')
    .replace(
      /<script[^>]*>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    )
    .replace(
      /<script[^>]*>\s*function gtag\(\)[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    );
}

function shouldLocalize(url) {
  try {
    const u = new URL(url);
    if (!ORIGIN_ALIASES.includes(u.origin)) return false;
    // Reject srcset dumps / CSS leftovers that produce illegal Windows paths
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
  // URL.pathname keeps non-ASCII percent-encoded (e.g. en-dash â†’ %E2%80%93).
  // Decode so files match HTML paths that use the real Unicode characters.
  const pathname = decodeURIComponent(new URL(url).pathname);
  const parts = pathname.split('/');
  return parts.map((part, i) => (i < parts.length - 1 ? part : sanitizePathSegment(part))).join('/');
}

function unescapeElementorUrls(text) {
  return text.replace(
    /https?:\\\/\\\/(?:www\.)?emiratisationgateway\.com/gi,
    'https://emiratisationgateway.com',
  );
}

function normalizeAssetText(text) {
  return text.replace(/[\u2028\u2029]/g, '-');
}

function collectUrls(text) {
  const found = new Set();
  const normalized = unescapeElementorUrls(text)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/');

  const patterns = [
    /https?:\/\/(?:www\.)?emiratisationgateway\.com\/[^"'<>\\]+/gi,
    /url\(\s*['"]?(https?:\/\/(?:www\.)?emiratisationgateway\.com[^'")]+)['"]?\s*\)/gi,
    // Root-relative uploads (video/svg/json/images) from Elementor data-settings.
    // Stop at whitespace/comma so srcset "img.jpg 300w, img-300x191.jpg 300w" yields each URL.
    /(?:^|["'\s(:,])(\/wp-content\/(?:uploads|plugins|themes)\/[^"'<>?\s,]+\.(?:mp4|webm|mov|svg|json|png|jpe?g|webp|gif|woff2?|css|js))/gi,
  ];

  for (const re of patterns) {
    for (const match of normalized.matchAll(re)) {
      let raw = match[1] || match[0];
      raw = raw.replace(/\\/g, '').trim();
      raw = raw.split('"')[0].split("'")[0].split('&')[0];
      // Stop at srcset descriptors / CSS junk (e.g. "logo.png 377w," or ".css */")
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

/**
 * Resolve CSS-relative url(...) references (e.g. ../fonts/eicons.woff2) against a
 * public/ CSS file path, returning absolute https://emiratisationgateway.com/... URLs.
 * @param {string} cssText
 * @param {string} cssFileAbsPath absolute path to the CSS file under PUBLIC_ASSETS
 */
function collectRelativeCssUrls(cssText, cssFileAbsPath) {
  const found = new Set();
  const publicRoot = PUBLIC_ASSETS.replace(/\\/g, '/').replace(/\/$/, '');
  const cssAbs = cssFileAbsPath.replace(/\\/g, '/');
  if (!cssAbs.startsWith(publicRoot)) return [...found];

  const cssDirWeb = cssAbs.slice(publicRoot.length).replace(/\/[^/]+$/, '') || '';
  const re = /url\(\s*(['"]?)(?!data:|https?:|\/\/)([^'")]+)\1\s*\)/gi;
  for (const match of cssText.matchAll(re)) {
    let rel = match[2].trim().split('#')[0].split('?')[0];
    if (!rel || rel.startsWith('/')) continue;
    // Resolve relative path against the CSS directory
    const parts = [...cssDirWeb.split('/').filter(Boolean), ...rel.split('/')];
    const resolved = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') resolved.pop();
      else resolved.push(part);
    }
    const webPath = '/' + resolved.join('/');
    if (/\/wp-content\/|\/wp-includes\//.test(webPath)) {
      found.add(ORIGIN + webPath);
    }
  }
  return [...found];
}

function promoteLazyImages(html) {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    const lazySrc = attrs.match(/\bdata-lazy-src=(['"])(.*?)\1/i);
    if (!lazySrc) return full;

    let next = attrs.replace(/\bsrc=(['"])data:image\/svg\+xml[^'"]*\1/i, '');
    if (!/(^|\s)src\s*=/i.test(next)) {
      next += ` src=${lazySrc[1]}${lazySrc[2]}${lazySrc[1]}`;
    } else {
      next = next.replace(/\bsrc=(['"])(.*?)\1/i, ` src=${lazySrc[1]}${lazySrc[2]}${lazySrc[1]}`);
    }

    const lazySrcset = next.match(/\bdata-lazy-srcset=(['"])(.*?)\1/i);
    if (lazySrcset && !/\bsrcset=/i.test(next)) {
      next += ` srcset=${lazySrcset[1]}${lazySrcset[2]}${lazySrcset[1]}`;
    }

    const lazySizes = next.match(/\bdata-lazy-sizes=(['"])(.*?)\1/i);
    if (lazySizes && !/\bsizes=/i.test(next)) {
      next += ` sizes=${lazySizes[1]}${lazySizes[2]}${lazySizes[1]}`;
    }

    next = next
      .replace(/\sdata-lazy-src=(['"]).*?\1/gi, '')
      .replace(/\sdata-lazy-srcset=(['"]).*?\1/gi, '')
      .replace(/\sdata-lazy-sizes=(['"]).*?\1/gi, '');

    return `<img${next}>`;
  });
}

function normalizeAssetUrlsInHtml(html) {
  return html.replace(
    /((?:https?:\/\/(?:www\.)?emiratisationgateway\.com|\/wp-content|\/wp-includes)\/[^"'<>]+)/gi,
    (match) => normalizeAssetText(match),
  );
}

function cleanHtml(html) {
  let out = html;

  out = out.replace(
    /<script type='text\/javascript' src='https?:\/\/(?:www\.)?emiratisationgateway\.com\/oUgCj[^']+'><\/script>/,
    '',
  );

  out = out.replace(/<link[^>]+id=['"]admin-bar-css['"][^>]*>/gi, '');
  out = out.replace(/<style id=['"]admin-bar-inline-css['"][\s\S]*?<\/style>/gi, '');
  out = out.replace(/<div id=['"]wpadminbar['"][\s\S]*?<\/div>/gi, '');

  out = out.replace(/\sadmin-bar\b/g, '');
  out = out.replace(/\slogged-in\b/g, '');

  // Keep Google Fonts (Inter/Poppins) — Emiratisation Gateway relies on them for typography.
  // (Evolution used locally hosted Elementor fonts; do not strip here.)

  // Fix WP export scroll script that references missing #arrow (causes 1000+ console errors)
  out = out.replace(
    /document\.getElementById\(['"]arrow['"]\)\.style/g,
    "(document.getElementById('arrow')||{style:{}}).style",
  );

  // Unwrap WP Rocket lazy scripts so Elementor/Swiper/Scrollsequence run without user interaction.
  // Live WP Rocket uses type="rocketlazyloadscript" (and sometimes type="text/rocketlazyloadscript").
  out = out.replace(
    /<script\b([^>]*?)>/gi,
    (full, attrs) => {
      if (!/rocketlazyloadscript/i.test(attrs) && !/data-rocket-src=/i.test(attrs)) {
        return full;
      }
      let next = attrs;
      const srcMatch = next.match(/\bdata-rocket-src=(['"])(.*?)\1/i);
      // Avoid matching the "src=" inside data-rocket-src
      const hasRealSrc = /(^|\s)src\s*=/i.test(next);
      if (srcMatch && !hasRealSrc) {
        next += ` src=${srcMatch[1]}${srcMatch[2]}${srcMatch[1]}`;
      }
      next = next
        .replace(/\stype=(['"])(?:text\/)?rocketlazyloadscript\1/gi, '')
        .replace(/\sdata-rocket-src=(['"]).*?\1/gi, '')
        .replace(/\sdata-rocket-defer\b/gi, '');
      return `<script${next}>`;
    },
  );

  // Scrollsequence config must execute as plain JS (ssqInput before ssq-lib loads)
  out = out.replace(
    /<script\b([^>]*class=(['"])scrollsequence-input-script\2[^>]*)>/gi,
    (full, attrs) => {
      const next = attrs.replace(/\stype=(['"])(?:text\/)?rocketlazyloadscript\1/gi, '');
      return `<script${next}>`;
    },
  );

  // Prefer plugin copies of Scrollsequence/GSAP when WP Rocket minify paths 404 locally
  out = out.replace(
    /\/wp-content\/cache\/min\/1\/wp-content\/plugins\/scrollsequence-pro\/public\/js\//g,
    '/wp-content/plugins/scrollsequence-pro/public/js/',
  );

  // Promote WP Rocket lazy images to real src (static mirror should not wait on lazyload.js)
  out = promoteLazyImages(out);

  // Never bake GTM/GA4 into mirrors — /runtime-gtm.js loads PUBLIC_GTM_ID / PUBLIC_GA4_ID from .env
  out = stripHardcodedAnalytics(out);

  out = out.replace(
    /<head([^>]*)>/i,
    `<head$1>\n<!-- Prepared for Astro Phase 1 Â· ${slug} Â· ${new Date().toISOString()} -->`,
  );

  // Inject mirror fixes before </body>
  if (!out.includes('astro-mirror-fixes.js')) {
    out = out.replace(
      /<\/body>/i,
      `<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>`,
    );
  }

  return normalizeAssetUrlsInHtml(out);
}

function rewriteOriginUrls(text) {
  let out = text.replace(/https?:\\\/\\\/(?:www\.)?emiratisationgateway\.com/gi, '');
  // Absolute origins FIRST. A bare //domain pass before this turns
  // https://emiratisationgateway.com/x into https:/x (broken — CSS/JS never load).
  // Preserve URL hashes (e.g. Services menu href .../#).
  out = out.replace(/https?:\/\/(?:www\.)?emiratisationgateway\.com(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&'),
  );
  // Protocol-relative only (not the // inside https://)
  out = out.replace(/(?<!:)\/\/(?:www\.)?emiratisationgateway\.com(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&'),
  );
  // Repair already-broken rewrites from older prepares
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
  const safeDestPath = destPath
    .split('/')
    .map((part, i, arr) => (i < arr.length - 1 ? part : sanitizePathSegment(part)))
    .join('/');
  if (await fileExists(safeDestPath)) return { remoteUrl, destPath: safeDestPath, status: 'skipped' };

  await mkdir(dirname(safeDestPath), { recursive: true });

  const fetchUrl = new URL(remoteUrl).href;
  const res = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'EmiratisationGateway-Astro-Migrator/0.1',
      Accept: '*/*',
    },
    redirect: 'follow',
  });

  if (!res.ok || !res.body) {
    return { remoteUrl, destPath, status: 'failed', error: `${res.status} ${res.statusText}` };
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
      if (ent.isDirectory()) await walk(full);
      else if (exts.has(extname(ent.name).toLowerCase())) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

async function downloadList(remotes) {
  if (!remotes.length) return { downloaded: 0, skipped: 0, failed: 0 };

  const jobs = remotes.map((remote) => ({
    remote,
    dest: join(PUBLIC_ASSETS, toLocalPath(remote).replace(/^\//, '')),
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

async function localizePublicAssets() {
  const files = await walkFiles(PUBLIC_ASSETS, new Set(['.css', '.js', '.mjs']));
  const nested = new Set();
  let rewrittenFiles = 0;

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    if (/emiratisationgateway\.com/.test(raw)) {
      for (const u of collectUrls(raw)) nested.add(u);
      const next = rewriteOriginUrls(raw);
      if (next !== raw) {
        await writeFile(file, next, 'utf8');
        rewrittenFiles++;
      }
    }
    // Always harvest CSS-relative url(...) (eicons fonts, phone flags, etc.)
    if (extname(file).toLowerCase() === '.css') {
      for (const u of collectRelativeCssUrls(raw, file)) nested.add(u);
    }
  }

  console.log(`Rewrote absolute URLs in ${rewrittenFiles} CSS/JS files`);
  console.log(`Found ${nested.size} nested asset URLs inside CSS/JS`);

  if (shouldDownload && nested.size) {
    const stats = await downloadList([...nested]);
    console.log(
      `Nested download: ${stats.downloaded} new, ${stats.skipped} cached, ${stats.failed} failed`,
    );

    // Second pass after downloads in case newly fetched CSS points at more relatives.
    const files2 = await walkFiles(PUBLIC_ASSETS, new Set(['.css']));
    const more = new Set();
    for (const file of files2) {
      const raw = await readFile(file, 'utf8');
      if (/emiratisationgateway\.com/.test(raw)) {
        for (const u of collectUrls(raw)) more.add(u);
        const next = rewriteOriginUrls(raw);
        if (next !== raw) await writeFile(file, next, 'utf8');
      }
      for (const u of collectRelativeCssUrls(raw, file)) more.add(u);
    }
    if (more.size) {
      const stats2 = await downloadList([...more]);
      console.log(
        `CSS font pass: ${stats2.downloaded} new, ${stats2.skipped} cached, ${stats2.failed} failed`,
      );
      for (const file of files2) {
        const raw = await readFile(file, 'utf8');
        if (!/emiratisationgateway\.com/.test(raw)) continue;
        await writeFile(file, rewriteOriginUrls(raw), 'utf8');
      }
    }
  }
}

async function main() {
  console.log(`Preparing page: ${slug}`);
  console.log(`Source: ${SOURCE}`);

  let raw;
  try {
    raw = await readFile(SOURCE, 'utf8');
  } catch {
    console.error(`Missing export file: ${SOURCE}`);
    process.exit(1);
  }

  let html = cleanHtml(raw);
  const remotes = collectUrls(html);
  console.log(`Found ${remotes.length} localizable asset URLs in HTML`);

  await mkdir(OUT_DIR, { recursive: true });

  if (shouldDownload) {
    console.log(`Downloading up to ${remotes.length} assets (concurrency ${CONCURRENCY})â€¦`);
    const stats = await downloadList(remotes);
    console.log(
      `HTML asset download: ${stats.downloaded} new, ${stats.skipped} cached, ${stats.failed} failed`,
    );
  } else {
    console.log('Skipping download (pass --download to fetch assets into public/)');
  }

  html = rewriteOriginUrls(html);
  await mkdir(dirname(OUT_HTML), { recursive: true });
  await writeFile(OUT_HTML, html, 'utf8');
  console.log(`Wrote ${OUT_HTML}`);

  await localizePublicAssets();

  await mkdir(dirname(MANIFEST), { recursive: true });
  await writeFile(
    MANIFEST,
    JSON.stringify(
      {
        slug,
        generatedAt: new Date().toISOString(),
        origin: ORIGIN,
        count: remotes.length,
        note: 'CSS/JS under public/ scanned for nested font URLs; Elementor escaped URLs rewritten',
        assets: remotes.map((r) => ({ remote: r, local: toLocalPath(r) })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
