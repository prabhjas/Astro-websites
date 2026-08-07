/**
 * Refresh Impreza page/post bodies from live HTML (?nowprocket=1).
 * Extracts #page-content / article content + per-page design CSS + assets.
 *
 * Usage:
 *   node scripts/refresh-bodies.mjs
 *   node scripts/refresh-bodies.mjs --only=pages --limit=40
 *   node scripts/refresh-bodies.mjs --paths=/,/payroll/,/contact/
 *   node scripts/refresh-bodies.mjs --concurrency=4
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "https://mbs-consultancy.com";
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const UA = "MBSConsultancy-Astro-Migration/1.0";

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1] || "all";
const pathsArg = args.find((a) => a.startsWith("--paths="))?.split("=")[1];
const pathFilter = pathsArg
  ? new Set(
      pathsArg.split(",").map((p) => {
        if (p === "/") return "/";
        return p.endsWith("/") ? p : `${p}/`;
      }),
    )
  : null;
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || 0);
const concurrency = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || 4);

function stripDomain(html) {
  return html
    .replaceAll("https://www.mbs-consultancy.com", "")
    .replaceAll("http://www.mbs-consultancy.com", "")
    .replaceAll("https://mbs-consultancy.com", "")
    .replaceAll("http://mbs-consultancy.com", "")
    .replaceAll("//www.mbs-consultancy.com", "")
    .replaceAll("//mbs-consultancy.com", "");
}

function extractById(html, id) {
  const marker = `id="${id}"`;
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  const openEnd = html.indexOf(">", start);
  const name = (html.slice(start, openEnd + 1).match(/^<\/?\s*([a-zA-Z0-9:-]+)/) || [])[1];
  if (!name) return "";
  let i = start;
  let depth = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      i++;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    const tagEnd = html.indexOf(">", i);
    if (tagEnd < 0) break;
    const snippet = html.slice(i, tagEnd + 1);
    const selfClosing =
      /\/\s*>$/.test(snippet) ||
      /^<(img|br|hr|input|meta|link|source|area|base|col|embed|wbr)\b/i.test(snippet);
    const tagName = (snippet.match(/^<\/?\s*([a-zA-Z0-9:-]+)/) || [])[1]?.toLowerCase();
    if (snippet.startsWith("</")) {
      if (tagName === name.toLowerCase()) depth--;
      i = tagEnd + 1;
      if (depth === 0) return html.slice(start, i);
      continue;
    }
    if (!selfClosing && tagName === name.toLowerCase()) depth++;
    i = tagEnd + 1;
  }
  const close = `</${name}>`;
  const cidx = html.toLowerCase().indexOf(close.toLowerCase(), start);
  if (cidx > start) return html.slice(start, cidx + close.length);
  return "";
}

function extractDesignCss(html) {
  const chunks = [];
  for (const m of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const attrs = m[1];
    const css = m[2];
    const id = (attrs.match(/\bid=["']([^"']+)/) || [])[1] || "";
    if (id === "us-design-options-css" || id === "wp-custom-css") {
      chunks.push(`/* ${id} */\n${css}`);
      continue;
    }
    // Untitled style blocks that contain page us_custom rules
    if (!id && /us_custom_[a-f0-9]+/.test(css) && css.length > 400) {
      chunks.push(`/* page-us-custom */\n${css}`);
    }
  }
  return chunks.join("\n\n");
}

function extractSeo(html, fallbackPath) {
  const title = html.match(/<title[^>]*>([^<]+)/i)?.[1]?.replace(/&amp;/g, "&").replace(/&#8211;/g, "–").trim();
  const description =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1] ||
    "";
  const canonical =
    html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1] || fallbackPath;
  const ogImage =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1] || "";
  const schemas = [...html.matchAll(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    title: title || "",
    description,
    canonical: stripDomain(canonical),
    ogImage: stripDomain(ogImage),
    schemas,
  };
}

async function download(url) {
  let u = url.startsWith("http") ? url.split("?")[0] : ORIGIN + url.split("?")[0];
  if (u.startsWith("//")) u = `https:${u}`;
  if (!u.includes("mbs-consultancy.com")) return null;
  let pathname;
  try {
    pathname = new URL(u).pathname;
  } catch {
    return null;
  }
  const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return pathname;
  try {
    const res = await fetch(u, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return pathname;
  } catch {
    return null;
  }
}

async function fetchPage(pathname) {
  const url = `${ORIGIN}${pathname === "/" ? "/" : pathname}?nowprocket=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function mapPool(items, limitN, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limitN, items.length) }, () => worker()));
  return results;
}

async function refreshItem(item, kind) {
  if (pathFilter && !pathFilter.has(item.path)) return null;
  console.log(`refresh ${kind}`, item.path);
  try {
    const html = await fetchPage(item.path);
    let body =
      extractById(html, "page-content") ||
      extractById(html, "content") ||
      "";

    // Single posts sometimes use article.l-section / .w-blog-post-body
    if (!body || body.length < 400) {
      body =
        extractById(html, "page-content") ||
        (() => {
          const idx = html.indexOf("w-blog-post-body");
          if (idx < 0) return "";
          const start = html.lastIndexOf("<", idx);
          const end = html.indexOf("</div>", idx);
          return end > start ? html.slice(start, end + 6) : "";
        })();
    }

    if (body && body.length > 200) {
      item.bodyHtml = stripDomain(body);
    } else if (!item.bodyHtml && item.content) {
      item.bodyHtml = item.content;
    }

    const designCss = extractDesignCss(html);
    const cssRel = `/css/page-design${item.path === "/" ? "/home" : item.path.replace(/\/$/, "")}.css`;
    if (designCss.length > 100) {
      const dest = path.join(PUBLIC, cssRel.replace(/^\//, ""));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, designCss);
      item.pageCss = [`/css/impreza-global.css`, cssRel];
    } else {
      item.pageCss = [`/css/impreza-global.css`];
    }
    delete item.elementorCss;

    const seo = extractSeo(html, item.path);
    item.seo = { ...item.seo, ...seo, canonical: item.path };

    // assets in body
    for (const m of (item.bodyHtml || "").matchAll(/(?:src|href|data-src)=["']([^"']+)["']/gi)) {
      let u = m[1];
      if (!u || u.startsWith("data:") || u.startsWith("#")) continue;
      if (u.startsWith("//")) u = `https:${u}`;
      else if (u.startsWith("/")) u = ORIGIN + u;
      if (!u.includes("mbs-consultancy.com")) continue;
      if (!/\.(png|jpe?g|webp|svg|gif|ico|css|woff2?|js)(\?|$)/i.test(u)) continue;
      await download(u);
    }

    if (item.path === "/") {
      const header = extractById(html, "page-header");
      const footer = extractById(html, "page-footer");
      if (header.length > 1000) fs.writeFileSync(path.join(DATA, "header.html"), stripDomain(header));
      if (footer.length > 1000) fs.writeFileSync(path.join(DATA, "footer.html"), stripDomain(footer));
    }
    return true;
  } catch (e) {
    console.warn("fail", item.path, e.message);
    return false;
  }
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));

let pageItems = only === "all" || only === "pages" ? pages : [];
let postItems = only === "all" || only === "posts" ? posts : [];
if (pathFilter) {
  pageItems = pageItems.filter((p) => pathFilter.has(p.path));
  postItems = postItems.filter((p) => pathFilter.has(p.path));
}
if (limit > 0) {
  pageItems = pageItems.slice(0, limit);
  if (only === "all") postItems = postItems.slice(0, Math.max(0, limit - pageItems.length));
  else if (only === "posts") postItems = postItems.slice(0, limit);
}

await mapPool(pageItems, concurrency, (item) => refreshItem(item, "page"));
await mapPool(postItems, concurrency, (item) => refreshItem(item, "post"));

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(posts, null, 2));
console.log(`Done. pages=${pageItems.length} posts=${postItems.length}`);
