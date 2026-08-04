/**
 * Fix Rank Math breadcrumbs across pages + refresh truncated service bodies from live.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const UA = "Mozilla/5.0";

function stripDomain(html) {
  return String(html || "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "")
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "");
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function breadcrumbInner(title) {
  const safe = stripHtml(title)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p><a href="/">Home</a><span class="separator"> » </span><span class="last">${safe}</span></p>`;
}

function fixBreadcrumbsInHtml(html, title) {
  if (!html) return html;
  if (/rank-math-breadcrumb/.test(html)) {
    return html.replace(
      /(<nav\b[^>]*\brank-math-breadcrumb\b[^>]*>)([\s\S]*?)(<\/nav>)/gi,
      `$1${breadcrumbInner(title)}$3`,
    );
  }
  return html;
}

function injectBreadcrumb(html, title) {
  if (/rank-math-breadcrumb/.test(html)) return fixBreadcrumbsInHtml(html, title);
  const block = `<div class="elementor-element elementor-widget elementor-widget-breadcrumbs" data-widget_type="breadcrumbs.default"><div class="elementor-widget-container"><nav class="rank-math-breadcrumb" aria-label="Breadcrumb">${breadcrumbInner(title)}</nav></div></div>`;
  if (/<div class="elementor-widget-wrap elementor-element-populated">/i.test(html)) {
    return html.replace(
      /(<div class="elementor-widget-wrap elementor-element-populated">)/i,
      `$1\n\t\t\t\t\t\t${block}`,
    );
  }
  return html;
}

function extractBody(html) {
  const $ = cheerio.load(html);
  const el = $('[data-elementor-type="wp-page"]').first();
  return el.length ? $.html(el) : "";
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));

const refreshPaths = [
  "/employment-visa/",
  "/eor-services-germany/",
  "/eor-services-portugal/",
  "/employer-of-record/",
  "/employee-relocation/",
  "/hire-a-contractor-in-spain/",
  "/payroll-outsourcing/",
  "/professional-employer-organization/",
  "/hr-services-spain/",
  "/about-us/",
  "/contact-us/",
];

let refreshed = 0;
for (const pth of refreshPaths) {
  try {
    const res = await fetch(`${ORIGIN}${pth}?nowprocket=1`, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.warn("skip refresh", pth, res.status);
      continue;
    }
    const text = await res.text();
    let body = stripDomain(extractBody(text));
    if (body.length < 2000) {
      console.warn("thin", pth, body.length);
      continue;
    }
    const idx = pages.findIndex((p) => p.path === pth);
    const title =
      (idx >= 0 ? stripHtml(pages[idx].title) : "") ||
      stripHtml((text.match(/<title>([^<]+)/i) || [])[1] || "").replace(/\s*[|\-].*$/, "");
    body = injectBreadcrumb(body, title || pth);
    if (idx >= 0) {
      pages[idx].bodyHtml = body;
      pages[idx].content = body;
    }
    bodies[pth] = body;
    refreshed += 1;
    console.log("refreshed", pth, {
      len: body.length,
      bc: /Home<\/a>/.test(body),
      cf7: /wpcf7-form/.test(body),
    });
  } catch (e) {
    console.warn("fail", pth, e.message);
  }
}

let bcFixed = 0;
for (const page of pages) {
  if (page.path === "/") continue;
  let html = page.bodyHtml || bodies[page.path] || "";
  if (!html) continue;
  const title = stripHtml(page.title) || page.slug;
  const next = injectBreadcrumb(html, title);
  if (next !== html) {
    page.bodyHtml = next;
    page.content = next;
    bodies[page.path] = next;
    bcFixed += 1;
  }
}

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log({ refreshed, bcFixed });
