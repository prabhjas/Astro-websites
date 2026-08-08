import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EOR-Compare/1.0" } });
  return { status: res.status, html: await res.text() };
}

const local = await get("http://127.0.0.1:5084/insights/");
const live = await get("https://ngmanpower.com/insights/?nowprocket=1");

function cssLinks(html) {
  return [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) =>
    m[1].replace(/https?:\/\/[^/]+/i, "").split("?")[0],
  );
}

function sectionBits(html) {
  const explore = /\/\/\s*EXPLORE|EXPLORE/i.test(html);
  const topic = /Articles By Topic/i.test(html);
  const filterBtn = (html.match(/filter-button/g) || []).length;
  const postGrid = (html.match(/post-grid/g) || []).length;
  const loopWrap = /loop-wrap/.test(html);
  const shortcode = /elementor-widget-shortcode|elementor-element-0feae1d/i.test(html);
  const idx = html.search(/Articles By Topic/i);
  const snip = idx >= 0 ? html.slice(idx - 200, idx + 1200).replace(/\s+/g, " ") : "";
  const cardIdx = html.search(/post-grid/i);
  const cardSnip = cardIdx >= 0 ? html.slice(cardIdx - 50, cardIdx + 900).replace(/\s+/g, " ") : "";
  return { explore, topic, filterBtn, postGrid, loopWrap, shortcode, snip: snip.slice(0, 500), cardSnip: cardSnip.slice(0, 600) };
}

const localCss = cssLinks(local.html);
const liveCss = cssLinks(live.html);
const liveOnly = liveCss.filter((c) => !localCss.includes(c) && !/fonts\.googleapis|google-fonts/i.test(c));
const localOnly = localCss.filter((c) => !liveCss.includes(c));

// Check missing local files for live CSS
const missing = [];
for (const rel of liveCss) {
  if (!rel.startsWith("/")) continue;
  const file = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(file) || fs.statSync(file).size < 20) missing.push(rel);
}

const out = {
  localStatus: local.status,
  liveStatus: live.status,
  localLen: local.html.length,
  liveLen: live.html.length,
  local: sectionBits(local.html),
  live: sectionBits(live.html),
  liveOnlyCss: liveOnly.slice(0, 40),
  localOnlyCss: localOnly.slice(0, 20),
  missingCssFiles: missing.slice(0, 30),
  localHasPost21414: localCss.some((c) => /post-21414/.test(c)),
  liveHasPost21414: liveCss.some((c) => /post-21414/.test(c)),
};

fs.writeFileSync(path.join(ROOT, "scripts/tmp-insights-compare.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
