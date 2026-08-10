/**
 * Deep visual compare for FAQ + section styles on service pages.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const LIVE = "https://spheavyrental.ae";
const LOCAL = "http://127.0.0.1:4321";
const paths = [
  "/",
  "/services/",
  "/about-us/",
  "/generator-rental/",
  "/heavy-machinery-rental/",
  "/construction-equipment-rental/",
  "/scaffold-rental/",
  "/heavy-machinery-rental/forklift-rental/",
  "/contact-us/",
];

fs.mkdirSync("_crawl/compare", { recursive: true });

const browser = await chromium.launch({ headless: true });
const report = [];

for (const path of paths) {
  console.log("compare", path);
  const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const local = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await live.goto(`${LIVE}${path}?nowprocket=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await local.goto(`${LOCAL}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await live.waitForTimeout(2000);
  await local.waitForTimeout(1000);

  const probe = async (page) =>
    page.evaluate(() => {
      const faqHeading = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
        /frequently asked/i.test(el.textContent || ""),
      );
      let faqWidget = null;
      if (faqHeading) {
        let n = faqHeading.closest(".elementor-element");
        // find following accordion widget
        let cur = n;
        while (cur && !faqWidget) {
          cur = cur.nextElementSibling || cur.parentElement?.nextElementSibling;
          if (!cur) break;
          if (cur.querySelector?.(".elementor-accordion, .elementor-toggle")) {
            faqWidget = cur.querySelector(".elementor-accordion, .elementor-toggle");
            break;
          }
          if (cur.classList?.contains("elementor-widget-accordion")) {
            faqWidget = cur.querySelector(".elementor-accordion");
            break;
          }
        }
        faqWidget = document.querySelector(".faq .elementor-accordion, .elementor-widget-accordion .elementor-accordion");
      }

      const items = [...document.querySelectorAll(".elementor-accordion-item")].slice(0, 8).map((item) => {
        const title = item.querySelector(".elementor-tab-title");
        const content = item.querySelector(".elementor-tab-content");
        const tcs = title ? getComputedStyle(title) : null;
        const ccs = content ? getComputedStyle(content) : null;
        return {
          title: (title?.textContent || "").trim().slice(0, 70),
          titleColor: tcs?.color,
          titleBg: tcs?.backgroundColor,
          titlePad: tcs ? `${tcs.paddingTop} ${tcs.paddingRight} ${tcs.paddingBottom} ${tcs.paddingLeft}` : null,
          titleSize: tcs?.fontSize,
          titleWeight: tcs?.fontWeight,
          titleFont: tcs?.fontFamily,
          contentDisplay: ccs?.display,
          contentHeight: ccs?.height,
          contentMaxHeight: ccs?.maxHeight,
          contentOverflow: ccs?.overflow,
          active: title?.classList.contains("elementor-active") || false,
          border: tcs?.borderBottom || tcs?.border,
        };
      });

      const section = faqHeading?.closest(".elementor-top-section");
      const scs = section ? getComputedStyle(section) : null;

      return {
        hasFaq: !!faqHeading,
        faqTitle: (faqHeading?.textContent || "").trim(),
        faqTitleColor: faqHeading ? getComputedStyle(faqHeading).color : null,
        faqTitleSize: faqHeading ? getComputedStyle(faqHeading).fontSize : null,
        sectionBg: scs?.backgroundColor,
        sectionPad: scs ? `${scs.paddingTop}/${scs.paddingBottom}` : null,
        itemCount: document.querySelectorAll(".elementor-accordion-item").length,
        items,
      };
    });

  const L = await probe(live);
  const A = await probe(local);
  const issues = [];

  if (L.hasFaq !== A.hasFaq) issues.push(`faq presence live=${L.hasFaq} local=${A.hasFaq}`);
  if (L.itemCount !== A.itemCount) issues.push(`faq items live=${L.itemCount} local=${A.itemCount}`);
  if (L.sectionBg && A.sectionBg && L.sectionBg !== A.sectionBg)
    issues.push(`faq section bg live=${L.sectionBg} local=${A.sectionBg}`);
  if (L.sectionPad && A.sectionPad && L.sectionPad !== A.sectionPad)
    issues.push(`faq section pad live=${L.sectionPad} local=${A.sectionPad}`);
  if (L.faqTitleColor && A.faqTitleColor && L.faqTitleColor !== A.faqTitleColor)
    issues.push(`faq heading color live=${L.faqTitleColor} local=${A.faqTitleColor}`);

  for (let i = 0; i < Math.min(L.items.length, A.items.length); i++) {
    const li = L.items[i];
    const ai = A.items[i];
    if (li.titleColor !== ai.titleColor) issues.push(`item${i} titleColor live=${li.titleColor} local=${ai.titleColor}`);
    if (li.titleSize !== ai.titleSize) issues.push(`item${i} titleSize live=${li.titleSize} local=${ai.titleSize}`);
    if (li.contentDisplay !== ai.contentDisplay)
      issues.push(`item${i} contentDisplay live=${li.contentDisplay} local=${ai.contentDisplay}`);
    if (li.titlePad !== ai.titlePad) issues.push(`item${i} titlePad live=${li.titlePad} local=${ai.titlePad}`);
  }

  // Screenshots of FAQ area
  const slug = path === "/" ? "home" : path.replace(/\//g, "_").replace(/^_|_$/g, "");
  try {
    const liveFaq = live.locator("text=/frequently asked/i").first();
    const localFaq = local.locator("text=/frequently asked/i").first();
    if (await liveFaq.count()) {
      await liveFaq.scrollIntoViewIfNeeded();
      await live.screenshot({ path: `_crawl/compare/${slug}-live-faq.png` });
    }
    if (await localFaq.count()) {
      await localFaq.scrollIntoViewIfNeeded();
      await local.screenshot({ path: `_crawl/compare/${slug}-local-faq.png` });
    }
  } catch {}

  report.push({ path, issues, live: L, local: A });
  console.log(issues.length ? `  ISSUES ${issues.length}` : "  ok", issues.slice(0, 4).join(" | "));

  await live.close();
  await local.close();
}

await browser.close();
fs.writeFileSync("_crawl/faq-compare.json", JSON.stringify(report, null, 2));
console.log("\nDone. Issue pages:", report.filter((r) => r.issues.length).length);
