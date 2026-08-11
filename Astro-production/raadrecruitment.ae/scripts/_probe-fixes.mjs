#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
fs.mkdirSync("scripts/_fix-shots", { recursive: true });

async function probe(origin, path, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(origin + path, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    const heading = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
      /Success\s*Story/i.test(el.textContent || ""),
    );
    const section = heading?.closest("section, .elementor-section, .elementor-element") || null;
    const slider = document.querySelector("#n2-ss-2, .n2-ss-slider");
    const ssLoaded = !!document.querySelector(".n2-ss-slider.n2-ss-loaded");
    const prabhjas = document.querySelector(".prabhjas");
    const stickyCol = document.querySelector(
      '.elementor-element[class*="sticky"], .elementor-sticky, [data-settings*="sticky"]',
    );
    return {
      hasHeading: !!heading,
      headingText: heading?.textContent?.replace(/\s+/g, " ").trim().slice(0, 60),
      sectionH: section?.getBoundingClientRect().height || 0,
      sectionDisplay: section ? getComputedStyle(section).display : null,
      slider: slider
        ? {
            id: slider.id,
            cls: slider.className?.toString?.().slice(0, 100),
            h: slider.getBoundingClientRect().height,
            loaded: slider.classList.contains("n2-ss-loaded"),
          }
        : null,
      ssLoaded,
      n2Keys: Object.keys(window).filter((k) => /^n2-ss-/.test(k)),
      prabhjas: prabhjas
        ? {
            cls: prabhjas.className,
            pos: getComputedStyle(prabhjas).position,
            top: getComputedStyle(prabhjas).top,
            h: prabhjas.getBoundingClientRect().height,
          }
        : null,
      stickySettings: stickyCol
        ? {
            cls: stickyCol.className?.toString?.().slice(0, 120),
            settings: stickyCol.getAttribute("data-settings"),
            pos: getComputedStyle(stickyCol).position,
          }
        : null,
    };
  });

  if (info.hasHeading) {
    await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
        /Success\s*Story/i.test(el.textContent || ""),
      );
      heading?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: `scripts/_fix-shots/${label}-success.png` });

  // sticky scroll test on blog
  if (path.includes("blog") || path.split("/").filter(Boolean).length > 1) {
    // skip unless blog-ish
  }

  await page.close();
  return { label, path, origin, info, errors: errors.slice(0, 8) };
}

const jobs = [
  ["https://raadrecruitment.ae", "/emiratisation/", "live-emiratisation"],
  ["http://127.0.0.1:5113", "/emiratisation/", "local-emiratisation"],
  ["https://raadrecruitment.ae", "/blog/", "live-blog"],
  ["http://127.0.0.1:5113", "/blog/", "local-blog"],
];

const out = [];
for (const [o, p, l] of jobs) out.push(await probe(o, p, l));

// sticky scroll on local blog
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5113/blog/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas") || document.querySelector('[data-settings*="sticky"]');
    return el && { top: el.getBoundingClientRect().top, y: window.scrollY, pos: getComputedStyle(el).position };
  });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas") || document.querySelector('[data-settings*="sticky"]');
    return el && { top: el.getBoundingClientRect().top, y: window.scrollY, pos: getComputedStyle(el).position };
  });
  await page.screenshot({ path: "scripts/_fix-shots/local-blog-scrolled.png" });
  out.push({ stickyScroll: { before, after } });
  await page.close();
}

fs.writeFileSync("scripts/_fix-probe.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
