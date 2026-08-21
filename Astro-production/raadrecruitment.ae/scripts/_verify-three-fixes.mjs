#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const LOCAL = "http://127.0.0.1:5113";
fs.mkdirSync("scripts/_fix-shots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {};

// 1) Success story visibility on services
for (const p of ["/emiratisation/", "/staff-outsourcing-in-uae/", "/recruitment/"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(LOCAL + p, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const heading = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
      /Success/i.test(el.textContent || "") && /Story/i.test(el.textContent || ""),
    );
    heading?.scrollIntoView({ block: "center" });
    const quote = [...document.querySelectorAll("p")].find((el) =>
      /Raad Recruitment|Emiratisation|Emiratization/i.test(el.textContent || ""),
    );
    const slider = document.querySelector("#n2-ss-4, #n2-ss-5, #n2-ss-6");
    const quoteVisible = quote
      ? (() => {
          const r = quote.getBoundingClientRect();
          const cs = getComputedStyle(quote);
          return {
            text: quote.textContent.slice(0, 80),
            w: r.width,
            h: r.height,
            opacity: cs.opacity,
            color: cs.color,
            x: Math.round(r.x),
          };
        })()
      : null;
    return {
      ssLoaded: !!document.querySelector(".n2-ss-slider.n2-ss-loaded"),
      sliderId: slider?.id,
      sliderH: slider?.getBoundingClientRect().height || 0,
      quoteVisible,
      hasSs4Css: [...document.styleSheets].some((s) => (s.href || "").includes("n2-ss-4")),
    };
  });
  await page.waitForTimeout(400);
  const slug = p.replace(/\//g, "") || "x";
  await page.screenshot({ path: `scripts/_fix-shots/fixed-${slug}-success.png` });
  report[p] = info;
  await page.close();
}

// 2) Sticky blog form
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(LOCAL + "/blog/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas");
    return el && {
      top: Math.round(el.getBoundingClientRect().top),
      pos: getComputedStyle(el).position,
      cssTop: getComputedStyle(el).top,
    };
  });
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas");
    return el && {
      top: Math.round(el.getBoundingClientRect().top),
      pos: getComputedStyle(el).position,
      cssTop: getComputedStyle(el).top,
    };
  });
  await page.screenshot({ path: "scripts/_fix-shots/fixed-blog-sticky.png" });
  report.sticky = { before, after, stuck: after && after.top >= 80 && after.top <= 120 };
  await page.close();
}

// sticky on a single post
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const html = await (await fetch(LOCAL + "/blog/")).text();
  const postLink = (html.match(/href="(\/[^"]+\/)"/) || [])[1];
  // find first post from API-ish: look for article links
  const links = [...html.matchAll(/href="(\/(?:benefits|emiratisation|resignation)[^"]*\/)"/g)].map(
    (m) => m[1],
  );
  const path = links[0] || "/benefits-of-emiratisation-in-uae/";
  await page.goto(LOCAL + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas");
    return el && {
      top: Math.round(el.getBoundingClientRect().top),
      pos: getComputedStyle(el).position,
      cssTop: getComputedStyle(el).top,
    };
  });
  report.postSticky = { path, after };
  await page.close();
}

// 3) Favicon
{
  const page = await browser.newPage();
  const icons = [];
  page.on("response", (res) => {
    if (/favicon|apple-touch|android-icon|cropped-favicon/i.test(res.url())) {
      icons.push({ status: res.status(), url: res.url().replace(LOCAL, ""), ct: res.headers()["content-type"] });
    }
  });
  await page.goto(LOCAL + "/", { waitUntil: "networkidle" });
  const headIcons = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]')].map((l) => ({
      rel: l.rel,
      href: l.getAttribute("href"),
    })),
  );
  report.favicon = { headIcons, icons };
  await page.close();
}

fs.writeFileSync("scripts/_fix-verify.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
