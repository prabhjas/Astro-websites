/**
 * Repair truncated src/data/pages.json after a bad edit.
 * Rebuilds page metadata from live WP REST, keeps local bodyHtml/pageCss where available.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://emiratiguard.com";
const UA = "EMIRATIGUARD-Astro-Repair/1.0";

function rewriteUrl(url) {
  if (!url) return url;
  return String(url)
    .replaceAll(ORIGIN, "")
    .replaceAll("https://emiratiguard.com", "")
    .replaceAll("http://emiratiguard.com", "")
    .replaceAll("https://www.emiratiguard.com", "")
    .replaceAll("http://www.emiratiguard.com", "");
}

function stripDomainInHtml(html) {
  if (!html) return html;
  return html
    .replaceAll("https://www.emiratiguard.com", "")
    .replaceAll("http://www.emiratiguard.com", "")
    .replaceAll("https://emiratiguard.com", "")
    .replaceAll("http://emiratiguard.com", "")
    .replaceAll("//emiratiguard.com", "")
    .replaceAll("//www.emiratiguard.com", "");
}

function pathFromLink(link) {
  const u = new URL(link);
  let p = u.pathname;
  if (!p.endsWith("/") && !path.extname(p)) p += "/";
  return p;
}

function seoFromYoastOrRank(p) {
  const yoast = p.yoast_head_json || {};
  const rank = p.rank_math || {};
  return {
    title: yoast.title || rank.title || p.title?.rendered || "",
    description: yoast.description || rank.description || "",
    canonical: yoast.canonical || rank.canonical_url || p.link || "",
    ogImage: yoast.og_image?.[0]?.url || "",
  };
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${ORIGIN}/wp-json/wp/v2/${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}&_embed=1`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page += 1;
  }
  return items;
}

function mapPage(p, wpType = "page") {
  const s = seoFromYoastOrRank(p);
  let excerpt = stripDomainInHtml(p.excerpt?.rendered || "");
  if (/casino|viagra|cialis|mr\s*q/i.test(excerpt)) excerpt = "";
  return {
    id: p.id,
    type: "page",
    wpType,
    slug: p.slug,
    path: pathFromLink(p.link),
    link: p.link,
    title: p.title?.rendered || "",
    content: stripDomainInHtml(p.content?.rendered || ""),
    excerpt,
    date: p.date,
    modified: p.modified,
    parent: p.parent || 0,
    menuOrder: p.menu_order || 0,
    featuredImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url
      ? rewriteUrl(p._embedded["wp:featuredmedia"][0].source_url)
      : "",
    elementorCss: `/wp-content/uploads/elementor/css/post-${p.id}.css`,
    seo: {
      ...s,
      canonical: rewriteUrl(s.canonical),
      ogImage: rewriteUrl(s.ogImage),
    },
  };
}

function salvageLocalPages() {
  const brokenPath = path.join(DATA, "pages.json");
  const broken = fs.readFileSync(brokenPath, "utf8");
  fs.copyFileSync(brokenPath, path.join(DATA, "pages.json.truncated-bak"));
  const marker = "\n  },\n  {";
  let idx = 0;
  const ends = [];
  while (true) {
    const i = broken.indexOf(marker, idx);
    if (i < 0) break;
    ends.push(i + 4);
    idx = i + marker.length;
  }
  if (!ends.length) return { byPath: new Map(), count: 0 };
  const pages = JSON.parse(broken.slice(0, ends[ends.length - 1]) + "\n]\n");
  const byPath = new Map(pages.map((p) => [p.path, p]));
  return { byPath, count: pages.length };
}

async function main() {
  console.log("Salvaging local pageCss/bodyHtml…");
  const { byPath: localByPath, count: localCount } = salvageLocalPages();
  console.log("salvaged complete pages:", localCount);

  const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
  const seoMap = JSON.parse(fs.readFileSync(path.join(DATA, "seo.json"), "utf8"));

  console.log("Fetching pages from live WP REST…");
  const wpPages = await fetchAll("pages");
  console.log("wp pages:", wpPages.length);

  const rebuilt = wpPages.map((p) => {
    const entry = mapPage(p);
    const local = localByPath.get(entry.path);
    const body = bodies[entry.path] || local?.bodyHtml || "";
    if (body) entry.bodyHtml = body;
    entry.pageCss = local?.pageCss || [];
    if (seoMap[entry.path]) {
      entry.seo = { ...entry.seo, ...seoMap[entry.path] };
    }
    if (local?.content && (!entry.content || entry.content.length < 200)) {
      entry.content = local.content;
    }
    return entry;
  });

  rebuilt.sort((a, b) => a.path.localeCompare(b.path));

  const outPath = path.join(DATA, "pages.json");
  fs.writeFileSync(outPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
  JSON.parse(fs.readFileSync(outPath, "utf8")); // validate

  const withBody = rebuilt.filter((p) => (p.bodyHtml || "").length > 500).length;
  const withCss = rebuilt.filter((p) => (p.pageCss || []).length > 0).length;
  const home = rebuilt.find((p) => p.path === "/" || p.id === 67);
  console.log({
    pages: rebuilt.length,
    withBody,
    withCss,
    homeExcerpt: home?.excerpt,
  });
  console.log("pages.json repaired.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
