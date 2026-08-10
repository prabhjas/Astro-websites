import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const paths = [
  ["/manufacturing/", "manufacturing"],
  ["/construction/", "construction"],
  ["/oil-and-gas/", "oil-and-gas"],
  ["/logistics/", "logistics"],
  ["/electromechanical/", "electromechanical"],
  ["/factories/", "factories"],
  ["/food-industry/", "food-industry"],
  ["/landscaping/", "landscaping"],
  ["/warehouse/", "warehouse"],
];

async function extractDesignCss(urlPath, slug) {
  const live = await (
    await fetch(`https://ngmanpower.com${urlPath}?nowprocket=1`, {
      headers: { "User-Agent": "NG/1.0" },
    })
  ).text();

  // Prefer id=us-design-options-css
  let css = null;
  const byId = live.match(
    /<style[^>]*id=["']us-design-options-css["'][^>]*>([\s\S]*?)<\/style>/i
  );
  if (byId) css = byId[1].trim();

  if (!css) {
    // Fallback: largest style with us_custom_
    const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[1])
      .filter((s) => s.includes("us_custom_"));
    styles.sort((a, b) => b.length - a.length);
    css = styles[0] || "";
  }

  const localPath = join(ROOT, `public/css/page-design/${slug}.css`);
  const local = readFileSync(localPath, "utf8");

  const mediaCount = (css.match(/@media/g) || []).length;
  const localMedia = (local.match(/@media/g) || []).length;
  console.log(slug, {
    liveLen: css.length,
    localLen: local.length,
    liveMedia: mediaCount,
    localMedia,
    liveHasNeg24: css.includes("margin-top:-24rem"),
    localHasNeg24: local.includes("margin-top:-24rem"),
    sampleLive: css.slice(0, 120),
  });

  writeFileSync(localPath + ".live-extract.css", css);
  return { slug, css, local, mediaCount, localMedia };
}

const results = [];
for (const [urlPath, slug] of paths) {
  results.push(await extractDesignCss(urlPath, slug));
}

// Show media blocks from manufacturing
const m = results.find((r) => r.slug === "manufacturing");
if (m) {
  const mediaBlocks = [...m.css.matchAll(/@media[^{]+\{/g)].map((x) => x[0]);
  console.log("\nmanufacturing media queries:", mediaBlocks);
  // Compare key rules desktop vs mobile in LIVE
  for (const sel of [
    "us_custom_0b7e9c85",
    "us_custom_8b78c63d",
    "us_custom_0493f734",
    "us_custom_7bf0190b",
  ]) {
    const re = new RegExp(`\\.${sel}\\{[^}]+\\}`, "g");
    console.log("\nLIVE", sel, [...m.css.matchAll(re)].map((x) => x[0]));
  }
}
