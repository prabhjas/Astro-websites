import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".tmp-qa");
mkdirSync(OUT, { recursive: true });

async function shot(browser, url, file) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (u.includes("googletagmanager") || u.includes("google-analytics") || u.includes("facebook") || u.includes("hotjar")) return;
    failed.push(`${req.failure()?.errorText || "fail"} ${u}`);
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: file, fullPage: true });
  const title = await page.title();
  const fonts = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const h1 = document.querySelector("h1");
    return {
      bodyFont: body.fontFamily,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      h1Size: h1 ? getComputedStyle(h1).fontSize : null,
    };
  });
  await page.close();
  return { title, fonts, errors: errors.slice(0, 25), failed: failed.slice(0, 40) };
}

const { chromium: cr } = await import("playwright");
const browser = await cr.launch({ headless: true });
try {
  const live = await shot(browser, "https://kinzahr.com/", join(OUT, "live-home.png"));
  const local = await shot(browser, "http://127.0.0.1:5085/", join(OUT, "local-home.png"));
  const report = { live, local };
  writeFileSync(join(OUT, "home-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
