/**
 * Pixel-level section style dump for live vs local across all marketing pages.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const LIVE = "https://spheavyrental.ae";
const LOCAL = "http://127.0.0.1:4321";
const paths = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8")).map((p) => p.path);

function dump(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector('[data-elementor-type="wp-page"]') ||
      document.querySelector("main .elementor") ||
      document.querySelector("main");
    const sections = [...root.querySelectorAll(".elementor-top-section")].map((s, idx) => {
      const cs = getComputedStyle(s);
      const heading = s.querySelector(".elementor-heading-title, h1, h2, h3");
      const hcs = heading ? getComputedStyle(heading) : null;
      return {
        idx,
        id: s.getAttribute("data-id"),
        bg: cs.backgroundColor,
        bgImage: (cs.backgroundImage || "").includes("url(") ? "url(...)" : "none",
        pad: `${cs.paddingTop}|${cs.paddingBottom}|${cs.paddingLeft}|${cs.paddingRight}`,
        margin: `${cs.marginTop}|${cs.marginBottom}`,
        minH: cs.minHeight,
        heading: heading ? (heading.textContent || "").trim().slice(0, 40) : "",
        headingColor: hcs?.color || "",
        headingSize: hcs?.fontSize || "",
        headingFont: (hcs?.fontFamily || "").split(",")[0].replace(/"/g, ""),
      };
    });

    const accordionRoot = root;
    const accordion = {
      count: accordionRoot.querySelectorAll(".elementor-accordion-item").length,
      open: accordionRoot.querySelectorAll(".elementor-tab-title.elementor-active").length,
      firstTitleColor: accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")
        ? getComputedStyle(accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")).color
        : null,
      firstItemBg: accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")
        ? getComputedStyle(accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")).backgroundColor
        : null,
      itemPad: accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")
        ? getComputedStyle(accordionRoot.querySelector(".elementor-accordion-item .elementor-tab-title")).padding
        : null,
    };

    const iconBoxes = root.querySelectorAll(".elementor-widget-icon-box, .elementor-icon-box-wrapper").length;
    const images = root.querySelectorAll("img").length;
    const brokenImgs = [...root.querySelectorAll("img")].filter((img) => !img.complete || img.naturalWidth === 0).length;

    return {
      sections,
      accordion,
      iconBoxes,
      images,
      brokenImgs,
      bodyFont: getComputedStyle(document.body).fontFamily,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const report = [];

for (const path of paths) {
  console.log("deep", path);
  const liveP = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const localP = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    await liveP.goto(`${LIVE}${path}?nowprocket=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await localP.goto(`${LOCAL}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await liveP.waitForTimeout(2500);
    await localP.waitForTimeout(1500);
    // open first FAQ if present so active styles are comparable
    for (const p of [liveP, localP]) {
      const t = p.locator(".elementor-accordion-item .elementor-tab-title").first();
      if (await t.count()) {
        await t.click({ timeout: 2000 }).catch(() => {});
        await p.waitForTimeout(300);
      }
    }
    const live = await dump(liveP);
    const local = await dump(localP);
    const issues = [];

    if (live.sections.length !== local.sections.length) {
      issues.push(`section count live=${live.sections.length} local=${local.sections.length}`);
    }
    const n = Math.min(live.sections.length, local.sections.length);
    for (let i = 0; i < n; i++) {
      const L = live.sections[i];
      const A = local.sections[i];
      if (L.bg !== A.bg) issues.push(`s${i}(${L.id}) bg live=${L.bg} local=${A.bg}`);
      if (L.pad !== A.pad) issues.push(`s${i}(${L.id}) pad live=${L.pad} local=${A.pad}`);
      if (L.headingColor && A.headingColor && L.headingColor !== A.headingColor)
        issues.push(`s${i}(${L.id}) headingColor live=${L.headingColor} local=${A.headingColor} [${L.heading}]`);
      if (L.headingSize && A.headingSize && L.headingSize !== A.headingSize)
        issues.push(`s${i}(${L.id}) headingSize live=${L.headingSize} local=${A.headingSize}`);
      if (L.headingFont && A.headingFont && L.headingFont !== A.headingFont)
        issues.push(`s${i}(${L.id}) headingFont live=${L.headingFont} local=${A.headingFont}`);
      if (L.bgImage !== A.bgImage) issues.push(`s${i}(${L.id}) bgImage live=${L.bgImage} local=${A.bgImage}`);
    }
    if (live.accordion.count !== local.accordion.count)
      issues.push(`faq count live=${live.accordion.count} local=${local.accordion.count}`);
    if (live.accordion.firstTitleColor && local.accordion.firstTitleColor && live.accordion.firstTitleColor !== local.accordion.firstTitleColor)
      issues.push(`faq titleColor live=${live.accordion.firstTitleColor} local=${local.accordion.firstTitleColor}`);
    if (live.accordion.firstItemBg && local.accordion.firstItemBg && live.accordion.firstItemBg !== local.accordion.firstItemBg)
      issues.push(`faq itemBg live=${live.accordion.firstItemBg} local=${local.accordion.firstItemBg}`);
    if (live.accordion.itemPad && local.accordion.itemPad && live.accordion.itemPad !== local.accordion.itemPad)
      issues.push(`faq itemPad live=${live.accordion.itemPad} local=${local.accordion.itemPad}`);
    if (live.iconBoxes !== local.iconBoxes) issues.push(`iconBoxes live=${live.iconBoxes} local=${local.iconBoxes}`);
    if (local.brokenImgs > 0) issues.push(`broken images local=${local.brokenImgs}`);

    report.push({ path, issues, liveSummary: { sections: live.sections.length, faq: live.accordion }, localSummary: { sections: local.sections.length, faq: local.accordion } });
    console.log(issues.length ? `  ${issues.length} issues` : "  ok");
    issues.slice(0, 8).forEach((i) => console.log("   -", i));
  } catch (e) {
    report.push({ path, issues: [e.message] });
    console.log("  ERR", e.message);
  }
  await liveP.close();
  await localP.close();
}

await browser.close();
fs.writeFileSync("_crawl/deep-compare.json", JSON.stringify(report, null, 2));
const total = report.reduce((a, r) => a + r.issues.length, 0);
console.log("\nTOTAL ISSUES", total);
