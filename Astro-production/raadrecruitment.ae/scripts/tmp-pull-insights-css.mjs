import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveHtml = await (
  await fetch("/insights/?nowprocket=1", {
    headers: { "User-Agent": "EOR/1.0" },
  })
).text();

const styles = [...liveHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m, i) => ({
  i,
  len: m[1].length,
  index: m.index,
  hasPostGrid: /\.post-grid/.test(m[1]),
  hasFilter: /\.filter-button|\.btn\.filter/.test(m[1]),
  hasLoop: /\.loop-wrap/.test(m[1]),
  hasTopInfo: /\.top-info|\.author|\.date/.test(m[1]),
  hasSectionTitle: /\.section-title|\.bar-main/.test(m[1]),
  head: m[1].replace(/\s+/g, " ").slice(0, 120),
}));

console.log(JSON.stringify(styles, null, 2));

const needed = styles.filter((s) => s.hasPostGrid || s.hasFilter || s.hasLoop || s.hasTopInfo);
const full = [...liveHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .filter((m) => /\.post-grid|\.filter-button|\.loop-wrap|\.top-info/.test(m[1]))
  .map((m) => m[1]);

const css = `/* Extracted from live ngmanpower.com/insights/ for Articles by Topic cards */\n${full.join("\n\n")}\n`;
fs.writeFileSync(path.join(ROOT, "public/css/insights-topic-cards.css"), css);
console.log("wrote", css.length, "needed", needed.length);

// Also dump filter-button related rules from whole HTML (could be in post-21414.css)
const postCssPath = path.join(ROOT, "public/wp-content/uploads/elementor/css/post-21414.css");
const postCss = fs.existsSync(postCssPath) ? fs.readFileSync(postCssPath, "utf8") : "";
console.log({
  post21414Len: postCss.length,
  postHasFilter: /filter-button|0feae1d|post-grid|loop-wrap/.test(postCss),
  postSnip: postCss.match(/.{0,40}filter.{0,80}/i)?.[0] || null,
});
