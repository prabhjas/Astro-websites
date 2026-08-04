import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const outDir = path.resolve("_crawl/contact-shots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

async function shot(url, name) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  const box = await page.locator(".sp-page-content, [data-elementor-type='wp-page']").first().boundingBox().catch(() => null);
  const form = await page.locator(".wpcf7-form, form.wpcf7-form").first().boundingBox().catch(() => null);
  const img = await page.locator("img[src*='contact-img']").first().boundingBox().catch(() => null);
  console.log(name, { box, form, img, title: await page.title() });
}

await shot("http://127.0.0.1:5092/contact-us/", "local");
await shot("https://c-uae.com/contact-us/?nowprocket=1", "live");
await browser.close();
console.log("wrote", outDir);
