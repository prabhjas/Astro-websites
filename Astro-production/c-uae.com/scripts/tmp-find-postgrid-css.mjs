import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/pages.json"), "utf8"));
const localBody = pages.find((p) => p.path === "/insights/")?.bodyHtml || "";
const liveHtml = await (
  await fetch("https://eormiddleast.com/insights/?nowprocket=1", {
    headers: { "User-Agent": "EOR/1.0" },
  })
).text();

function allStylesNearShortcode(html) {
  const idx = html.indexOf("elementor-element-0feae1d");
  const chunk = html.slice(idx, idx + 20000);
  const styles = [...chunk.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  return styles;
}

const localStyles = allStylesNearShortcode(localBody);
const liveStyles = allStylesNearShortcode(liveHtml);

console.log(
  JSON.stringify(
    {
      localStyleBlocks: localStyles.length,
      liveStyleBlocks: liveStyles.length,
      localLens: localStyles.map((s) => s.length),
      liveLens: liveStyles.map((s) => s.length),
      localHasPostGridCss: localStyles.some((s) => /\.post-grid/.test(s)),
      liveHasPostGridCss: liveStyles.some((s) => /\.post-grid/.test(s)),
      livePostGridCss: liveStyles.find((s) => /\.post-grid/.test(s))?.slice(0, 1500) || "NONE",
      localPostGridCss: localStyles.find((s) => /\.post-grid/.test(s))?.slice(0, 1500) || "NONE",
    },
    null,
    2,
  ),
);

// Also check rendered local page for post-grid CSS presence
const rendered = await (await fetch("http://127.0.0.1:5084/insights/")).text();
const renderedStyles = allStylesNearShortcode(rendered);
console.log(
  "rendered",
  JSON.stringify({
    blocks: renderedStyles.length,
    hasPostGrid: renderedStyles.some((s) => /\.post-grid/.test(s)),
    hasFilterBtnStyle: renderedStyles.some((s) => /\.filter-button/.test(s)),
    hasNunitoPostGrid: /\.post-grid h3\{\s*color: #18191F; font-family: Nunito/i.test(rendered),
  }),
);

// Find where post-grid CSS lives on live (outside shortcode?)
const livePgIdx = liveHtml.search(/\.post-grid\s*h3\s*\{/);
console.log("live post-grid css context", liveHtml.slice(Math.max(0, livePgIdx - 80), livePgIdx + 200));
