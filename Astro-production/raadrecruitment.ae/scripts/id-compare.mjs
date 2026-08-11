/**
 * Deep compare by section data-id (not index). Scope to wp-page only.
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
    const sections = [...root.querySelectorAll(":scope > .elementor-top-section, :scope > section.elementor-section")].map(
      (s) => {
        const cs = getComputedStyle(s);
        const heading = s.querySelector(".elementor-heading-title, h1, h2, h3");
        const hcs = heading ? getComputedStyle(heading) : null;
        return {
          id: s.getAttribute("data-id") || "",
          bg: cs.backgroundColor,
          bgImage: (cs.backgroundImage || "").includes("url(") ? "url" : "none",
          pad: `${parseInt(cs.paddingTop)}|${parseInt(cs.paddingBottom)}`,
          heading: heading ? (heading.textContent || "").trim().slice(0, 36) : "",
          headingColor: hcs?.color || "",
          headingSize: hcs?.fontSize || "",
          headingFont: (hcs?.fontFamily || "").split(",")[0].replace(/"/g, ""),
        };
      },
    );

    // Fallback if :scope direct children empty (wrapper structure)
    const allSections =
      sections.length > 0
        ? sections
        : [...root.querySelectorAll(".elementor-top-section")].map((s) => {
            const cs = getComputedStyle(s);
            const heading = s.querySelector(".elementor-heading-title, h1, h2, h3");
            const hcs = heading ? getComputedStyle(heading) : null;
            return {
              id: s.getAttribute("data-id") || "",
              bg: cs.backgroundColor,
              bgImage: (cs.backgroundImage || "").includes("url(") ? "url" : "none",
              pad: `${parseInt(cs.paddingTop)}|${parseInt(cs.paddingBottom)}`,
              heading: heading ? (heading.textContent || "").trim().slice(0, 36) : "",
              headingColor: hcs?.color || "",
              headingSize: hcs?.fontSize || "",
              headingFont: (hcs?.fontFamily || "").split(",")[0].replace(/"/g, ""),
            };
          });

    const faq = {
      count: root.querySelectorAll(".elementor-accordion-item").length,
      titleColor: root.querySelector(".elementor-tab-title")
        ? getComputedStyle(root.querySelector(".elementor-tab-title")).color
        : null,
      titleBg: root.querySelector(".elementor-tab-title")
        ? getComputedStyle(root.querySelector(".elementor-tab-title")).backgroundColor
        : null,
      titlePad: root.querySelector(".elementor-tab-title")
        ? getComputedStyle(root.querySelector(".elementor-tab-title")).padding
        : null,
    };

    const brokenImgs = [...root.querySelectorAll("img")].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.getAttribute("src"));

    return { sections: allSections, faq, brokenImgs };
  });
}

const browser = await chromium.launch({ headless: true });
const report = [];

for (const path of paths) {
  console.log("id-compare", path);
  const liveP = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const localP = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await liveP.goto(`${LIVE}${path}?nowprocket=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await localP.goto(`${LOCAL}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await liveP.waitForTimeout(2000);
    await localP.waitForTimeout(1200);
    const live = await dump(liveP);
    const local = await dump(localP);
    const issues = [];

    const liveMap = new Map(live.sections.filter((s) => s.id).map((s) => [s.id, s]));
    const localMap = new Map(local.sections.filter((s) => s.id).map((s) => [s.id, s]));

    for (const [id, L] of liveMap) {
      const A = localMap.get(id);
      if (!A) {
        issues.push(`missing section ${id} [${L.heading}]`);
        continue;
      }
      if (L.bg !== A.bg) issues.push(`${id} bg live=${L.bg} local=${A.bg}`);
      if (L.pad !== A.pad) issues.push(`${id} pad live=${L.pad} local=${A.pad}`);
      if (L.headingColor && A.headingColor && L.headingColor !== A.headingColor)
        issues.push(`${id} color live=${L.headingColor} local=${A.headingColor} [${L.heading}]`);
      if (L.headingSize && A.headingSize && L.headingSize !== A.headingSize)
        issues.push(`${id} size live=${L.headingSize} local=${A.headingSize} [${L.heading}]`);
      if (L.headingFont && A.headingFont && L.headingFont !== A.headingFont)
        issues.push(`${id} font live=${L.headingFont} local=${A.headingFont}`);
      if (L.bgImage !== A.bgImage) issues.push(`${id} bgImage live=${L.bgImage} local=${A.bgImage}`);
    }
    for (const [id, A] of localMap) {
      if (!liveMap.has(id)) issues.push(`extra local section ${id} [${A.heading}]`);
    }

    if (live.faq.count !== local.faq.count) issues.push(`faq count live=${live.faq.count} local=${local.faq.count}`);
    if (live.faq.titleColor && local.faq.titleColor && live.faq.titleColor !== local.faq.titleColor)
      issues.push(`faq color live=${live.faq.titleColor} local=${local.faq.titleColor}`);
    if (live.faq.titleBg && local.faq.titleBg && live.faq.titleBg !== local.faq.titleBg)
      issues.push(`faq bg live=${live.faq.titleBg} local=${local.faq.titleBg}`);
    if (live.faq.titlePad && local.faq.titlePad && live.faq.titlePad !== local.faq.titlePad)
      issues.push(`faq pad live=${live.faq.titlePad} local=${local.faq.titlePad}`);
    if (local.brokenImgs.length) issues.push(`broken imgs: ${local.brokenImgs.slice(0, 5).join(", ")}`);

    report.push({ path, issues, liveSections: live.sections.length, localSections: local.sections.length });
    console.log(issues.length ? `  ${issues.length} issues` : "  ok");
    issues.slice(0, 10).forEach((i) => console.log("   -", i));
  } catch (e) {
    report.push({ path, issues: [e.message] });
    console.log("  ERR", e.message);
  }
  await liveP.close();
  await localP.close();
}

await browser.close();
fs.writeFileSync("_crawl/id-compare.json", JSON.stringify(report, null, 2));
console.log("\nTOTAL", report.reduce((a, r) => a + r.issues.length, 0));
