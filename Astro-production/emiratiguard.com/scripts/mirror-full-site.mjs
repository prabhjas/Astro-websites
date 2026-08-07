#!/usr/bin/env node
/**
 * Full-page HTML mirror for every URL in live page-sitemap + post-sitemap.
 * Writes src/legacy/<slug>.cleaned.html and downloads referenced assets into public/.
 *
 *   node scripts/mirror-full-site.mjs
 *   node scripts/mirror-full-site.mjs --skip-assets
 */
import { createWriteStream } from "node:fs";
import { access, mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "src", "legacy");
const PUBLIC = join(ROOT, "public");
const ORIGIN = "https://emiratiguard.com";
const UA = "EMIRATIGUARD-FullMirror/1.0";
const SKIP_ASSETS = process.argv.includes("--skip-assets");
const CONCURRENCY = Number(process.env.EG_MIRROR_CONCURRENCY || 4);
const ASSET_CONCURRENCY = Number(process.env.EG_ASSET_CONCURRENCY || 8);

function slugFromPath(pathname) {
  let p = pathname || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p === "/") return "homepage";
  return p.replace(/^\/|\/$/g, "");
}

function pathFromLoc(loc) {
  let p = new URL(loc).pathname;
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchSitemapLocs(url) {
  const xml = await fetchText(url);
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function stripHardcodedAnalytics(html) {
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (/googletagmanager\.com\/(?:gtm\.js|ns\.html|gtag\/js)/i.test(block)) return "";
    if (/['"]GTM-[A-Z0-9]+['"]/.test(block) && /dataLayer|gtm\.js|googletagmanager/i.test(block))
      return "";
    if (
      /window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/i.test(block) &&
      /gtag\(\s*['"]config['"]/i.test(block)
    ) {
      return "";
    }
    if (/function\s+gtag\s*\(/i.test(block) && /gtag\(\s*['"]config['"]/i.test(block)) return "";
    return block;
  });
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (block) =>
    /googletagmanager/i.test(block) ? "" : block,
  );
  out = out
    .replace(/<iframe\b[^>]*googletagmanager\.com\/ns\.html[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<!--\s*Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, "")
    .replace(/<!--\s*End Google Tag Manager\s*(?:\(noscript\))?\s*-->/gi, "")
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->/gi, "");
  return out;
}

function promoteLazyImages(html) {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    const lazySrc = attrs.match(/\bdata-lazy-src=(['"])(.*?)\1/i);
    if (!lazySrc) return full;
    let next = attrs.replace(/\bsrc=(['"])data:image\/svg\+xml[^'"]*\1/i, "");
    if (!/(^|\s)src\s*=/i.test(next)) {
      next += ` src=${lazySrc[1]}${lazySrc[2]}${lazySrc[1]}`;
    } else {
      next = next.replace(/\bsrc=(['"])(.*?)\1/i, ` src=${lazySrc[1]}${lazySrc[2]}${lazySrc[1]}`);
    }
    next = next
      .replace(/\sdata-lazy-src=(['"]).*?\1/gi, "")
      .replace(/\sdata-lazy-srcset=(['"]).*?\1/gi, "")
      .replace(/\sdata-lazy-sizes=(['"]).*?\1/gi, "");
    return `<img${next}>`;
  });
}

function unwrapRocketScripts(html) {
  return html.replace(/<script\b([^>]*?)>/gi, (full, attrs) => {
    if (!/rocketlazyloadscript/i.test(attrs) && !/data-rocket-src=/i.test(attrs)) return full;
    let next = attrs;
    const srcMatch = next.match(/\bdata-rocket-src=(['"])(.*?)\1/i);
    const hasRealSrc = /(^|\s)src\s*=/i.test(next);
    if (srcMatch && !hasRealSrc) next += ` src=${srcMatch[1]}${srcMatch[2]}${srcMatch[1]}`;
    next = next
      .replace(/\stype=(['"])(?:text\/)?rocketlazyloadscript\1/gi, "")
      .replace(/\sdata-rocket-src=(['"]).*?\1/gi, "")
      .replace(/\sdata-rocket-defer\b/gi, "");
    return `<script${next}>`;
  });
}

function rewriteRocketMinPaths(html) {
  // /wp-content/cache/min/1/wp-content/... → /wp-content/...
  return html.replace(
    /\/wp-content\/cache\/min\/\d+\/(wp-(?:content|includes)\/[^"'?\s>]+)/gi,
    "/$1",
  );
}

function rewriteOriginUrls(text) {
  let out = text;
  out = out.replace(/https?:\/\/(?:www\.)?emiratiguard\.com(\/[^"'()\s<>]*)/gi, (_, p) =>
    p.replace(/&amp;/g, "&").split("#")[0],
  );
  out = out.replace(/(?<!:)\/\/(?:www\.)?emiratiguard\.com(\/[^"'()\s<>]*)/gi, (_, p) =>
    p.replace(/&amp;/g, "&").split("#")[0],
  );
  out = out.replace(/https?:\/(?!\/)(wp-content|wp-includes)\//gi, "/$1/");
  return out;
}

function cleanHtml(html, slug) {
  let out = html;
  out = out.replace(/<link[^>]+id=['"]admin-bar-css['"][^>]*>/gi, "");
  out = out.replace(/<style id=['"]admin-bar-inline-css['"][\s\S]*?<\/style>/gi, "");
  out = out.replace(/<div id=['"]wpadminbar['"][\s\S]*?<\/div>/gi, "");
  out = out.replace(/\sadmin-bar\b/g, "");
  out = out.replace(/\slogged-in\b/g, "");
  out = unwrapRocketScripts(out);
  out = rewriteRocketMinPaths(out);
  out = promoteLazyImages(out);
  out = stripHardcodedAnalytics(out);
  out = rewriteOriginUrls(out);

  // Prefer absolute canonical / og:url on emiratiguard.com (fleet standard)
  const pagePath = slug === "homepage" ? "/" : `/${slug.replace(/\/$/, "")}/`;
  const absoluteCanon = `${ORIGIN}${pagePath}`;
  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /(<link\s+[^>]*rel=["']canonical["'][^>]*href=["'])([^"']+)(["'][^>]*>)/i,
      `$1${absoluteCanon}$3`,
    );
    out = out.replace(
      /(<link\s+[^>]*href=["'])([^"']+)(["'][^>]*rel=["']canonical["'][^>]*>)/i,
      `$1${absoluteCanon}$3`,
    );
  } else {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absoluteCanon}" />\n</head>`);
  }
  out = out.replace(
    /(<meta\s+[^>]*property=["']og:url["'][^>]*content=["'])([^"']+)(["'][^>]*>)/i,
    `$1${absoluteCanon}$3`,
  );

  // Inject fleet GTM loader + CF7 bridge (do not invent robots meta — keep live string).
  // Keep /wp-json/ and /wp-admin/admin-ajax.php relative for APB + wp.ajax.
  out = out.replace(
    /"root"\s*:\s*"https:\\\/\\\/emiratiguard\.com\\\/wp-json\\\/"/g,
    '"root":"\\/wp-json\\/"',
  );
  out = out.replace(
    /"root"\s*:\s*"https:\/\/emiratiguard\.com\/wp-json\/"/g,
    '"root":"/wp-json/"',
  );
  if (!out.includes('data-runtime-gtm="1"')) {
    out = out.replace(
      /<\/head>/i,
      `<script src="/runtime-gtm.js" defer data-runtime-gtm="1"></script>\n</head>`,
    );
  }
  const bodyInject = [
    '<script src="/scripts/cf7-bridge.js" defer></script>',
    '<script src="/js/astro-mirror-fixes.js" defer></script>',
  ]
    .filter((tag) => !out.includes(tag.match(/src="([^"]+)"/)[1]))
    .join("\n");
  if (bodyInject) {
    out = out.replace(/<\/body>/i, `${bodyInject}\n</body>`);
  }

  out = out.replace(
    /<head([^>]*)>/i,
    `<head$1>\n<!-- Emirati Guard full HTML mirror · ${slug} · ${new Date().toISOString()} -->`,
  );

  return out;
}

function shouldLocalize(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (!u.hostname.includes("emiratiguard.com")) return false;
    if (/[<>"|?*\s]/.test(u.pathname) && !u.pathname.includes("%")) return false;
    return (
      u.pathname.startsWith("/wp-content/") ||
      u.pathname.startsWith("/wp-includes/") ||
      /\.(css|js|mjs|map|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|json|mp4|webm)$/i.test(
        u.pathname,
      )
    );
  } catch {
    return false;
  }
}

function collectUrls(html) {
  const found = new Set();
  const patterns = [
    /(?:href|src|data-src|data-lazy-src)=["']([^"']+)["']/gi,
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
    /(?:srcset|data-lazy-srcset)=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      let raw = m[1];
      if (!raw || raw.startsWith("data:")) continue;
      // srcset: multiple
      const parts = raw.includes(",") && /\s+\d+w/.test(raw) ? raw.split(",") : [raw];
      for (let part of parts) {
        part = part.trim().split(/\s+/)[0];
        if (!part) continue;
        let abs = part;
        if (part.startsWith("//")) abs = `https:${part}`;
        else if (part.startsWith("/")) abs = ORIGIN + part;
        else if (!/^https?:/i.test(part)) continue;
        abs = abs.split("#")[0].split("?")[0];
        // unwrap rocket min
        abs = abs.replace(
          /\/wp-content\/cache\/min\/\d+\/(wp-(?:content|includes)\/)/i,
          "/$1",
        );
        if (shouldLocalize(abs)) found.add(abs);
      }
    }
  }
  return [...found];
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(remoteUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(remoteUrl).pathname);
  } catch {
    return { remoteUrl, status: "bad-url" };
  }
  pathname = pathname.replace(/\/wp-content\/cache\/min\/\d+\//i, "/");
  const destPath = join(PUBLIC, pathname.replace(/^\//, ""));
  if (await fileExists(destPath)) return { remoteUrl, status: "skipped" };
  await mkdir(dirname(destPath), { recursive: true });
  const res = await fetch(remoteUrl, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    return { remoteUrl, status: "failed", error: `${res.status}` };
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return { remoteUrl, status: "downloaded" };
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(join(PUBLIC, "js"), { recursive: true });

  console.log("Fetching sitemaps…");
  const [pageLocs, postLocs] = await Promise.all([
    fetchSitemapLocs(`${ORIGIN}/page-sitemap.xml`),
    fetchSitemapLocs(`${ORIGIN}/post-sitemap.xml`),
  ]);
  const jobs = [...pageLocs, ...postLocs].map((loc) => {
    const path = pathFromLoc(loc);
    return { loc, path, slug: slugFromPath(path) };
  });
  console.log(`Mirroring ${jobs.length} URLs…`);

  const assetSet = new Set();
  const report = [];

  await mapPool(jobs, CONCURRENCY, async (job) => {
    const url = `${ORIGIN}${job.path === "/" ? "/" : job.path}?nowprocket=1`;
    try {
      const raw = await fetchText(url);
      const cleaned = cleanHtml(raw, job.slug);
      const outPath = join(OUT_DIR, `${job.slug}.cleaned.html`);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, cleaned, "utf8");
      const robots =
        cleaned.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        cleaned.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ||
        null;
      for (const u of collectUrls(cleaned)) assetSet.add(u);
      report.push({ slug: job.slug, path: job.path, ok: true, bytes: cleaned.length, robots });
      console.log(`  OK ${job.slug} (${cleaned.length} bytes) robots=${robots}`);
    } catch (e) {
      report.push({ slug: job.slug, path: job.path, ok: false, error: e.message });
      console.warn(`  FAIL ${job.slug}: ${e.message}`);
    }
  });

  if (!SKIP_ASSETS) {
    const assets = [...assetSet];
    console.log(`Downloading ${assets.length} assets…`);
    let downloaded = 0;
    let failed = 0;
    let skipped = 0;
    await mapPool(assets, ASSET_CONCURRENCY, async (u) => {
      const r = await downloadOne(u);
      if (r.status === "downloaded") downloaded += 1;
      else if (r.status === "failed") failed += 1;
      else skipped += 1;
      return r;
    });
    console.log({ downloaded, skipped, failed });
  }

  // Also pull homepage-linked fonts/CSS that rocket may have missed via inline
  await writeFile(
    join(ROOT, "_crawl", "full-mirror-report.json"),
    JSON.stringify({ at: new Date().toISOString(), report, assetCount: assetSet.size }, null, 2),
  );

  const fails = report.filter((r) => !r.ok);
  console.log({ ok: report.length - fails.length, fail: fails.length });
  if (fails.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
