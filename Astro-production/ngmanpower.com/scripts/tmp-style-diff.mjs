import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pages.json"), "utf8"));
const localBody = pages.find((p) => p.path === "/insights/")?.bodyHtml || "";

const liveHtml = await (
  await fetch("https://ngmanpower.com/insights/?nowprocket=1", {
    headers: { "User-Agent": "EOR/1.0" },
  })
).text();

function extractShortcodeStyles(html) {
  const m = html.match(
    /elementor-element-0feae1d[\s\S]*?<div class="elementor-shortcode">\s*<style>([\s\S]*?)<\/style>/i,
  );
  return m ? m[1] : "";
}

function extractFirstCard(html) {
  const m = html.match(/<div class="post-grid[\s\S]*?(?=<div class="post-grid|$)/i);
  return m ? m[0].slice(0, 1500) : "";
}

const localStyle = extractShortcodeStyles(localBody);
const liveStyle = extractShortcodeStyles(liveHtml);

fs.writeFileSync(path.join(ROOT, "scripts/tmp-local-filter-style.css"), localStyle);
fs.writeFileSync(path.join(ROOT, "scripts/tmp-live-filter-style.css"), liveStyle);

console.log(
  JSON.stringify(
    {
      localStyleLen: localStyle.length,
      liveStyleLen: liveStyle.length,
      localHasPostGrid: /\.post-grid\s*\{/.test(localStyle),
      liveHasPostGrid: /\.post-grid\s*\{/.test(liveStyle),
      localHasFilterBtn: /\.filter-button/.test(localStyle),
      liveHasFilterBtn: /\.filter-button/.test(liveStyle),
      localStyleHead: localStyle.slice(0, 400),
      liveStyleHead: liveStyle.slice(0, 400),
      localCard: extractFirstCard(localBody).replace(/\s+/g, " ").slice(0, 500),
      liveCard: extractFirstCard(liveHtml).replace(/\s+/g, " ").slice(0, 500),
      // check if our overrides might conflict
      overrides: fs.readFileSync(path.join(ROOT, "public/css/migration-overrides.css"), "utf8").match(/\.btn\.filter-button[\s\S]{0,250}/)?.[0],
    },
    null,
    2,
  ),
);
