/**
 * Page-by-page style audit: fonts, colors, section padding, FAQ vs live.
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
  "/blog/",
  "/power-generator-rental/",
];

fs.mkdirSync("_crawl/compare", { recursive: true });

function near(a, b, tol = 2) {
  if (a == null || b == null) return true;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a === b;
  return Math.abs(na - nb) <= tol;
}

const browser = await chromium.launch({ headless: true });
const report = [];

for (const path of paths) {
  process.stdout.write(`audit ${path} `);
  const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const local = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await live.goto(`${LIVE}${path}?nowprocket=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await local.goto(`${LOCAL}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await live.waitForTimeout(2500);
    await local.waitForTimeout(2200);

    const probe = async (page) =>
      page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const pageRoot = document.querySelector("[data-elementor-type=wp-page]") || document;
        const sections = [...pageRoot.querySelectorAll(":scope > .elementor-top-section, :scope > section.elementor-section")].map((s) => {
          const cs = getComputedStyle(s);
          const h = s.querySelector(".elementor-heading-title, h1, h2, h3");
          return {
            id: s.getAttribute("data-id"),
            bg: cs.backgroundColor,
            padT: cs.paddingTop,
            padB: cs.paddingBottom,
            heading: (h?.textContent || "").trim().slice(0, 50),
            headingColor: h ? getComputedStyle(h).color : null,
            headingSize: h ? getComputedStyle(h).fontSize : null,
            headingFont: h ? getComputedStyle(h).fontFamily : null,
          };
        });

        const faqItems = [...document.querySelectorAll(".elementor-accordion-item")].slice(0, 5).map((item) => {
          const t = item.querySelector(".elementor-tab-title");
          const a = item.querySelector(".elementor-accordion-title");
          const c = item.querySelector(".elementor-tab-content");
          return {
            active: t?.classList.contains("elementor-active") || false,
            aColor: a ? getComputedStyle(a).color : null,
            display: c ? getComputedStyle(c).display : null,
            itemBg: getComputedStyle(item).backgroundColor,
            itemMargin: getComputedStyle(item).marginBottom,
            titlePad: t ? getComputedStyle(t).padding : null,
            titleFont: a ? getComputedStyle(a).fontFamily : null,
            titleSize: a ? getComputedStyle(a).fontSize : null,
          };
        });

        const faqHeading = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
          /frequently asked/i.test(el.textContent || ""),
        );
        const faqSection = faqHeading?.closest(".elementor-top-section");
        const fcs = faqSection ? getComputedStyle(faqSection) : null;

        return {
          bodyBg: body.backgroundColor,
          bodyFont: body.fontFamily,
          sectionCount: sections.length,
          sections,
          faq: {
            present: !!faqHeading,
            headingColor: faqHeading ? getComputedStyle(faqHeading).color : null,
            headingSize: faqHeading ? getComputedStyle(faqHeading).fontSize : null,
            sectionBg: fcs?.backgroundColor || null,
            sectionPad: fcs ? `${fcs.paddingTop}/${fcs.paddingBottom}` : null,
            items: faqItems,
          },
          // Only count failed loads (ignore lazy not-yet-in-viewport)
          brokenImgs: [...document.images].filter(
            (img) => img.complete && img.naturalWidth === 0 && !!(img.currentSrc || img.src),
          ).length,
        };
      });

    const L = await probe(live);
    const A = await probe(local);
    const issues = [];

    if (L.bodyBg !== A.bodyBg) issues.push(`bodyBg live=${L.bodyBg} local=${A.bodyBg}`);
    if (L.sectionCount !== A.sectionCount)
      issues.push(`sections live=${L.sectionCount} local=${A.sectionCount}`);

    const byId = new Map(A.sections.map((s) => [s.id, s]));
    for (const ls of L.sections) {
      const as = byId.get(ls.id);
      if (!as) continue;
      if (ls.bg !== as.bg) issues.push(`sec ${ls.id} bg live=${ls.bg} local=${as.bg}`);
      if (!near(ls.padT, as.padT) || !near(ls.padB, as.padB))
        issues.push(`sec ${ls.id} pad live=${ls.padT}/${ls.padB} local=${as.padT}/${as.padB}`);
      if (ls.headingColor && as.headingColor && ls.headingColor !== as.headingColor)
        issues.push(`sec ${ls.id} headingColor live=${ls.headingColor} local=${as.headingColor}`);
      if (ls.headingSize && as.headingSize && !near(ls.headingSize, as.headingSize))
        issues.push(`sec ${ls.id} headingSize live=${ls.headingSize} local=${as.headingSize}`);
    }

    if (L.faq.present !== A.faq.present) issues.push(`faq present live=${L.faq.present} local=${A.faq.present}`);
    if (L.faq.sectionBg && A.faq.sectionBg && L.faq.sectionBg !== A.faq.sectionBg)
      issues.push(`faq bg live=${L.faq.sectionBg} local=${A.faq.sectionBg}`);
    if (L.faq.sectionPad && A.faq.sectionPad && L.faq.sectionPad !== A.faq.sectionPad) {
      const [lt, lb] = L.faq.sectionPad.split("/");
      const [at, ab] = A.faq.sectionPad.split("/");
      if (!near(lt, at) || !near(lb, ab)) issues.push(`faq pad live=${L.faq.sectionPad} local=${A.faq.sectionPad}`);
    }

    for (let i = 0; i < Math.min(L.faq.items.length, A.faq.items.length); i++) {
      const li = L.faq.items[i];
      const ai = A.faq.items[i];
      if (li.active !== ai.active) issues.push(`faq${i} active live=${li.active} local=${ai.active}`);
      if (li.display !== ai.display) issues.push(`faq${i} display live=${li.display} local=${ai.display}`);
      if (li.aColor !== ai.aColor) issues.push(`faq${i} titleColor live=${li.aColor} local=${ai.aColor}`);
      if (li.itemBg !== ai.itemBg) issues.push(`faq${i} itemBg live=${li.itemBg} local=${ai.itemBg}`);
      if (li.itemMargin !== ai.itemMargin) issues.push(`faq${i} margin live=${li.itemMargin} local=${ai.itemMargin}`);
      if (li.titleSize && ai.titleSize && !near(li.titleSize, ai.titleSize))
        issues.push(`faq${i} titleSize live=${li.titleSize} local=${ai.titleSize}`);
    }

    if (A.brokenImgs > 0) issues.push(`brokenImgs=${A.brokenImgs}`);

    // FAQ screenshots
    const slug = path === "/" ? "home" : path.replace(/\//g, "_").replace(/^_|_$/g, "");
    try {
      const liveFaq = live.locator("text=/frequently asked/i").first();
      const localFaq = local.locator("text=/frequently asked/i").first();
      if ((await liveFaq.count()) > 0) {
        await liveFaq.scrollIntoViewIfNeeded();
        await live.screenshot({ path: `_crawl/compare/${slug}-live-faq.png`, fullPage: false });
      }
      if ((await localFaq.count()) > 0) {
        await localFaq.scrollIntoViewIfNeeded();
        await local.screenshot({ path: `_crawl/compare/${slug}-local-faq.png`, fullPage: false });
      }
    } catch {}

    report.push({ path, issueCount: issues.length, issues: issues.slice(0, 40) });
    console.log(issues.length ? `ISSUES ${issues.length}` : "ok");
    if (issues.length) console.log("  " + issues.slice(0, 6).join("\n  "));
  } catch (e) {
    console.log("ERROR", e.message);
    report.push({ path, issueCount: 1, issues: [e.message] });
  } finally {
    await live.close();
    await local.close();
  }
}

await browser.close();
fs.writeFileSync("_crawl/style-audit.json", JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.issueCount > 0);
console.log(`\nDone. ${bad.length}/${report.length} pages with issues`);
