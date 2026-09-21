/**
 * gen-critical.mjs — generate above-the-fold critical CSS for one route (penthouse).
 *
 * Renders the URL at a mobile viewport and extracts the CSS actually used above
 * the fold, from the CSS files you pass. Inline that output in <head>; load the
 * full stylesheet non-blocking on mobile (media="print" -> swap to all on load).
 *
 * Usage:
 *   node gen-critical.mjs <url> <out.css> <cssFile1> [cssFile2 ...]
 * Example (concatenate the site's render-blocking sheets, then extract):
 *   node gen-critical.mjs https://127.0.0.1:8445/about-us/ \
 *     ../../../Astro-production/connecthr.ae/src/data/critical/about-us.css \
 *     ../../../Astro-production/connecthr.ae/public/css/_head-bundle.css \
 *     ../../../Astro-production/connecthr.ae/public/wp-content/uploads/elementor/css/post-123.css
 *
 * IMPORTANT after generating:
 *   - Strip every @import from the inlined critical CSS (this script already does).
 *   - Also inline the responsive utilities (reverse-column + hide-on-device) — see
 *     Astro-production/connecthr.ae/src/data/responsive-utils.css — or the fold
 *     will reflow when the async CSS lands (CLS 0.2+).
 *
 * Requires: npm i  (penthouse). Uses penthouse's bundled puppeteer with system Chrome.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import penthouse from "penthouse";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer"); // penthouse's bundled puppeteer

const [url, out, ...cssFiles] = process.argv.slice(2);
if (!url || !out || !cssFiles.length) {
  console.error("usage: node gen-critical.mjs <url> <out.css> <cssFile1> [cssFile2 ...]");
  process.exit(1);
}
const CHROME = process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let css = cssFiles.map((f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "")).join("\n");
css = css.replace(/@import[^;]+;/g, ""); // @import re-blocks first paint — strip it
console.error("input CSS:", (css.length / 1024).toFixed(0), "KB from", cssFiles.length, "file(s)");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--ignore-certificate-errors", "--no-sandbox", "--disable-dev-shm-usage"],
});
const critical = await penthouse({
  url,
  cssString: css,
  width: 412,
  height: 1400, // tall mobile fold; raise if the fold reflows on a long hero
  puppeteer: { getBrowser: () => browser },
  timeout: 90000,
  pageLoadSkipTimeout: 8000,
  renderWaitTime: 500,
  forceInclude: [/^:root/, /@font-face/, /--e-global/, /\.elementor-kit/],
});
await browser.close().catch(() => {});
fs.writeFileSync(out, critical);
console.log(`wrote ${out}  ${(critical.length / 1024).toFixed(0)}KB`);
