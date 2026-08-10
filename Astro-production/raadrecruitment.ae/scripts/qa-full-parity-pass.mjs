/**
 * Side-by-side structural/CSS/asset diff for all pages + sample posts.
 * Downloads missing real assets (not Elementor template stubs).
 */
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

const LOCAL = "http://127.0.0.1:5102";
const LIVE = "";
const ROOT = process.cwd();

function isStub(u) {
  return !u || /\{\{|%7B%7B|Remove video|%3E%3C|data\.model|data\.sizes|attachment\./i.test(u);
}

function toPath(u) {
  try {
    if (!u || u.startsWith("data:") || u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("#")) return null;
    if (u.startsWith("//")) u = "https:" + u;
    const x = new URL(u, LIVE);
    if (!x.hostname.includes("ngmanpower.com") && !x.hostname.includes("127.0.0.1")) return null;
    return x.pathname;
  } catch {
    return null;
  }
}

async function saveAsset(rel) {
  if (!rel || isStub(rel)) return "skip-stub";
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  const d2 = path.join(ROOT, "dist/client", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
    const head = fs.readFileSync(dest).subarray(0, 20).toString("utf8");
    if (!head.includes("<!DOCTYPE") && !head.includes("<html")) return "exists";
  }
  const r = await fetch(LIVE + rel, { headers: { "User-Agent": "Mozilla/5.0" } });
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  if (!r.ok || ct.includes("text/html") || buf[0] === 0x3c) return `fail ${r.status}`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  fs.mkdirSync(path.dirname(d2), { recursive: true });
  fs.writeFileSync(d2, buf);
  return `saved ${buf.length}`;
}

function assetsFromHtml(html) {
  const $ = cheerio.load(html);
  const out = new Set();
  $("img").each((_, el) => {
    for (const a of ["src", "data-src", "data-lazy-src"]) {
      const p = toPath($(el).attr(a));
      if (p) out.add(p);
    }
    const ss = $(el).attr("srcset") || $(el).attr("data-srcset") || "";
    for (const part of ss.split(",")) {
      const u = part.trim().split(/\s+/)[0];
      const p = toPath(u);
      if (p) out.add(p);
    }
  });
  $("video, source, iframe").each((_, el) => {
    for (const a of ["src", "data-src", "poster"]) {
      const p = toPath($(el).attr(a));
      if (p) out.add(p);
    }
  });
  // css url() in inline styles
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    const p = toPath(m[2]);
    if (p && /\.(png|jpe?g|webp|gif|svg|woff2?|ttf|mp4|webm|css)$/i.test(p)) out.add(p);
  }
  return [...out].filter((p) => !isStub(p));
}

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8")).map((p) => p.path);
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8")).map((p) => p.path);
const samplePosts = [...posts.slice(0, 10), ...posts.slice(80, 85), ...posts.slice(-5)];

const missing = new Set();
const pageStats = [];

for (const p of [...pages, ...samplePosts]) {
  process.stdout.write(`\rcrawl ${p}          `);
  let liveHtml = "";
  let localHtml = "";
  try {
    liveHtml = await (await fetch(LIVE + p + (p.includes("?") ? "" : ""), { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  } catch (e) {
    pageStats.push({ path: p, error: "live " + e.message });
    continue;
  }
  try {
    localHtml = await (await fetch(LOCAL + p)).text();
  } catch (e) {
    pageStats.push({ path: p, error: "local " + e.message });
    continue;
  }

  const liveAssets = assetsFromHtml(liveHtml);
  for (const a of liveAssets) {
    const dest = path.join(ROOT, "public", a.replace(/^\//, ""));
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 50) missing.add(a);
  }

  const $L = cheerio.load(localHtml);
  const $V = cheerio.load(liveHtml);
  pageStats.push({
    path: p,
    localStatus: 200,
    sections: { local: $L(".elementor-section").length, live: $V(".elementor-section").length },
    widgets: { local: $L("[class*='elementor-widget-']").length, live: $V("[class*='elementor-widget-']").length },
    imgs: { local: $L("img").length, live: $V("img").length },
    videos: { local: $L("video").length, live: $V("video").length },
    cf7: { local: $L("form.wpcf7-form").length, live: $V("form.wpcf7-form").length },
    h1: ($L("h1").first().text() || "").trim().slice(0, 80),
  });
}
console.log("\nmissing assets", missing.size);

let saved = 0,
  failed = 0,
  skipped = 0;
for (const rel of missing) {
  const st = await saveAsset(rel);
  if (st.startsWith("saved")) saved++;
  else if (st === "exists" || st === "skip-stub") skipped++;
  else {
    failed++;
    if (failed < 20) console.log("FAIL", rel, st);
  }
}
console.log({ saved, skipped, failed });

// Playwright: homepage form + video playback after download
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text().slice(0, 160));
});

await page.goto(LOCAL + "/", { waitUntil: "networkidle", timeout: 90000 });
const homeForm = await page.evaluate(() => {
  const f = document.querySelector("form.wpcf7-form");
  return f
    ? {
        names: [...f.querySelectorAll("input,textarea")].map((i) => i.name).filter(Boolean),
      }
    : null;
});
console.log("home form fields", homeForm);

if (homeForm) {
  await page.locator("form.wpcf7-form [name='your-name']").fill("QA Home");
  await page.locator("form.wpcf7-form [name='your-email']").fill("qa-home@example.com");
  const phone = page.locator("form.wpcf7-form input.wpcf7-phonetext, form.wpcf7-form [name^='phonetext']").first();
  await phone.fill("+971501111111");
  await page.locator("form.wpcf7-form textarea, form.wpcf7-form [name='your-message']").first().fill("Home form QA");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/contact"), { timeout: 20000 }).catch(() => null),
    page.locator("form.wpcf7-form input[type=submit]").first().click(),
  ]);
  let body = null;
  try {
    body = resp ? await resp.json() : null;
  } catch {
    body = null;
  }
  console.log("home submit", resp?.status(), body);
}

const vid = await page.evaluate(async () => {
  const v = document.querySelector("video.elementor-video, video");
  if (!v) return null;
  try {
    await v.play();
  } catch (e) {
    return { playError: String(e), readyState: v.readyState, err: v.error?.code, msg: v.error?.message, src: v.currentSrc };
  }
  await new Promise((r) => setTimeout(r, 800));
  return {
    readyState: v.readyState,
    paused: v.paused,
    currentTime: v.currentTime,
    err: v.error?.code,
    msg: v.error?.message,
    src: v.currentSrc,
    w: v.clientWidth,
    h: v.clientHeight,
  };
});
console.log("video play", vid);
console.log("console sample", [...new Set(errs)].slice(0, 10));

// Mobile nav vs live - screenshot dimensions of header
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(LOCAL + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(500);
  if (width <= 768) {
    await page.locator(".navbar-toggle").click().catch(() => null);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `_crawl/local-home-${width}.png`, fullPage: false });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(LIVE + "/?nowprocket=1", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `_crawl/live-home-1440.png`, fullPage: false });
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(LIVE + "/?nowprocket=1", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(800);
await page.locator(".navbar-toggle").click().catch(() => null);
await page.waitForTimeout(500);
await page.screenshot({ path: `_crawl/live-home-390.png`, fullPage: false });

await browser.close();

fs.writeFileSync(
  "_crawl/full-audit-stats.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), pageStats, missingCount: missing.size, saved, failed }, null, 2),
);
console.log("pages", pageStats.length, "section mismatches", pageStats.filter((p) => p.sections && p.sections.local !== p.sections.live).length);
