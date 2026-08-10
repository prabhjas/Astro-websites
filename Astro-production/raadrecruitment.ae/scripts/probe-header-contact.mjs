import { chromium } from "playwright";
import fs from "node:fs";

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const p = pages.find((x) => x.path === "/contact-us/");
const h = p.bodyHtml;
console.log("has wpcf7", /wpcf7/.test(h));
console.log("has Get in Touch", /Get in Touch|GET IN TOUCH/i.test(h));
const ids = [...h.matchAll(/data-id="([a-z0-9]+)"[^>]*data-element_type="section"/g)].map((m) => m[1]);
console.log("section ids", ids);

const browser = await chromium.launch({ headless: true });
for (const [label, url] of [
  ["live", "/contact-us/?nowprocket=1"],
  ["local", "http://127.0.0.1:4321/contact-us/"],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const main = document.querySelector("[data-elementor-type=wp-page]");
    const secs = [...(main?.querySelectorAll(":scope > .elementor-top-section") || [])].map((s) => ({
      id: s.getAttribute("data-id"),
      bg: getComputedStyle(s).backgroundColor,
      text: (s.innerText || "").trim().slice(0, 100).replace(/\s+/g, " "),
    }));
    const after = [...document.querySelectorAll("main .page-content ~ *, main > .sp-container, #form")].map(
      (el) => ({
        id: el.id,
        class: el.className,
        text: (el.innerText || "").trim().slice(0, 80).replace(/\s+/g, " "),
        bg: getComputedStyle(el).backgroundColor,
        html: el.outerHTML.slice(0, 300),
      }),
    );
    // Find yellow button section
    const yellow = [...document.querySelectorAll(".elementor-button, a.elementor-button-link, button")].filter(
      (el) => /get in touch/i.test(el.textContent || ""),
    );
    return {
      secs,
      after,
      yellow: yellow.map((el) => {
        const sec = el.closest(".elementor-top-section, section, .sp-container, form");
        return {
          text: el.textContent.trim(),
          class: el.className,
          secClass: sec?.className?.slice?.(0, 80),
          secBg: sec ? getComputedStyle(sec).backgroundColor : null,
          btnBg: getComputedStyle(el).backgroundColor,
        };
      }),
    };
  });
  console.log("\n" + label, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `_crawl/compare/contact-${label}.png`, fullPage: true });
  await page.close();
}

// Header on blog vs home
for (const [label, url] of [
  ["home", "http://127.0.0.1:4321/"],
  ["blog", "http://127.0.0.1:4321/wheel-loaders-for-rent/"],
  ["liveblog", "/wheel-loaders-for-rent/?nowprocket=1"],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);
  const data = await page.evaluate(() => {
    const header = document.querySelector("[data-elementor-type=header]");
    const sec = header?.querySelector(".elementor-top-section");
    const sticky = header?.querySelector(".elementor-sticky, .elementor-sticky--active");
    return {
      headerBg: header ? getComputedStyle(header).backgroundColor : null,
      secBg: sec ? getComputedStyle(sec).backgroundColor : null,
      secBgImage: sec ? getComputedStyle(sec).backgroundImage : null,
      overlay: (() => {
        const o = sec?.querySelector(".elementor-background-overlay");
        return o ? getComputedStyle(o).backgroundColor + " / " + getComputedStyle(o).opacity : null;
      })(),
      stickyBg: sticky ? getComputedStyle(sticky).backgroundColor : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      firstContentBg: (() => {
        const c = document.querySelector("[data-elementor-type=wp-page] .elementor-top-section, .elementor-652 .elementor-top-section");
        return c ? getComputedStyle(c).backgroundColor : null;
      })(),
    };
  });
  console.log("\nheader " + label, data);
  await page.screenshot({ path: `_crawl/compare/header-${label}.png` });
  await page.close();
}

await browser.close();
