#!/usr/bin/env node
/**
 * Compare live vs local homepage CSS / Elementor assets.
 */
import fs from "node:fs";
import path from "node:path";

const LIVE = "https://raadrecruitment.ae";
const LOCAL = process.env.BASE || "http://127.0.0.1:5113";
const PUBLIC = "public";

function norm(href, origin) {
  return String(href || "")
    .replace(origin, "")
    .replace(/^https?:\/\/(?:www\.)?raadrecruitment\.ae/, "")
    .split("?")[0];
}

function extractCss(html, origin) {
  const hrefs = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel=["']stylesheet["']/i.test(tag)) continue;
    const href = (tag.match(/href=["']([^"']+)/i) || [])[1];
    if (href) hrefs.push(norm(href, origin));
  }
  const bodyClass =
    (html.match(/<body[^>]*class=["']([^"']+)/i) || [])[1]?.slice(0, 240) || "";
  const inlineCount = (html.match(/<style\b/gi) || []).length;
  return { hrefs, bodyClass, inlineCount, htmlLen: html.length };
}

async function probe(origin, rel) {
  try {
    const r = await fetch(origin + rel, { redirect: "follow" });
    const ct = r.headers.get("content-type") || "";
    const buf = Buffer.from(await r.arrayBuffer());
    const head = buf.slice(0, 80).toString("utf8");
    return {
      status: r.status,
      ct,
      bytes: buf.length,
      looksHtml: /text\/html/i.test(ct) || head.startsWith("<!DOCTYPE") || head.startsWith("<html"),
      looksCss: /text\/css/i.test(ct) || /\{[^}]+\}/.test(head),
    };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

const liveHtml = await (await fetch(LIVE + "/")).text();
const localHtml = await (await fetch(LOCAL + "/")).text();
const live = extractCss(liveHtml, LIVE);
const local = extractCss(localHtml, LOCAL);

const missingOnLocal = live.hrefs.filter((h) => !local.hrefs.includes(h));
const extraOnLocal = local.hrefs.filter((h) => !live.hrefs.includes(h));

const elementorLive = live.hrefs.filter((h) => /elementor/i.test(h));
const elementorLocal = local.hrefs.filter((h) => /elementor/i.test(h));

const critical = [
  ...new Set([
    ...elementorLive,
    ...elementorLocal,
    "/wp-content/themes/astra/assets/css/minified/main.min.css",
    "/wp-content/plugins/elementor/assets/css/frontend.css",
    "/wp-content/uploads/elementor/css/post-30.css",
    "/wp-content/uploads/elementor/css/post-1298.css",
    "/wp-content/uploads/elementor/css/post-861.css",
    "/css/raadrecruitment-astra-fixes.css",
    "/css/fonts-poppins.css",
  ]),
];

const probes = {};
for (const rel of critical) {
  const disk = path.join(PUBLIC, ...rel.replace(/^\//, "").split("/"));
  probes[rel] = {
    disk: fs.existsSync(disk) ? fs.statSync(disk).size : null,
    live: await probe(LIVE, rel),
    local: await probe(LOCAL, rel),
  };
}

// list remote elementor/css via probing known post IDs from pages.json
let pageCss = [];
try {
  const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
  pageCss = [
    ...new Set(
      pages.flatMap((p) => [...(p.pageCss || []), ...(p.extraCss || [])]).filter(Boolean),
    ),
  ];
} catch {}

const report = {
  liveCount: live.hrefs.length,
  localCount: local.hrefs.length,
  liveBody: live.bodyClass,
  localBody: local.bodyClass,
  liveInline: live.inlineCount,
  localInline: local.inlineCount,
  missingOnLocal,
  extraOnLocal,
  elementorLive,
  elementorLocal,
  pageCssFromData: pageCss,
  probes,
};

fs.writeFileSync("scripts/_css-compare.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
