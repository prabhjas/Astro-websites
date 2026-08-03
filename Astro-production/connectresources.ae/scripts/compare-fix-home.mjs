#!/usr/bin/env node
/**
 * Compare live vs local and produce a fix plan + asset download list.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://connectresources.ae";
const LOCAL = "http://127.0.0.1:5084";
const UA = "CR-Compare/1.0";
const OUT = path.join(ROOT, "_crawl", "compare");
fs.mkdirSync(OUT, { recursive: true });

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function styleTags(html) {
  return [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)].map((m) => ({
    attrs: m[1],
    css: m[2],
    id: (m[1].match(/\bid=["']([^"']+)/) || [])[1] || "",
  }));
}

function cssHrefs(html) {
  return [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1].split("?")[0]);
}

function toPath(u) {
  try {
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("/")) return u;
    return new URL(u).pathname;
  } catch {
    return u;
  }
}

/** Map WP Rocket cache path → canonical public path when possible */
function uncachePath(p) {
  // /wp-content/cache/min/1/wp-content/... → /wp-content/...
  let m = p.match(/\/wp-content\/cache\/min\/\d+(\/wp-content\/.+)$/);
  if (m) return m[1];
  // /wp-content/cache/background-css/1/connectresources.ae/wp-content/... → /wp-content/...
  m = p.match(/\/wp-content\/cache\/background-css\/\d+\/[^/]+(\/wp-content\/.+)$/);
  if (m) return m[1];
  m = p.match(/\/wp-content\/cache\/background-css\/\d+\/[^/]+(\/wp-content\/cache\/min\/\d+(\/wp-content\/.+))$/);
  if (m) return m[2];
  return p;
}

function extractById(html, id) {
  const marker = `id="${id}"`;
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  // Prefer matching close tag name from opening tag
  const openEnd = html.indexOf(">", start);
  const openTag = html.slice(start, openEnd + 1);
  const name = (openTag.match(/^<\/?\s*([a-zA-Z0-9:-]+)/) || [])[1];
  if (!name) return "";
  const close = `</${name}>`;
  // depth walk
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
  // fallback: first close
  const cidx = html.toLowerCase().indexOf(close.toLowerCase(), start);
  if (cidx > start) return html.slice(start, cidx + close.length);
  return "";
}

function stripDomain(html) {
  return html
    .replaceAll("https://www.connectresources.ae", "")
    .replaceAll("http://www.connectresources.ae", "")
    .replaceAll("https://connectresources.ae", "")
    .replaceAll("http://connectresources.ae", "")
    .replaceAll("//www.connectresources.ae", "")
    .replaceAll("//connectresources.ae", "");
}

async function download(urlPath) {
  const clean = urlPath.startsWith("http") ? urlPath.split("?")[0] : ORIGIN + urlPath.split("?")[0];
  let pathname;
  try {
    pathname = new URL(clean).pathname;
  } catch {
    return null;
  }
  if (!pathname.includes("wp-content") && !pathname.includes("wp-includes")) return null;
  const dest = path.join(ROOT, "public", pathname.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) return pathname;
  try {
    const res = await fetch(clean, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.warn("skip", res.status, pathname);
      return null;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log("got", pathname);
    return pathname;
  } catch (e) {
    console.warn("fail", pathname, e.message);
    return null;
  }
}

const live = await fetchText(`${ORIGIN}/?nowprocket=1`);
const local = await fetchText(`${LOCAL}/`);
fs.writeFileSync(path.join(OUT, "live-home.html"), live);
fs.writeFileSync(path.join(OUT, "local-home.html"), local);

const liveStyles = styleTags(live);
const localStyles = styleTags(local);
console.log("LIVE style tags", liveStyles.length, "bytes", liveStyles.reduce((a, s) => a + s.css.length, 0));
console.log("LOCAL style tags", localStyles.length, "bytes", localStyles.reduce((a, s) => a + s.css.length, 0));
for (const s of liveStyles) {
  console.log("  live style id=", JSON.stringify(s.id), "len=", s.css.length, "us_custom=", s.css.includes("us_custom"));
}

// Persist live inline styles for injection
const criticalCss = liveStyles.map((s) => s.css).join("\n\n");
fs.writeFileSync(path.join(ROOT, "public/css/impreza-inline-home.css"), criticalCss);
fs.writeFileSync(path.join(ROOT, "src/data/impreza-inline-home.css"), criticalCss);
console.log("wrote impreza-inline-home.css", criticalCss.length);

// Canonical CSS order from live (uncached)
const liveCss = cssHrefs(live).map(toPath).map(uncachePath);
const uniqueCss = [...new Set(liveCss)];
console.log("canonical css order", uniqueCss.length);
for (const p of uniqueCss) {
  await download(p);
}
fs.writeFileSync(
  path.join(ROOT, "src/data/live-css-order.json"),
  JSON.stringify(["/css/impreza-inline-home.css", ...uniqueCss], null, 2) + "\n",
);

// Refresh header/footer/main from live
const header = extractById(live, "page-header");
const footer = extractById(live, "page-footer");
const main = extractById(live, "page-content");
console.log({ header: header.length, footer: footer.length, main: main.length });
if (header.length > 1000) fs.writeFileSync(path.join(ROOT, "src/data/header.html"), stripDomain(header));
if (footer.length > 1000) fs.writeFileSync(path.join(ROOT, "src/data/footer.html"), stripDomain(footer));

const pagesPath = path.join(ROOT, "src/data/pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
const home = pages.find((p) => p.path === "/");
if (home && main.length > 1000) {
  home.bodyHtml = stripDomain(main);
  // SEO from live
  const title = live.match(/<title[^>]*>([^<]+)/i)?.[1]?.replace(/&amp;/g, "&").trim();
  const desc =
    live.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ||
    live.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1] ||
    "";
  const og =
    live.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1] || "";
  home.seo = {
    ...home.seo,
    title: title || home.seo?.title,
    description: desc || home.seo?.description,
    canonical: "/",
    ogImage: og ? toPath(og) : home.seo?.ogImage,
  };
  home.pageCss = ["/css/impreza-inline-home.css", ...uniqueCss];
  home.elementorCss = undefined;
  fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
  console.log("home updated seo title:", home.seo.title);
}

// Download images referenced in chrome + main
const blob = header + footer + main;
const urls = new Set();
for (const m of blob.matchAll(/(?:src|href|data-src|data-lazy-src)=["']([^"']+)["']/gi)) urls.add(m[1]);
for (const m of blob.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) urls.add(m[2]);
let imgN = 0;
for (let u of urls) {
  if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("mailto:") || u.startsWith("tel:")) continue;
  if (u.startsWith("//")) u = "https:" + u;
  else if (u.startsWith("/")) u = ORIGIN + u;
  if (!u.includes("connectresources.ae")) continue;
  const clean = u.split("?")[0];
  if (!/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|css|js)(\?|$)/i.test(clean)) continue;
  const got = await download(clean);
  if (got) imgN++;
}
console.log("assets fetched/confirmed", imgN);

// Spot-check a few key pages for shortcodes in local JSON
const samplePaths = [
  "/",
  "/employer-of-record/united-arab-emirates/",
  "/contact-us/",
  "/payroll/",
  "/staff-outsourcing/",
  "/guides/invest-in-dubai/",
];
for (const pth of samplePaths) {
  const entry =
    pages.find((p) => p.path === pth) ||
    JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/posts.json"), "utf8")).find((p) => p.path === pth);
  if (!entry) {
    console.log("missing entry", pth);
    continue;
  }
  const html = entry.bodyHtml || entry.content || "";
  const shorts = (html.match(/\[[a-z0-9_-]+[^\]]*\]/gi) || []).slice(0, 5);
  console.log(pth, "body", html.length, "shortcodes", shorts.length, shorts[0] || "");
}

console.log("done");
