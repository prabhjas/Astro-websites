/**
 * Replace /es/about-us/ with exact live About Elementor structure.
 * Live pretty URL /es/about-us/ is 404; structure source is EN About
 * (same document WP returns for ?lang=es).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const PATH = "/es/about-us/";
const SOURCE = `${ORIGIN}/about-us/?nowprocket=1`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function stripDomain(html) {
  return String(html || "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "")
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("//iberiaeor.com", "")
    .replaceAll("//www.iberiaeor.com", "");
}

function extractPageBody(html) {
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="wp-page"]').first();
  if (!el.length) return "";
  return $.html(el);
}

function collectPageCss(html) {
  const hrefs = [];
  for (const m of html.matchAll(
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi,
  )) {
    const href = m[1] || m[2];
    if (!href) continue;
    if (/elementor\/css\/post-\d+\.css|sticky\.min\.css|widget-/.test(href)) {
      try {
        const u = new URL(href, ORIGIN);
        hrefs.push(u.pathname);
      } catch {
        if (href.startsWith("/")) hrefs.push(href);
      }
    }
  }
  return [...new Set(hrefs)];
}

function extractSeo(html) {
  const $ = cheerio.load(html);
  return {
    title: $("title").first().text().trim(),
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "",
    canonical: PATH,
    ogImage:
      ($('meta[property="og:image"]').attr("content") || "").replace(ORIGIN, "") ||
      undefined,
    schemas: [],
  };
}

async function downloadIfMissing(pathname) {
  const dest = path.join(ROOT, "public", pathname.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return false;
  const res = await fetch(ORIGIN + pathname, { headers: { "User-Agent": UA } });
  if (!res.ok) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

// Prefer pretty ES URL if it ever returns content; else EN about structure
let sourceUrl = `${ORIGIN}/es/about-us/?nowprocket=1`;
let res = await fetch(sourceUrl, {
  headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "es" },
});
let html = await res.text();
let title = (html.match(/<title>([^<]+)/i) || [])[1] || "";
if (!res.ok || /page not found/i.test(title) || !/data-elementor-type="wp-page"/.test(html)) {
  console.warn("pretty /es/about-us/ unavailable (", res.status, title.slice(0, 40), ") - using live About structure");
  sourceUrl = SOURCE;
  res = await fetch(sourceUrl, { headers: { "User-Agent": UA, Accept: "text/html" } });
  html = await res.text();
  title = (html.match(/<title>([^<]+)/i) || [])[1] || "";
}

const bodyHtml = stripDomain(extractPageBody(html));
if (bodyHtml.length < 1000) {
  console.error("body too thin", bodyHtml.length);
  process.exit(1);
}

const elId = bodyHtml.match(/data-elementor-id="(\d+)"/)?.[1] || "96";
const pageCss = collectPageCss(html);
const seo = extractSeo(html);
seo.canonical = PATH;

// Keep EN about pageCss extras from existing entry if present
const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const enAbout = pages.find((p) => p.path === "/about-us/");
const mergedCss = [
  ...new Set([
    ...(enAbout?.pageCss || []),
    ...pageCss,
    `/wp-content/uploads/elementor/css/post-${elId}.css`,
  ]),
];

for (const href of mergedCss) {
  if (href.includes(`/post-${elId}.css`) || href.includes("post-96.css") || href.includes("sticky")) {
    const got = await downloadIfMissing(href);
    if (got) console.log("downloaded", href);
  }
}

const entry = {
  ...(enAbout || {}),
  id: Number(elId),
  type: "page",
  path: PATH,
  slug: "about-us",
  title: "About us",
  content: bodyHtml,
  bodyHtml,
  status: "published",
  elementorCss: `/wp-content/uploads/elementor/css/post-${elId}.css`,
  pageCss: mergedCss,
  lang: "es",
  seo: {
    ...seo,
    title: seo.title || "About us | Iberia EOR",
    description: seo.description,
  },
  sourceUrl,
};

const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
const idx = pages.findIndex((p) => p.path === PATH);
if (idx >= 0) pages[idx] = { ...pages[idx], ...entry };
else pages.push(entry);
bodies[PATH] = bodyHtml;

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

const $ = cheerio.load(bodyHtml);
console.log(
  JSON.stringify(
    {
      sourceUrl,
      status: res.status,
      path: PATH,
      elementorId: elId,
      bodyLen: bodyHtml.length,
      topSections: $("section.elementor-top-section").length,
      widgets: $("[data-widget_type]").length,
      css: mergedCss.filter((c) => c.includes("post-")),
    },
    null,
    2,
  ),
);
