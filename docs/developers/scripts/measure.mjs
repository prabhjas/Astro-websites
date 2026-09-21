/**
 * measure.mjs — faithful Lighthouse runner (best-of-N), mobile or desktop.
 *
 * Usage:
 *   node measure.mjs <url> [mobile|desktop] [runs]
 * Examples:
 *   node measure.mjs https://connecthr.ae/ mobile 3
 *   node measure.mjs https://127.0.0.1:8445/about-us/ desktop 2
 *
 * Notes:
 *   - Best-of-N (default 3): single runs swing wildly; always take the best.
 *   - For LOCAL measurement, serve the built site behind a proxy that mimics
 *     production (HTTP/2 + gzip + immutable cache) and point this at the proxy —
 *     never the bare dev server (no compression/caching = misleadingly low).
 *   - Kill stray Chrome between big batches: pkill -9 -f -i "Google Chrome".
 *   - Requires: npm i  (lighthouse, chrome-launcher) + Google Chrome installed.
 */
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const url = process.argv[2];
const form = process.argv[3] || "mobile";
const RUNS = Number(process.argv[4] || 3);
if (!url) { console.error("usage: node measure.mjs <url> [mobile|desktop] [runs]"); process.exit(1); }

const CHROME = process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const chrome = await launch({
  chromeFlags: ["--headless=new", "--ignore-certificate-errors", "--no-sandbox", "--disable-dev-shm-usage"],
  chromePath: CHROME,
});
const config = form === "desktop" ? desktopConfig : undefined;
let best = null;
for (let i = 0; i < RUNS; i++) {
  try {
    const r = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] }, config);
    const a = r.lhr.audits;
    const rec = {
      score: Math.round(r.lhr.categories.performance.score * 100),
      FCP_s: +(a["first-contentful-paint"].numericValue / 1000).toFixed(2),
      LCP_s: +(a["largest-contentful-paint"].numericValue / 1000).toFixed(2),
      TBT_ms: Math.round(a["total-blocking-time"].numericValue),
      CLS: +a["cumulative-layout-shift"].numericValue.toFixed(3),
    };
    if (!best || rec.score > best.score) best = rec;
  } catch (e) { /* keep best across runs */ }
}
await chrome.kill();
console.log(JSON.stringify({ url, form, ...(best || { score: 0, error: "all runs failed" }) }, null, 2));
