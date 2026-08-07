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

function findPostGridStyleBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (/\.post-grid/.test(m[1]) || /\.filter-button/.test(m[1]) || /\.loop-wrap/.test(m[1])) {
      blocks.push({ len: m[1].length, head: m[1].slice(0, 200), index: m.index });
    }
  }
  return blocks;
}

const localBlocks = findPostGridStyleBlocks(localBody);
const liveBlocks = findPostGridStyleBlocks(liveHtml);
const rendered = await (await fetch("http://127.0.0.1:5084/insights/")).text();
const renderedBlocks = findPostGridStyleBlocks(rendered);

const liveFull = liveBlocks.map((b) => {
  const m = liveHtml.slice(b.index).match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : "";
});

console.log(
  JSON.stringify(
    {
      localBlocks,
      liveBlocks,
      renderedBlocks,
      liveFullLens: liveFull.map((s) => s.length),
      liveFullHasFilter: liveFull.some((s) => /\.filter-button/.test(s)),
    },
    null,
    2,
  ),
);

if (liveFull[0]) {
  fs.writeFileSync(path.join(ROOT, "public/css/insights-topic-cards.css"), liveFull.join("\n\n"));
  console.log("wrote insights-topic-cards.css", liveFull.reduce((a, b) => a + b.length, 0));
}

// Check if local body lost a style block that live has
const localAllStyles = [...localBody.matchAll(/<style/gi)].length;
const liveAllStyles = [...liveHtml.matchAll(/<style/gi)].length;
console.log({ localAllStyles, liveAllStyles, renderedAllStyles: [...rendered.matchAll(/<style/gi)].length });

// Show what surrounds post-grid css on live
const i = liveHtml.search(/\.post-grid\s*\{/);
console.log("surround start tag?", liveHtml.slice(i - 300, i).includes("<style"));
console.log(liveHtml.slice(i - 120, i + 80));
