import { chromium } from "playwright";
import fs from "node:fs";

const LOCAL = "http://127.0.0.1:5102";

async function submitForm(page, path) {
  await page.goto(LOCAL + path, { waitUntil: "networkidle", timeout: 90000 });
  const form = page.locator("form.wpcf7-form").first();
  await form.locator("[name='your-name']").fill("QA Tester");
  await form.locator("[name='your-email']").fill("qa@example.com");
  const phone = form.locator(".wpcf7-phonetext, [name^='phonetext'], [name='phone'], input[type=tel]").first();
  await phone.fill("+971501234567");
  const msg = form.locator("[name='your-message'], textarea").first();
  if (await msg.count()) await msg.fill("Automated QA submission");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/contact"), { timeout: 20000 }).catch(() => null),
    form.locator("button[type=submit], input[type=submit]").first().click(),
  ]);
  let body = null;
  try {
    body = resp ? await resp.json() : null;
  } catch {
    body = null;
  }
  const ui = await form.evaluate((f) => ({
    sent: f.classList.contains("sent"),
    failed: f.classList.contains("failed"),
    invalid: f.classList.contains("invalid"),
    status: (f.querySelector(".wpcf7-response-output")?.textContent || "").trim(),
  }));
  return { path, status: resp?.status() || null, body, ui };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text().slice(0, 140));
});

await page.goto(LOCAL + "/", { waitUntil: "networkidle", timeout: 90000 });
const meta = await page.evaluate(() => ({
  cssMt: !!document.querySelector('link[href="/css/oklahoma-mt-style.css"]'),
  cssCustom: !!document.querySelector('link[href="/css/wp-custom.css"]'),
  body: document.body.className,
}));
const vid = await page.evaluate(async () => {
  const v = document.querySelector("video");
  if (!v) return null;
  try {
    await v.play();
  } catch (e) {
    return { playError: String(e), err: v.error?.message, ready: v.readyState, src: v.currentSrc };
  }
  await new Promise((r) => setTimeout(r, 1200));
  return {
    ready: v.readyState,
    paused: v.paused,
    t: v.currentTime,
    err: v.error?.message,
    w: v.videoWidth,
    h: v.videoHeight,
    src: v.currentSrc,
  };
});

const home = await submitForm(page, "/");
const contact = await submitForm(page, "/contact/");

// Screenshots
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(LOCAL + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: "_crawl/parity-local-home-1440.png", fullPage: false });
await page.goto("https://ngmanpower.com/?nowprocket=1", { waitUntil: "networkidle", timeout: 90000 });
await page.screenshot({ path: "_crawl/parity-live-home-1440.png", fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(LOCAL + "/", { waitUntil: "domcontentloaded" });
await page.locator(".navbar-toggle").click();
await page.waitForTimeout(500);
await page.screenshot({ path: "_crawl/parity-local-home-390-nav.png", fullPage: false });
await page.goto("https://ngmanpower.com/?nowprocket=1", { waitUntil: "domcontentloaded" });
await page.locator(".navbar-toggle").click();
await page.waitForTimeout(500);
await page.screenshot({ path: "_crawl/parity-live-home-390-nav.png", fullPage: false });

const report = {
  meta,
  vid,
  home,
  contact,
  errs: [...new Set(errs)].slice(0, 12),
};
fs.writeFileSync("_crawl/parity-verify.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
