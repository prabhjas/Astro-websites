/**
 * Sync Rank Math sitemap URLs from the live WordPress site into src/data/sitemap-urls.json
 * so the SEO dashboard + public /sitemap_index.xml match production.
 *
 * Usage: npm run sitemap:sync
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const LIVE_INDEX =
  process.env.LIVE_SITEMAP_INDEX || "https://connectfz.com/sitemap_index.xml";
const OUT = join(process.cwd(), "src/data/sitemap-urls.json");

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "EORMiddleEastSitemapSync/1.0",
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

const indexXml = await fetchText(LIVE_INDEX);
const childLocs = extractLocs(indexXml);
const pages = [];
const posts = [];
const guides = [];
const country = [];
const eor = [];

for (const child of childLocs) {
  if (/page-sitemap/i.test(child)) {
    pages.push(...parseUrlset(await fetchText(child), "page"));
  } else if (/post-sitemap/i.test(child)) {
    posts.push(...parseUrlset(await fetchText(child), "post"));
  } else if (/guides?-sitemap/i.test(child)) {
    guides.push(...parseUrlset(await fetchText(child), "guide"));
  } else if (/country-sitemap/i.test(child)) {
    country.push(...parseUrlset(await fetchText(child), "country"));
  } else if (/eor-sitemap/i.test(child)) {
    eor.push(...parseUrlset(await fetchText(child), "eor"));
  }
}

const payload = {
  source: LIVE_INDEX,
  fetchedAt: new Date().toISOString(),
  pages,
  posts,
  guides,
  country,
  eor,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT}`);
console.log(
  `pages=${pages.length} posts=${posts.length} guides=${guides.length} country=${country.length} eor=${eor.length}`,
);
