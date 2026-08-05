/**
 * Playwright QA: console errors, asset failures, overflow, forms, nav across breakpoints.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const LOCAL = "http://127.0.0.1:5096";
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8")).map((p) => p.path);
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8")).map((p) => p.path);
const samplePosts = [...posts.slice(0, 8), ...posts.slice(100, 104), ...posts.slice(-4)];
const paths = [...new Set([...pages, ...samplePosts])];

const browser = await chromium.launch({ headless: true });
const report = {
  checkedAt: new Date().toISOString(),
  pages: [],
  breakpoints: [],
  forms: [],
  summary: {},
};

async function probe(pathName, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failed = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e.message).slice(0, 180)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 180));
  });
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (u.includes("127.0.0.1:5096") || u.startsWith(LOCAL)) {
      failed.push({ url: u.replace(LOCAL, "").slice(0, 120), err: req.failure()?.errorText || "fail" });
    }
  });
  let status = 0;
  try {
    const res = await page.goto(LOCAL + pathName, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = res?.status() || 0;
    await page.waitForTimeout(900);
  } catch (e) {
    await context.close();
    return { path: pathName, status: 0, error: e.message, consoleErrors, failed };
  }
  const metrics = await page.evaluate(() => {
    const brokenImgs = [...document.images]
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src || "").replace(/^https?:\/\/[^/]+/, ""))
      .filter((s) => s && !s.includes("{{"))
      .slice(0, 12);
    return {
      title: document.title,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      forms: document.querySelectorAll("form.wpcf7-form, form[data-sp-contact-form]").length,
      navToggle: !!document.querySelector(".navbar-toggle"),
      navPanel: !!document.querySelector("#navbar"),
      header: !!document.querySelector("header.header1"),
      footer: !!document.querySelector("footer, .footer"),
      accordion: document.querySelectorAll(".elementor-accordion, .panel-group, .wpsm_panel-group").length,
      carousel: document.querySelectorAll(".owl-carousel, .swiper, .elementor-swiper").length,
      brokenImgs,
    };
  });
  await context.close();
  return {
    path: pathName,
    status,
    viewport,
    ...metrics,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 8),
    failed: failed.slice(0, 12),
  };
}

// Full page pass at 1440
let i = 0;
for (const p of paths) {
  i++;
  process.stdout.write(`\r[${i}/${paths.length}] ${p}        `);
  report.pages.push(await probe(p, { width: 1440, height: 900 }));
}
console.log("\npages done");

const keyPaths = ["/", "/about-us/", "/contact/", "/insights/", "/free-zones/", "/pro-services/visa-services/"];
const widths = [1920, 1440, 1024, 768, 430, 375, 320];
for (const w of widths) {
  for (const p of keyPaths) {
    const r = await probe(p, { width: w, height: w >= 768 ? 900 : 800 });
    report.breakpoints.push({
      path: p,
      width: w,
      overflow: r.overflow,
      status: r.status,
      console: r.consoleErrors.length,
      failed: r.failed.length,
      brokenImgs: r.brokenImgs?.length || 0,
    });
  }
}

// Form validation on contact + home
for (const p of ["/contact/", "/"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(LOCAL + p, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(500);
  const formCount = await page.locator("form.wpcf7-form, form[data-sp-contact-form]").count();
  let emptyResult = null;
  let validResult = null;
  if (formCount > 0) {
    const form = page.locator("form.wpcf7-form, form[data-sp-contact-form]").first();
    await form.evaluate((f) => {
      f.querySelectorAll("input, textarea").forEach((el) => {
        if (el.type === "hidden" || el.type === "submit") return;
        el.value = "";
      });
    });
    await form.locator("input[type=submit], button[type=submit]").first().click();
    await page.waitForTimeout(800);
    emptyResult = await form.evaluate((f) => ({
      invalid: f.classList.contains("invalid") || !!f.querySelector(".sp-field-invalid, .wpcf7-not-valid"),
      status: (f.querySelector(".wpcf7-response-output")?.textContent || "").trim().slice(0, 120),
    }));

    await form.evaluate((f) => {
      const set = (sel, val) => {
        const el = f.querySelector(sel);
        if (el) el.value = val;
      };
      set("[name='your-name'], [name='name'], [name='sub']", "QA Tester");
      set("[name='your-email'], [name='email'], [name='sub2']", "qa@example.com");
      set("input[type=tel], [name=phone], .wpcf7-phonetext", "+971501234567");
      set("[name='your-message'], [name=message], textarea", "Automated QA submission — please ignore.");
    });
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/contact"), { timeout: 15000 }).catch(() => null),
      form.locator("input[type=submit], button[type=submit]").first().click(),
    ]);
    await page.waitForTimeout(1000);
    validResult = {
      apiStatus: resp?.status() || null,
      ui: await form.evaluate((f) => ({
        sent: f.classList.contains("sent"),
        failed: f.classList.contains("failed"),
        status: (f.querySelector(".wpcf7-response-output")?.textContent || "").trim().slice(0, 160),
      })),
    };
  }
  report.forms.push({ path: p, formCount, emptyResult, validResult });
  await context.close();
}

await browser.close();

const pageFlags = report.pages.filter(
  (r) =>
    r.status !== 200 ||
    r.overflow ||
    (r.consoleErrors || []).length ||
    (r.failed || []).length ||
    (r.brokenImgs || []).length,
);
report.summary = {
  paths: report.pages.length,
  status200: report.pages.filter((r) => r.status === 200).length,
  withIssues: pageFlags.length,
  overflow1440: report.pages.filter((r) => r.overflow).length,
  consoleErrors: report.pages.filter((r) => (r.consoleErrors || []).length).length,
  failedReqs: report.pages.filter((r) => (r.failed || []).length).length,
  brokenImgs: report.pages.filter((r) => (r.brokenImgs || []).length).length,
  breakpointOverflow: report.breakpoints.filter((b) => b.overflow),
  forms: report.forms,
};

fs.mkdirSync("_crawl", { recursive: true });
fs.writeFileSync("_crawl/qa-playwright-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log("issue sample", pageFlags.slice(0, 12).map((r) => ({
  path: r.path,
  status: r.status,
  overflow: r.overflow,
  console: r.consoleErrors,
  failed: r.failed?.slice(0, 3),
  broken: r.brokenImgs?.slice(0, 3),
})));
