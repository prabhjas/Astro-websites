#!/usr/bin/env node
/**
 * import-live-html.mjs — Fetch live raadrecruitment.ae pages + posts,
 * extract content, download assets, and build pages.json / posts.json.
 *
 * Usage:  node scripts/import-live-html.mjs
 */

import { load } from "cheerio";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "src", "data");
const PUBLIC = join(ROOT, "public");

const ORIGIN = "https://raadrecruitment.ae";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const PAGE_SITEMAP = `${ORIGIN}/page-sitemap.xml`;
const POST_SITEMAP = `${ORIGIN}/post-sitemap.xml`;

const CONCURRENCY = 5;

async function fetchText(url, accept = "*/*") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function loadSitemapPaths(sitemapUrl) {
  const xml = await fetchText(sitemapUrl, "application/xml,text/xml,*/*");
  if (!xml || !xml.includes("<loc>")) throw new Error(`Failed to load sitemap: ${sitemapUrl}`);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const paths = [];
  for (const loc of locs) {
    try {
      const u = new URL(loc);
      if (!u.hostname.includes("raadrecruitment.ae")) continue;
      if (u.pathname.includes("/wp-content/")) continue;
      paths.push(normPath(u.pathname));
    } catch { /* skip */ }
  }
  return [...new Set(paths)];
}

function normPath(p) {
  if (!p) return "/";
  let s = p.replace(/^https?:\/\/[^/]+/, "");
  if (!s.startsWith("/")) s = "/" + s;
  if (s !== "/" && !s.endsWith("/")) s += "/";
  return s;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const u = new URL(url);
    if (!u.searchParams.has("nowprocket")) u.searchParams.set("nowprocket", "1");
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function downloadAsset(url, dest) {
  if (existsSync(dest)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return true;
  } catch { return false; }
}

async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

function extractMeta($) {
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() || "";
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") || "";
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  return { title, description, canonical, ogImage };
}

function extractContent($) {
  const selectors = [
    "#page-content",
    ".l-main",
    ".l-canvas .l-main",
    '[data-elementor-type="wp-page"]',
    '[data-elementor-type="wp-post"]',
    "article.post",
    "article",
    ".w-blog",
    ".elementor",
    "main",
    ".l-canvas",
  ];
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.html().trim().length > 100) return el.html().trim();
  }
  return $("body").html() || "";
}

function extractHeader($) {
  for (const sel of ["header.l-header", "header#l-header", ".l-header", "header"]) {
    const el = $(sel);
    if (el.length) return $.html(el).trim();
  }
  return "";
}

function extractFooter($) {
  for (const sel of ["footer.l-footer", "footer#l-footer", ".l-footer", "footer"]) {
    const el = $(sel);
    if (el.length) return $.html(el).trim();
  }
  return "";
}

function rewriteUrls(html) {
  if (!html) return html;
  return html
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae/g, "");
}

function stripGtm(html) {
  if (!html) return html;
  return html
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, "")
    .replace(/<script[^>]*(?:gtm|googletagmanager)[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?googletagmanager[\s\S]*?<\/noscript>/gi, "");
}

function extractStylesheets($) {
  const hrefs = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href) return;
    const cleaned = href
      .replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "")
      .split("?")[0];
    if (cleaned.startsWith("/wp-content/") || cleaned.startsWith("/wp-includes/")) {
      hrefs.push(cleaned);
    }
  });
  return hrefs;
}

function collectAssetUrls(html) {
  const urls = new Set();
  const patterns = [
    /(?:href|src|srcset)="(\/wp-content\/[^"\s,]+)"/g,
    /(?:href|src|srcset)="(\/wp-includes\/[^"\s,]+)"/g,
    /(?:href|src)="(https?:\/\/(?:www\.)?raadrecruitment\.ae\/wp-content\/[^"\s]+)"/g,
    /url\(['"]?(\/wp-content\/[^'")]+)['"]?\)/g,
    /,\s*(\/wp-content\/[^\s,]+)/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(html))) {
      let u = m[1].replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "").split("?")[0];
      if (u.startsWith("/wp-content/") || u.startsWith("/wp-includes/")) urls.add(u);
    }
  }
  return urls;
}

function extractExcerpt(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").slice(0, 35);
  return `<p>${words.join(" ")}${words.length >= 35 ? " [&hellip;]" : ""}</p>`;
}

// Paths we know are pages (from page-sitemap.xml)
const PAGE_PATHS = new Set([
  "/",
  "/about-raad-recruitment/",
  "/blog/",
  "/contact-us/",
  "/staff-outsourcing-in-uae/",
  "/mazaya/",
  "/recruitment/",
  "/emiratisation/",
]);

// -- MAIN --

console.log("=== raadrecruitment.ae live HTML import ===");

// 1. Load sitemaps
console.log("\n[1] Loading sitemaps…");
const [pagePaths, postPaths] = await Promise.all([
  loadSitemapPaths(PAGE_SITEMAP),
  loadSitemapPaths(POST_SITEMAP),
]);
console.log(`  pages:  ${pagePaths.length}`);
console.log(`  posts:  ${postPaths.length}`);

// 2. Fetch pages
console.log("\n[2] Fetching pages…");
const pageEntries = [];
const globalCss = new Set();
const assetUrls = new Set();

const pageTasks = pagePaths.map((path) => async () => {
  const url = `${ORIGIN}${path}`;
  const html = await fetchPage(url);
  if (!html) { console.log(`  SKIP  ${path}`); return; }
  const $ = load(html);
  const meta = extractMeta($);
  const bodyHtml = rewriteUrls(extractContent($));
  const cssFiles = extractStylesheets($);
  cssFiles.forEach((c) => globalCss.add(c));
  collectAssetUrls(html).forEach((u) => assetUrls.add(u));
  const slug = path.replace(/^\/|\/$/g, "") || "home";
  const entry = {
    id: pageEntries.length + 1,
    type: "page",
    slug,
    path,
    link: `${ORIGIN}${path}`,
    title: meta.title || slug,
    content: bodyHtml,
    bodyHtml,
    excerpt: extractExcerpt(bodyHtml),
    date: "2025-01-01T00:00:00",
    modified: "2025-01-01T00:00:00",
    parent: 0,
    menuOrder: 0,
    featuredImage: meta.ogImage
      ? meta.ogImage.replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "")
      : "",
    pageCss: cssFiles,
    seo: {
      title: meta.title,
      description: meta.description,
      canonical: path,
      ogImage: meta.ogImage
        ? meta.ogImage.replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "")
        : "",
    },
  };
  pageEntries.push(entry);
  console.log(`  OK    ${path}  (${bodyHtml.length} chars)`);
});

await runPool(pageTasks, CONCURRENCY);
console.log(`  → ${pageEntries.length} page entries`);

// Also extract header/footer from homepage
const homeHtml = await fetchPage(`${ORIGIN}/`);
if (homeHtml) {
  const $h = load(homeHtml);
  const headerHtml = stripGtm(rewriteUrls(extractHeader($h)));
  const footerHtml = stripGtm(rewriteUrls(extractFooter($h)));
  writeFileSync(join(DATA, "header.html"), headerHtml, "utf8");
  writeFileSync(join(DATA, "footer.html"), footerHtml, "utf8");
  console.log("  → header.html, footer.html updated");
}

// 3. Fetch posts
console.log("\n[3] Fetching posts…");
const postEntries = [];
// Categories and tags
const categoryMap = new Map(); // name → id
const tagMap = new Map(); // name → id
let catIdSeq = 1;
let tagIdSeq = 1;

function ensureCategory(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!categoryMap.has(slug)) {
    categoryMap.set(slug, { id: catIdSeq++, name, slug, path: `/category/${slug}/`, description: "", count: 0, status: "active" });
  }
  const cat = categoryMap.get(slug);
  cat.count++;
  return cat.id;
}

function ensureTag(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!tagMap.has(slug)) {
    tagMap.set(slug, { id: tagIdSeq++, name, slug, path: `/tag/${slug}/`, description: "", count: 0, status: "active" });
  }
  const tag = tagMap.get(slug);
  tag.count++;
  return tag.id;
}

const postTasks = postPaths.map((path) => async () => {
  const url = `${ORIGIN}${path}`;
  const html = await fetchPage(url);
  if (!html) { console.log(`  SKIP  ${path}`); return; }
  const $ = load(html);
  const meta = extractMeta($);
  const bodyHtml = rewriteUrls(extractContent($));
  collectAssetUrls(html).forEach((u) => assetUrls.add(u));
  const cssFiles = extractStylesheets($);
  cssFiles.forEach((c) => globalCss.add(c));

  // Extract category from breadcrumb or meta
  const catEl = $(".post-cat-links a, .entry-category a, .cat-links a, .category-name, .w-blog-post-cats a").first();
  const catName = catEl.text().trim() || "Blog";
  const catId = ensureCategory(catName);

  // Extract published date
  const dateEl = $("time[datetime]").attr("datetime") ||
    $('meta[property="article:published_time"]').attr("content") ||
    "2025-01-01T00:00:00";
  const modifiedEl = $('meta[property="article:modified_time"]').attr("content") || dateEl;

  // Extract featured image
  const featImg = ($('meta[property="og:image"]').attr("content") || "")
    .replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "");

  const slug = path.replace(/^\/|\/$/g, "");
  const entry = {
    id: postEntries.length + 1,
    type: "post",
    slug,
    path,
    link: `${ORIGIN}${path}`,
    title: meta.title || slug,
    content: bodyHtml,
    bodyHtml,
    excerpt: extractExcerpt(bodyHtml),
    date: dateEl,
    modified: modifiedEl,
    categories: [catId],
    tags: [],
    author: 1,
    authorName: "RAAD Recruitment",
    authorSlug: "raad-recruitment",
    featuredImage: featImg,
    pageCss: cssFiles,
    seo: {
      title: meta.title,
      description: meta.description,
      canonical: path,
      ogImage: featImg,
    },
    status: "published",
  };
  postEntries.push(entry);
  console.log(`  OK  ${path}`);
});

await runPool(postTasks, CONCURRENCY);
console.log(`  → ${postEntries.length} post entries`);

// 4. Write data files
console.log("\n[4] Writing data files…");
writeFileSync(join(DATA, "pages.json"), JSON.stringify(pageEntries, null, 2) + "\n", "utf8");
writeFileSync(join(DATA, "posts.json"), JSON.stringify(postEntries, null, 2) + "\n", "utf8");

const categories = [...categoryMap.values()];
const tags = [...tagMap.values()];
writeFileSync(join(DATA, "categories.json"), JSON.stringify(categories, null, 2) + "\n", "utf8");
writeFileSync(join(DATA, "tags.json"), JSON.stringify(tags, null, 2) + "\n", "utf8");

// authors (already exists; ensure correct)
const authors = [{
  id: 1,
  name: "RAAD Recruitment",
  slug: "raad-recruitment",
  path: "/author/raad-recruitment/",
  description: "RAAD Recruitment editorial team.",
  avatar: "",
}];
writeFileSync(join(DATA, "authors.json"), JSON.stringify(authors, null, 2) + "\n", "utf8");

// global-css.json (deduplicated stylesheets)
writeFileSync(join(DATA, "global-css.json"), JSON.stringify([...globalCss], null, 2) + "\n", "utf8");

console.log(`  pages.json:      ${pageEntries.length} entries`);
console.log(`  posts.json:      ${postEntries.length} entries`);
console.log(`  categories.json: ${categories.length} entries`);
console.log(`  tags.json:       ${tags.length} entries`);

// 5. Download assets
console.log(`\n[5] Downloading ${assetUrls.size} assets…`);
const assetTasks = [...assetUrls].map((u) => async () => {
  const dest = join(PUBLIC, u.slice(1).replace(/[?#].*$/, ""));
  if (existsSync(dest)) return false;
  const downloaded = await downloadAsset(`${ORIGIN}${u}`, dest);
  if (downloaded) console.log(`  DL  ${u}`);
  return downloaded;
});
const dlResults = await runPool(assetTasks, 8);
const downloaded = dlResults.filter(Boolean).length;
console.log(`  → ${downloaded} new assets downloaded (${assetUrls.size - downloaded} already present)`);

console.log("\n=== Import complete ===");
console.log(`Run: pnpm --filter raadrecruitment-astro run build`);
