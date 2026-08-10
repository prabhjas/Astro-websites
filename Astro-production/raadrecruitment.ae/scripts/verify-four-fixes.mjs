import { chromium } from "playwright";
import fs from "node:fs";

fs.mkdirSync("_crawl/compare", { recursive: true });
const LOCAL = "http://127.0.0.1:4321";
const LIVE = "";
const browser = await chromium.launch({ headless: true });

async function shot(path, sel, name) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && /swiper|webp|jpg|png|css/.test(r.url())) failed.push(`${r.status()} ${r.url()}`);
  });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(LOCAL + path, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate((selector) => {
    const swipers = [...document.querySelectorAll(".swiper, .elementor-main-swiper")].map((el) => ({
      init: el.classList.contains("swiper-initialized"),
      slides: el.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length,
      width: el.getBoundingClientRect().width,
    }));
    const heading = [...document.querySelectorAll("h1,h2,h3,.elementor-heading-title")].find((el) =>
      new RegExp(selector, "i").test(el.textContent || ""),
    );
    let sectionBox = null;
    if (heading) {
      const sec = heading.closest(".elementor-top-section, .elementor-element");
      if (sec) {
        sec.scrollIntoView({ block: "center" });
        const r = sec.getBoundingClientRect();
        sectionBox = { y: r.y, h: r.height, w: r.width };
      }
    }
    // forklift col bg
    const col = document.querySelector(".elementor-element-5028b2e .elementor-widget-wrap, .elementor-element-5028b2e");
    const bg = col ? getComputedStyle(col).backgroundImage : null;
    const motion = document.querySelector(
      ".elementor-element-5028b2e .elementor-motion-effects-layer",
    );
    const motionBg = motion ? getComputedStyle(motion).backgroundImage : null;
    return {
      title: document.title,
      bodyClass: document.body.className,
      has652: !!document.querySelector(".elementor-652"),
      swipers,
      sectionBox,
      bg,
      motionBg,
      Swiper: typeof window.Swiper,
    };
  }, sel);

  if (info.sectionBox) {
    await page.screenshot({ path: `_crawl/compare/${name}-local.png` });
  } else {
    await page.screenshot({ path: `_crawl/compare/${name}-local.png`, fullPage: false });
  }

  console.log("\n" + name, JSON.stringify(info, null, 2));
  if (failed.length) console.log("FAILED", failed.slice(0, 8));
  if (errs.length) console.log("ERRS", errs.slice(0, 5));
  await page.close();
}

await shot("/heavy-machinery-rental/", "OUR HEAVY MACHINERY FLEET", "fleet");
await shot("/heavy-machinery-rental/forklift-rental/", "FORKLIFT RENTAL IN THE UAE", "forklift");
await shot("/about-us/", "WHAT OUR CLIENTS SAY", "about-testimonial");
await shot("/wheel-loaders-for-rent/", "Wheel Loaders", "blog-inner");

// quick live forklift bg compare
const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await live.goto(LIVE + "/heavy-machinery-rental/forklift-rental/?nowprocket=1", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await live.waitForTimeout(2000);
const liveBg = await live.evaluate(() => {
  const col = document.querySelector(".elementor-element-5028b2e .elementor-widget-wrap");
  return col ? getComputedStyle(col).backgroundImage : null;
});
console.log("\nLIVE forklift bg", liveBg);
await live.close();

await browser.close();
