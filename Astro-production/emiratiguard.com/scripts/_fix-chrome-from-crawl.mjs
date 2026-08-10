/**
 * Emirati Guard uses Twenty Twenty + Visual Composer (not Elementor chrome).
 * Pull header/footer + stylesheet order from the crawled homepage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crawlHome = path.join(ROOT, "_crawl", "homepage.html");
const ORIGIN = "https://emiratiguard.com";

function stripDomain(html) {
  return html
    .replaceAll("https://www.emiratiguard.com", "")
    .replaceAll("http://www.emiratiguard.com", "")
    .replaceAll("https://emiratiguard.com", "")
    .replaceAll("http://emiratiguard.com", "")
    .replaceAll("//emiratiguard.com", "")
    .replaceAll("//www.emiratiguard.com", "");
}

function absToLocal(href) {
  if (!href) return null;
  try {
    const u = new URL(href, ORIGIN);
    if (!u.hostname.includes("emiratiguard.com")) return null;
    // Prefer unminified WP Rocket cache URLs → original paths when possible
    let p = u.pathname;
    const rocket = p.match(/\/wp-content\/cache\/min\/\d+(\/wp-(?:content|includes)\/.+)\?/);
    // pathname doesn't include query; handle cache/min inline
    const cacheIdx = p.indexOf("/wp-content/cache/min/");
    if (cacheIdx === 0) {
      const rest = p.replace(/^\/wp-content\/cache\/min\/\d+\//, "/");
      p = rest.startsWith("/wp-") ? rest : p;
    }
    return p;
  } catch {
    return null;
  }
}

const html = fs.readFileSync(crawlHome, "utf8");
const $ = cheerio.load(html, { decodeEntities: false });

const headerEl =
  $("#site-header").first().length > 0
    ? $("#site-header").first()
    : $("header").first();
const footerEl =
  $("#site-footer").first().length > 0
    ? $("#site-footer").first()
    : $("footer").first();

const headerHtml = headerEl.length ? $.html(headerEl) : "";
const footerHtml = footerEl.length ? $.html(footerEl) : "";

if (!headerHtml || headerHtml.length < 200) {
  console.warn("WARN: header short/missing", headerHtml.length);
}
if (!footerHtml || footerHtml.length < 200) {
  console.warn("WARN: footer short/missing", footerHtml.length);
}

fs.writeFileSync(path.join(ROOT, "src", "data", "header.html"), stripDomain(headerHtml));
fs.writeFileSync(path.join(ROOT, "src", "data", "footer.html"), stripDomain(footerHtml));
fs.writeFileSync(path.join(ROOT, "_crawl", "header.html"), stripDomain(headerHtml));
fs.writeFileSync(path.join(ROOT, "_crawl", "footer.html"), stripDomain(footerHtml));

const css = [];
const seen = new Set();
$('link[rel="stylesheet"]').each((_, el) => {
  const href = $(el).attr("href");
  const local = absToLocal(href);
  if (!local || seen.has(local)) return;
  // Skip WP admin / dashicons if desired — keep for fidelity
  seen.add(local);
  css.push(local);
});

// BaseLayout expects a top-level string[] stylesheet order.
fs.writeFileSync(
  path.join(ROOT, "src", "data", "live-css-order.json"),
  JSON.stringify(css, null, 2),
);

// Ensure bodyHtml falls back from REST content for pages/posts
const pagesPath = path.join(ROOT, "src", "data", "pages.json");
const postsPath = path.join(ROOT, "src", "data", "posts.json");
const bodiesPath = path.join(ROOT, "src", "data", "bodies.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
const bodies = {};

function fillBodies(entries) {
  let filled = 0;
  for (const e of entries) {
    const htmlBody = e.bodyHtml || e.content || "";
    if (htmlBody && htmlBody.length > 200) {
      e.bodyHtml = stripDomain(htmlBody);
      bodies[e.path] = e.bodyHtml;
      filled += 1;
    }
  }
  return filled;
}

const pf = fillBodies(pages);
const of = fillBodies(posts);
fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2));

console.log({
  headerLen: headerHtml.length,
  footerLen: footerHtml.length,
  stylesheets: css.length,
  pagesFilled: pf,
  postsFilled: of,
  bodies: Object.keys(bodies).length,
  cssSample: css.slice(0, 15),
});
