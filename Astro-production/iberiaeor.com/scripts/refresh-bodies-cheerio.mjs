/**
 * Re-extract Elementor bodies for paths missing rich bodyHtml.
 * Uses cheerio for reliable single-post / wp-page / cpt containers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const UA = "EOR-Astro-Migration/1.0";
const CONCURRENCY = Number(process.env.EOR_BODY_CONCURRENCY || 6);
const MIN_BODY = 800;

function stripDomain(html) {
  return html
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "")
    .replaceAll("//iberiaeor.com", "")
    .replaceAll("//www.iberiaeor.com", "");
}

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
}

function extractBody(html) {
  const $ = cheerio.load(html);
  const candidates = [
    $('[data-elementor-type="wp-page"]').first(),
    $('[data-elementor-type="single-post"]').first(),
    $('[data-elementor-type="wp-post"]').first(),
    $('[data-elementor-type="cpt"]').first(),
    $('[data-elementor-type="single"]').first(),
    $(".elementor-location-single").first(),
  ];
  for (const el of candidates) {
    if (el.length) {
      const out = $.html(el);
      if (out && out.length >= MIN_BODY) return out;
    }
  }
  return "";
}

async function mapPool(items, worker, concurrency) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));

const byPath = new Map();
for (const p of pages) byPath.set(normalizePath(p.path), { kind: "page", entry: p });
for (const p of posts) byPath.set(normalizePath(p.path), { kind: "post", entry: p });

const need = [...byPath.entries()].filter(([, { entry }]) => {
  const b = entry.bodyHtml || bodies[normalizePath(entry.path)] || "";
  return b.length < MIN_BODY;
});

console.log(`Re-extracting bodies for ${need.length} thin entries…`);

let done = 0;
let filled = 0;
await mapPool(
  need,
  async ([pth, { entry }]) => {
    try {
      const url = `${ORIGIN}${pth === "/" ? "/" : pth}?nowprocket=1`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      const body = extractBody(html);
      if (body.length >= MIN_BODY) {
        const cleaned = stripDomain(body);
        entry.bodyHtml = cleaned;
        bodies[pth] = cleaned;
        filled += 1;
      }
    } catch (e) {
      console.warn("fail", pth, e.message);
    }
    done += 1;
    if (done % 25 === 0 || done === need.length) {
      console.log(`  ${done}/${need.length} filled=${filled}`);
    }
  },
  CONCURRENCY,
);

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(posts, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log("Done", { filled, bodies: Object.keys(bodies).length });
