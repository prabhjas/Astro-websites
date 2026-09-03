/**
 * Populate pageCss for /es/iberia-eor-landing-page-english-2/ from /eor-services/ template.
 * The Spanish WPML page was synced without per-page stylesheets, breaking testimonials + FAQ accordion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pagesPath = path.join(root, "src/data/pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));

const source = pages.find((p) => p.path === "/eor-services/");
const target = pages.find((p) => p.path === "/es/iberia-eor-landing-page-english-2/");

if (!source?.pageCss?.length) {
  console.error("Source /eor-services/ pageCss not found");
  process.exit(1);
}
if (!target) {
  console.error("Target Spanish landing page not found");
  process.exit(1);
}

// Same widget + embedded template CSS as English EOR landing; page CSS uses post-4838 via elementorCss.
const pageCss = source.pageCss.map((href) =>
  href.includes("post-4614.css")
    ? "/wp-content/uploads/elementor/css/post-4838.css"
    : href,
);

// Deduplicate while preserving order (elementorCss also adds post-4838.css in layout).
const seen = new Set();
target.pageCss = pageCss.filter((href) => {
  if (seen.has(href)) return false;
  seen.add(href);
  return true;
});

fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2) + "\n");
console.log(`Updated pageCss for ${target.path}: ${target.pageCss.length} stylesheets`);
