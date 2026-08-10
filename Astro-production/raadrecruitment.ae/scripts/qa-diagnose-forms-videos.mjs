/**
 * Diagnose forms + videos on local vs live.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const LOCAL = "http://127.0.0.1:5102";
const LIVE = "";

function collectMedia(html) {
  const videos = [...html.matchAll(/<(?:video|source)[^>]*(?:src|data-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
  const backgrounds = [...html.matchAll(/background(?:-image)?:\s*url\(["']?([^"')]+)/gi)].map((m) => m[1]);
  const mp4s = [...html.matchAll(/["']([^"']+\.mp4[^"']*)["']/gi)].map((m) => m[1]);
  const webms = [...html.matchAll(/["']([^"']+\.webm[^"']*)["']/gi)].map((m) => m[1]);
  return {
    videoTags: videos,
    mp4s: [...new Set(mp4s)],
    webms: [...new Set(webms)],
    bg: backgrounds.filter((u) => /\.(mp4|webm|jpg|jpeg|png|webp)/i.test(u)).slice(0, 30),
  };
}

function norm(u) {
  try {
    if (!u || u.startsWith("data:")) return null;
    if (u.startsWith("//")) u = "https:" + u;
    const x = new URL(u, LIVE);
    return x.pathname + x.search;
  } catch {
    return u;
  }
}

const paths = ["/", "/contact/", "/free-zones/", "/about-us/", "/insights/", "/pro-services/"];
const mediaReport = {};
for (const p of paths) {
  const [local, live] = await Promise.all([
    fetch(LOCAL + p).then((r) => r.text()),
    fetch(LIVE + p + "?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text()),
  ]);
  const L = collectMedia(local);
  const V = collectMedia(live);
  const liveMp4 = V.mp4s.map(norm).filter(Boolean);
  const localMp4 = new Set(L.mp4s.map(norm).filter(Boolean));
  mediaReport[p] = {
    localVideoTags: L.videoTags.length,
    liveVideoTags: V.videoTags.length,
    liveMp4,
    missingMp4: liveMp4.filter((u) => !localMp4.has(u.split("?")[0]) && ![...localMp4].some((x) => x.includes(u.split("/").pop()))),
    localForms: (local.match(/wpcf7-form/g) || []).length,
    liveForms: (live.match(/wpcf7-form/g) || []).length,
  };
}
fs.mkdirSync("_crawl", { recursive: true });
fs.writeFileSync("_crawl/media-diff.json", JSON.stringify(mediaReport, null, 2));
console.log(JSON.stringify(mediaReport, null, 2));

// Playwright form + video probe
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const net = [];
page.on("response", (r) => {
  if (r.url().includes("/api/contact") || r.url().includes(".mp4") || r.status() >= 400) {
    net.push({ url: r.url().replace(LOCAL, "").slice(0, 120), status: r.status() });
  }
});
const consoleErr = [];
page.on("pageerror", (e) => consoleErr.push(e.message.slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") consoleErr.push(m.text().slice(0, 200));
});

await page.goto(LOCAL + "/contact/", { waitUntil: "networkidle", timeout: 60000 });
const formInfo = await page.evaluate(() => {
  const f = document.querySelector("form.wpcf7-form, form[data-sp-contact-form]");
  if (!f) return { found: false };
  return {
    found: true,
    action: f.getAttribute("action"),
    fields: [...f.querySelectorAll("input,textarea,select")].map((el) => ({
      name: el.name,
      type: el.type,
      required: el.required,
    })),
    hasBridge: typeof window.__SP_CONTACT_ENDPOINT__ !== "undefined" || !!document.querySelector('meta[name="sp-contact-endpoint"]'),
    cf7Script: !!document.querySelector('script[src*="cf7-bridge"]'),
  };
});
console.log("contact form", formInfo);

if (formInfo.found) {
  await page.fill("[name='your-name'], [name='name']", "QA Tester");
  await page.fill("[name='your-email'], [name='email']", "qa-test@example.com");
  const phone = page.locator("input[type=tel], [name=phone], .wpcf7-phonetext").first();
  if (await phone.count()) await phone.fill("+971501234567");
  const msg = page.locator("[name='your-message'], textarea").first();
  if (await msg.count()) await msg.fill("Automated QA — please ignore.");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/contact"), { timeout: 15000 }).catch(() => null),
    page.locator("form.wpcf7-form input[type=submit], form.wpcf7-form button[type=submit]").first().click(),
  ]);
  let body = null;
  try {
    body = resp ? await resp.json() : null;
  } catch {
    body = resp ? await resp.text() : null;
  }
  console.log("submit", { status: resp?.status(), body, consoleErr: consoleErr.slice(0, 8), net: net.slice(0, 15) });
}

// Home videos
await page.goto(LOCAL + "/", { waitUntil: "networkidle", timeout: 60000 });
const homeVid = await page.evaluate(() => {
  const vids = [...document.querySelectorAll("video")].map((v) => ({
    src: v.currentSrc || v.getAttribute("src") || "",
    sources: [...v.querySelectorAll("source")].map((s) => s.src),
    readyState: v.readyState,
    error: v.error?.message || null,
    paused: v.paused,
    muted: v.muted,
    autoplay: v.autoplay,
    width: v.clientWidth,
    height: v.clientHeight,
  }));
  const bgVideo = [...document.querySelectorAll("[data-settings*='background_video'], .elementor-background-video-container, .elementor-background-video-hosted")].map(
    (el) => el.outerHTML.slice(0, 200),
  );
  return { vids, bgVideoCount: bgVideo.length, bgSample: bgVideo.slice(0, 3) };
});
console.log("home videos", JSON.stringify(homeVid, null, 2));

await browser.close();
