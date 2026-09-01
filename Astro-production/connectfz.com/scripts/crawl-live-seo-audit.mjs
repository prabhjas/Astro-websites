#!/usr/bin/env node
/**
 * Crawl live connectfz.com pages/posts from sitemap and export SEO audit CSV.
 * Usage: node scripts/crawl-live-seo-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.CRAWL_ORIGIN || "https://connectfz.com";
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 8);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "reports");
const OUT_CSV = path.join(OUT_DIR, "connectfz-live-seo-audit.csv");

function decodeHtml(s) {
  let out = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ");
  out = out.replace(/&#(\d+);/g, (_, code) =>
    String.fromCodePoint(Number(code)),
  );
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  return out;
}

function stripTags(s) {
  return decodeHtml(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? stripTags(m[1]) : "";
}

function allMatches(html, re) {
  const out = [];
  for (const m of html.matchAll(re)) out.push(stripTags(m[1]));
  return out;
}

function parseJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim();
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return blocks;
}

function flattenJsonLd(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenJsonLd(item, out);
    return out;
  }
  if (typeof node === "object") {
    out.push(node);
    if (node["@graph"]) flattenJsonLd(node["@graph"], out);
  }
  return out;
}

function pageTitleFromStructuredData(blocks) {
  const flat = blocks.flatMap((b) => flattenJsonLd(b));
  const article = flat.find((n) => {
    const t = n["@type"];
    return t === "Article" || (Array.isArray(t) && t.includes("Article"));
  });
  if (article?.headline) return stripTags(String(article.headline));

  const webPage = flat.find((n) => {
    const t = n["@type"];
    return t === "WebPage" || (Array.isArray(t) && t.includes("WebPage"));
  });
  if (webPage?.name) return stripTags(String(webPage.name));

  const crumbs = flat.find((n) => n["@type"] === "BreadcrumbList");
  if (crumbs?.itemListElement?.length) {
    const last = crumbs.itemListElement[crumbs.itemListElement.length - 1];
    if (last?.name) return stripTags(String(last.name));
  }
  return "";
}

function postTitleFromHtml(html) {
  const jsonLd = parseJsonLdBlocks(html);
  const fromSchema = pageTitleFromStructuredData(jsonLd);
  if (fromSchema) return fromSchema;

  const fromWidget = firstMatch(
    html,
    /elementor-widget-theme-post-title[\s\S]{0,1200}?<h1[^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (fromWidget) return fromWidget;

  const fromEntry = firstMatch(
    html,
    /class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/(?:h1|a|span|div)>/i,
  );
  if (fromEntry) return fromEntry;

  return "";
}

function pageTitleFromHtml(html, metaTitle, h1) {
  // On the live Astro mirror, the WP admin page title is rendered in <title>.
  if (metaTitle) return metaTitle;

  const crumbs = allMatches(
    html,
    /class=["'][^"']*breadcrumb[^"']*["'][\s\S]*?<li[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi,
  );
  if (crumbs.length) return crumbs[crumbs.length - 1];

  const fromHero = firstMatch(
    html,
    /data-widget_type=["']heading\.default["'][\s\S]{0,1200}?<h1[^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (fromHero) return fromHero;

  return h1;
}

function extractSeo(html, url, sitemapType) {
  const metaTitle = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  const h1s = allMatches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
  const h1 = h1s[0] || "";

  const type = sitemapType === "post" ? "Blog post" : "Page";
  const pageTitle =
    type === "Blog post"
      ? postTitleFromHtml(html) || h1 || metaTitle
      : pageTitleFromHtml(html, metaTitle, h1);

  return {
    url,
    type,
    pageTitle,
    h1,
    metaTitle,
    metaDescription,
  };
}

async function fetchText(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ConnectFZ-SEO-Audit/1.0 (+internal)" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function sitemapKind(url) {
  if (/post-sitemap/i.test(url)) return "post";
  if (/page-sitemap/i.test(url)) return "page";
  return "other";
}

async function collectSitemapUrls() {
  const indexXml = await fetchText(`${ORIGIN}/sitemap_index.xml`);
  const childSitemaps = parseSitemapLocs(indexXml).filter((u) =>
    u.includes("-sitemap"),
  );
  const byUrl = new Map();
  for (const sm of childSitemaps) {
    const kind = sitemapKind(sm);
    const xml = await fetchText(sm);
    for (const loc of parseSitemapLocs(xml)) {
      if (!byUrl.has(loc)) byUrl.set(loc, kind);
    }
  }
  return [...byUrl.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([url, kind]) => ({ url, kind }));
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const headers = [
    "Page/Blog URL",
    "Current Page/Blog Title",
    "Current H1",
    "Current Meta Title",
    "Current Meta Description",
    "Content Type",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.url,
        r.pageTitle,
        r.h1,
        r.metaTitle,
        r.metaDescription,
        r.type,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return `\ufeff${lines.join("\n")}\n`;
}

async function main() {
  console.log(`Collecting URLs from ${ORIGIN}/sitemap_index.xml …`);
  const urls = await collectSitemapUrls();
  console.log(`Found ${urls.length} URLs. Crawling with concurrency ${CONCURRENCY}…`);

  const rows = await mapPool(urls, CONCURRENCY, async ({ url, kind }) => {
    try {
      const html = await fetchText(url);
      return extractSeo(html, url, kind);
    } catch (err) {
      return {
        url,
        type: kind === "post" ? "Blog post" : "Page",
        pageTitle: "",
        h1: "",
        metaTitle: "",
        metaDescription: "",
        error: err.message,
      };
    }
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_CSV, toCsv(rows), "utf8");

  const pages = rows.filter((r) => r.type === "Page").length;
  const posts = rows.filter((r) => r.type === "Blog post").length;
  const errors = rows.filter((r) => r.error);
  console.log(`Wrote ${OUT_CSV}`);
  console.log(`Rows: ${rows.length} (${pages} pages, ${posts} blog posts), errors: ${errors.length}`);
  if (errors.length) {
    console.log("Failed URLs:");
    for (const e of errors.slice(0, 10)) console.log(" ", e.url, e.error);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
