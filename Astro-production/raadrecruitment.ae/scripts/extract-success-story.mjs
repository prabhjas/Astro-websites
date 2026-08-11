#!/usr/bin/env node
import { load } from "cheerio";
import fs from "node:fs";

const ORIGIN = "https://raadrecruitment.ae";
const pages = ["/emiratisation/", "/staff-outsourcing-in-uae/", "/recruitment/"];

function extractSuccessBlock(html) {
  const $ = load(html);
  // Find heading then climb to containing top section
  let heading = null;
  $("h1,h2,h3,h4,.elementor-heading-title").each((_, el) => {
    if (/Success/i.test($(el).text()) && /Story/i.test($(el).text())) {
      heading = $(el);
      return false;
    }
  });
  if (!heading) return null;
  const section = heading.closest("section.elementor-top-section, section.elementor-section").first();
  const root = section.length ? section : heading.parent();
  // include next sibling sections that hold the slider if heading is alone
  let htmlOut = $.html(root);
  let next = root.next();
  // pull following related sections while they contain n2-ss or testimonials
  let guard = 0;
  while (next.length && guard < 3) {
    const nh = $.html(next) || "";
    if (/n2-ss-|testimonial|Success/i.test(nh)) {
      htmlOut += nh;
      next = next.next();
      guard++;
    } else break;
  }
  const ids = [...htmlOut.matchAll(/n2-ss-(\d+)/g)].map((m) => m[1]);
  return { html: htmlOut, sliderIds: [...new Set(ids)], len: htmlOut.length };
}

function extractSsInits(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const inits = [];
  for (const m of scripts) {
    const body = (m[2] || "").trim();
    if (!body.includes("SmartSliderSimple")) continue;
    inits.push(body);
  }
  return inits;
}

const allInits = new Map();
const blocks = {};

for (const p of pages) {
  const html = await (await fetch(ORIGIN + p + "?nowprocket=1", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })).text();
  const block = extractSuccessBlock(html);
  blocks[p] = block;
  console.log(p, block && { len: block.len, sliderIds: block.sliderIds });
  for (const init of extractSsInits(html)) {
    const ids = [...init.matchAll(/SmartSliderSimple\('([^']+)'/g)].map((m) => m[1]);
    for (const id of ids) {
      if (!allInits.has(id)) allInits.set(id, init);
    }
    // also store full combined init script chunks
  }
}

// Better: extract unique full init script bodies that mention n2-ss-
const anyPage = await (await fetch(ORIGIN + "/emiratisation/?nowprocket=1")).text();
const inits = extractSsInits(anyPage);
fs.mkdirSync("src/data/smart-slider", { recursive: true });
fs.mkdirSync("source/success-story", { recursive: true });

for (const [p, block] of Object.entries(blocks)) {
  if (!block) continue;
  const slug = p.replace(/\//g, "").replace(/-/g, "_") || "home";
  let html = block.html
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
  fs.writeFileSync(`source/success-story/${slug}.html`, html);
  console.log("wrote", slug, html.length);
}

// Collect all SmartSliderSimple inits from all three pages
const initById = new Map();
for (const p of pages) {
  const html = await (await fetch(ORIGIN + p + "?nowprocket=1")).text();
  for (const body of extractSsInits(html)) {
    for (const m of body.matchAll(/new _N2\.SmartSliderSimple\('([^']+)'/g)) {
      initById.set(m[1], body);
    }
  }
}
console.log("slider inits", [...initById.keys()]);

// Merge: bootstrap already exists; write init-all that covers all known sliders
const homeInit = fs.readFileSync("src/data/smart-slider/init-home.js", "utf8");
const existingIds = [...homeInit.matchAll(/SmartSliderSimple\('([^']+)'/g)].map((m) => m[1]);
console.log("home init ids", existingIds);

let extra = "";
for (const [id, body] of initById) {
  if (existingIds.includes(id)) continue;
  // Extract just the SmartSliderSimple call registration for this id if body has multiple
  // Prefer full documentReady block if it's dedicated
  if (!homeInit.includes(`SmartSliderSimple('${id}'`)) {
    // Use whole body if not already present (may duplicate documentReady - ok if _N2 queues)
    const localized = body
      .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
      .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
    extra += "\n;" + localized + "\n";
    console.log("adding init for", id, localized.length);
  }
}

if (extra) {
  const next = homeInit.trim() + "\n" + extra;
  fs.writeFileSync("src/data/smart-slider/init-home.js", next + "\n");
  fs.copyFileSync("src/data/smart-slider/init-home.js", "public/scripts/smart-slider/init-home.js");
  console.log("updated init-home.js");
}

fs.writeFileSync(
  "source/success-story/manifest.json",
  JSON.stringify({ pages: Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,v&&{sliderIds:v.sliderIds,len:v.len}])), inits: [...initById.keys()] }, null, 2),
);
