/**
 * Sync Rank Math sitemap URLs from the live WordPress site into src/data/sitemap-urls.json
 * so the SEO dashboard + public /sitemap_index.xml match production.
 *
 * Usage: npm run sitemap:sync
 *
 * Falls back to LOCAL_SITEMAP_DIR XML dumps when live child sitemaps fail.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LIVE_INDEX =
  process.env.LIVE_SITEMAP_INDEX || "https://c-uae.com/sitemap_index.xml";
const LOCAL_DIR = process.env.LOCAL_SITEMAP_DIR || "";
const OUT = join(process.cwd(), "src/data/sitemap-urls.json");

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CUAESitemapSync/1.0",
      Accept: "application/xml,text/xml,*/*",
    },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.text();
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

function parseUrlset(xml, type) {
  const entries = [];
  const blocks = xml.split(/<url>/i).slice(1);
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim();
    let path = "/";
    try {
      path = new URL(loc).pathname || "/";
    } catch {
      continue;
    }
    if (path !== "/" && !path.endsWith("/")) path += "/";
    entries.push({
      path,
      type,
      ...(lastmod ? { lastmod } : {}),
    });
  }
  return entries;
}

function readLocal(name) {
  if (!LOCAL_DIR) return null;
  const p = join(LOCAL_DIR, name);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

let pages = [];
let posts = [];

try {
  const indexXml = await fetchText(LIVE_INDEX);
  const childLocs = extractLocs(indexXml);
  for (const child of childLocs) {
    try {
      if (/page-sitemap/i.test(child)) {
        pages.push(...parseUrlset(await fetchText(child), "page"));
      } else if (/post-sitemap/i.test(child)) {
        posts.push(...parseUrlset(await fetchText(child), "post"));
      }
    } catch (err) {
      console.warn("live child failed:", child, err.message);
    }
  }
} catch (err) {
  console.warn("live index failed:", err.message);
}

if (!pages.length) {
  const local =
    readLocal("page-sitemap-1.xml") ||
    readLocal("page-sitemap.xml");
  if (local) {
    pages = parseUrlset(local, "page");
    console.log("seeded pages from local dump:", pages.length);
  }
}
if (!posts.length) {
  const local =
    readLocal("post-sitemap-0.xml") ||
    readLocal("post-sitemap.xml");
  if (local) {
    posts = parseUrlset(local, "post");
    console.log("seeded posts from local dump:", posts.length);
  }
}

const payload = {
  source: LIVE_INDEX,
  fetchedAt: new Date().toISOString(),
  pages,
  posts,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT}`);
console.log(`pages=${pages.length} posts=${posts.length}`);
