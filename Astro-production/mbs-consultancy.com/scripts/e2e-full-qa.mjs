/**
 * Full-site E2E QA for mbs-consultancy.com local fleet (:5084).
 * Crawls every sitemap URL + key system routes; checks status, SEO,
 * console errors, broken assets, forms presence, and overflow.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "http://127.0.0.1:5084";
const LIVE = "https://mbs-consultancy.com";
const OUT_DIR = path.resolve("_crawl/e2e-qa");
const CONCURRENCY = Number(process.env.QA_CONCURRENCY || 4);
const SAMPLE_DEEP = Number(process.env.QA_DEEP_SAMPLE || 40);
const RESPONSIVE_PATHS = [
  "/",
  "/contact/",
  "/insights/",
  "/employer-of-record/",
  "/employer-of-record/united-arab-emirates/",
  "/hr-services/",
  "/blog/",
  "/guides/invest-in-dubai/",
  "/payroll/",
  "/staff-outsourcing/",
  "/recruitment/",
  "/press/",
  "/search/?s=eor",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile-large", width: 414, height: 896 },
  { name: "mobile-small", width: 360, height: 640 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function normalizePath(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (s.startsWith("http")) {
    try {
      const url = new URL(s);
      s = url.pathname + url.search;
    } catch {
      return null;
    }
  }
  if (!s.startsWith("/")) s = `/${s}`;
  // skip non-html
  if (/\.(xml|txt|js|css|png|jpe?g|webp|svg|ico|pdf|woff2?)(\?|$)/i.test(s)) return null;
  return s;
}

function loadAllPaths() {
  const sitemap = JSON.parse(fs.readFileSync("src/data/sitemap-urls.json", "utf8"));
  const set = new Set();
  for (const key of Object.keys(sitemap)) {
    for (const item of sitemap[key] || []) {
      const p = normalizePath(typeof item === "string" ? item : item.loc || item.url || item.path);
      if (p) set.add(p.endsWith("/") || p.includes("?") ? p : `${p}/`);
    }
  }
  // system / listing routes
  for (const p of [
    "/",
    "/blog/",
    "/blog/page/2/",
    "/insights/",
    "/search/",
    "/search/?s=eor",
    "/contact/",
    "/press/",
    "/404-test-missing-page-xyz/",
  ]) {
    set.add(p);
  }
  // categories / tags / authors from data
  try {
    const cats = JSON.parse(fs.readFileSync("src/data/categories.json", "utf8"));
    const arr = Array.isArray(cats) ? cats : cats.categories || [];
    for (const c of arr.slice(0, 30)) {
      const slug = c.slug || c.name;
      if (slug) set.add(`/category/${slug}/`);
    }
  } catch {}
  try {
    const tags = JSON.parse(fs.readFileSync("src/data/tags.json", "utf8"));
    const arr = Array.isArray(tags) ? tags : tags.tags || [];
    for (const t of arr.slice(0, 20)) {
      const slug = t.slug || t.name;
      if (slug) set.add(`/tag/${slug}/`);
    }
  } catch {}
  return [...set].sort();
}

async function httpProbe(paths) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const idx = i++;
      const p = paths[idx];
      const url = `${BASE}${p}`;
      try {
        const res = await fetch(url, {
          redirect: "manual",
          headers: { Accept: "text/html" },
        });
        const loc = res.headers.get("location");
        let finalStatus = res.status;
        let finalUrl = url;
        if (res.status >= 300 && res.status < 400 && loc) {
          const abs = loc.startsWith("http") ? loc : new URL(loc, BASE).href;
          const r2 = await fetch(abs, { redirect: "follow", headers: { Accept: "text/html" } });
          finalStatus = r2.status;
          finalUrl = r2.url;
        }
        const isHtml = (res.headers.get("content-type") || "").includes("text/html") || finalStatus === 404;
        results[idx] = {
          path: p,
          status: res.status,
          finalStatus,
          redirect: loc || null,
          finalUrl,
          ok: finalStatus >= 200 && finalStatus < 400,
        };
      } catch (e) {
        results[idx] = { path: p, status: 0, finalStatus: 0, ok: false, error: String(e.message || e) };
      }
      if ((idx + 1) % 50 === 0 || idx === paths.length - 1) {
        process.stdout.write(`\rhttp probe ${idx + 1}/${paths.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY * 3, 12) }, () => worker()));
  process.stdout.write("\n");
  return results;
}

async function browserAudit(paths, browser) {
  const report = [];
  let i = 0;
  async function worker() {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    while (i < paths.length) {
      const idx = i++;
      const p = paths[idx];
      const entry = {
        path: p,
        status: null,
        title: null,
        metaDescription: null,
        canonical: null,
        h1Count: 0,
        forms: 0,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        brokenImages: 0,
        overflowX: false,
        hasHeader: false,
        hasFooter: false,
        emptyMain: false,
        issues: [],
      };
      const onConsole = (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // ignore noisy third-party / expected
          if (/favicon|gtm|googletagmanager|google-analytics|doubleclick|facebook|linkedin/i.test(text)) return;
          entry.consoleErrors.push(text.slice(0, 300));
        }
      };
      const onPageError = (err) => entry.pageErrors.push(String(err).slice(0, 300));
      const onRequestFailed = (req) => {
        const u = req.url();
        if (/gtm|googletagmanager|google-analytics|doubleclick|facebook|hotjar|clarity/i.test(u)) return;
        entry.failedRequests.push({ url: u.slice(0, 200), error: req.failure()?.errorText || "failed" });
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      page.on("requestfailed", onRequestFailed);
      try {
        const res = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        entry.status = res?.status() ?? 0;
        await page.waitForTimeout(800);
        const probe = await page.evaluate(() => {
          const main =
            document.querySelector("#page-content, main, .l-main, .elementor") || document.body;
          const text = (main?.innerText || "").replace(/\s+/g, " ").trim();
          const imgs = [...document.images].filter(
            (img) => img.complete && img.naturalWidth === 0 && !!(img.currentSrc || img.src),
          );
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          return {
            title: document.title || "",
            metaDescription: document.querySelector('meta[name="description"]')?.content || "",
            canonical: document.querySelector('link[rel="canonical"]')?.href || "",
            h1Count: document.querySelectorAll("h1").length,
            forms: document.querySelectorAll("form.wpcf7-form, form[data-status], .wpcf7 form, form").length,
            brokenImages: imgs.length,
            brokenImageSrcs: imgs.slice(0, 5).map((i) => i.currentSrc || i.src),
            overflowX: docW > winW + 2,
            docW,
            winW,
            hasHeader: !!(document.querySelector("#page-header, .l-header, .mbs-site-header, .cr-site-header, header")),
            hasFooter: !!(document.querySelector("#page-footer, .l-footer, footer")),
            emptyMain: text.length < 40,
            textLen: text.length,
            sectionCount: document.querySelectorAll("section, .elementor-section, .l-section").length,
          };
        });
        Object.assign(entry, probe);
        if (!entry.status || entry.status >= 400) entry.issues.push(`HTTP ${entry.status}`);
        if (!entry.title) entry.issues.push("missing title");
        if (p !== "/404-test-missing-page-xyz/" && !entry.metaDescription) entry.issues.push("missing meta description");
        if (!entry.canonical) entry.issues.push("missing canonical");
        if (entry.h1Count === 0 && entry.status === 200) entry.issues.push("no h1");
        if (entry.h1Count > 2) entry.issues.push(`multiple h1 (${entry.h1Count})`);
        if (entry.emptyMain && entry.status === 200) entry.issues.push("empty/near-empty main content");
        if (!entry.hasHeader && entry.status === 200) entry.issues.push("missing header");
        if (!entry.hasFooter && entry.status === 200) entry.issues.push("missing footer");
        if (entry.brokenImages > 0) entry.issues.push(`broken images: ${entry.brokenImages}`);
        if (entry.overflowX) entry.issues.push(`horizontal overflow (${entry.docW}>${entry.winW})`);
        if (entry.consoleErrors.length) entry.issues.push(`console errors: ${entry.consoleErrors.length}`);
        if (entry.pageErrors.length) entry.issues.push(`page errors: ${entry.pageErrors.length}`);
        if (entry.failedRequests.length) entry.issues.push(`failed requests: ${entry.failedRequests.length}`);
      } catch (e) {
        entry.issues.push(`goto failed: ${String(e.message || e).slice(0, 200)}`);
      }
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      report[idx] = entry;
      if ((idx + 1) % 20 === 0 || idx === paths.length - 1) {
        process.stdout.write(`\rbrowser audit ${idx + 1}/${paths.length}`);
      }
    }
    await context.close();
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, 4) }, () => worker()));
  process.stdout.write("\n");
  return report;
}

async function responsiveAudit(browser) {
  const results = [];
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const p of RESPONSIVE_PATHS) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const entry = { path: p, viewport: vp.name, issues: [] };
      try {
        await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(600);
        const probe = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const navControl = document.querySelector(".w-nav-control, .w-nav-icon");
          const navVisible = navControl ? getComputedStyle(navControl).display !== "none" : false;
          const forms = [...document.querySelectorAll("form")].map((f) => {
            const r = f.getBoundingClientRect();
            return { w: Math.round(r.width), overflow: r.width > window.innerWidth + 4 };
          });
          return {
            overflowX: docW > winW + 2,
            docW,
            winW,
            navVisible,
            formOverflow: forms.some((f) => f.overflow),
            forms,
          };
        });
        if (probe.overflowX) entry.issues.push(`overflow ${probe.docW}>${probe.winW}`);
        if (probe.formOverflow) entry.issues.push("form wider than viewport");
        if (vp.width <= 768 && !probe.navVisible) {
          // many themes keep hamburger always in DOM; only flag if control missing entirely
        }
        Object.assign(entry, probe);
      } catch (e) {
        entry.issues.push(String(e.message || e).slice(0, 160));
      }
      results.push(entry);
    }
    process.stdout.write(`\rresponsive ${p}`);
  }
  process.stdout.write("\n");
  await context.close();
  return results;
}

async function interactiveAudit(browser) {
  const results = { megaMenu: null, mobileMenu: null, accordion: null, loadMore: null, forms: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Mega menu exclusivity (HR vs Visa)
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1000);
    const hr = page.locator('#menu-item-21366 > a, a.w-nav-anchor:has-text("HR Services")').first();
    const visa = page.locator('a.w-nav-anchor:has-text("Visa"), li.menu-item-has-children > a:has-text("Visa")').first();
    await hr.hover({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const hrOpen = await page.evaluate(() => {
      const li = document.querySelector("#menu-item-21366");
      return !!(li && (li.classList.contains("opened") || li.querySelector(".w-nav-list.level_2")));
    });
    results.megaMenu = { hrHoverOk: hrOpen, issues: [] };
    if (!hrOpen) results.megaMenu.issues.push("HR mega menu did not open on hover");
  } catch (e) {
    results.megaMenu = { issues: [String(e.message || e)] };
  }

  // Mobile menu
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(800);
    const control = page.locator(".ush_menu_2 .w-nav-control, #page-header .w-nav-control").first();
    await control.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const open = await page.evaluate(() => {
      const nav = document.querySelector(".ush_menu_2, .w-nav");
      return !!(nav && (nav.classList.contains("opened") || document.body.classList.contains("header-show") || document.querySelector(".w-nav.type_mobile.opened, .w-nav.opened")));
    });
    results.mobileMenu = { opened: open, issues: open ? [] : ["mobile menu click did not open"] };
  } catch (e) {
    results.mobileMenu = { issues: [String(e.message || e)] };
  }

  // Accordion / FAQ on a content page
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/employer-of-record/united-arab-emirates/`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1000);
    const accordion = page.locator(".w-tabs-section-header, .elementor-tab-title, .accordion-toggle, .w-tabs-item-title").first();
    if (await accordion.count()) {
      await accordion.click({ timeout: 5000 });
      await page.waitForTimeout(400);
      results.accordion = { clicked: true, issues: [] };
    } else {
      results.accordion = { clicked: false, issues: ["no accordion found on EOR UAE page"] };
    }
  } catch (e) {
    results.accordion = { issues: [String(e.message || e)] };
  }

  // Insights Load More
  try {
    await page.goto(`${BASE}/insights/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    const before = await page.locator(".w-grid-item, article, .post_image").count();
    const btn = page.locator(".g-loadmore a, .g-loadmore, a.us_ajax_load").first();
    if (await btn.count()) {
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      const after = await page.locator(".w-grid-item, article, .post_image").count();
      results.loadMore = {
        before,
        after,
        issues: after > before ? [] : [`load more did not increase items (${before}→${after})`],
      };
    } else {
      results.loadMore = { issues: ["load more button not found"] };
    }
  } catch (e) {
    results.loadMore = { issues: [String(e.message || e)] };
  }

  // Form validation + submit on contact + newsletter + home
  const formPages = [
    { path: "/contact/", label: "contact", fill: true, submit: true },
    { path: "/insights/", label: "newsletter", fill: "newsletter", submit: true },
    { path: "/", label: "home-cta-form", fill: true, submit: false },
  ];
  for (const fp of formPages) {
    const fr = { label: fp.label, path: fp.path, issues: [] };
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}${fp.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(1000);
      const form = page.locator("form.wpcf7-form, .wpcf7 form, form").first();
      if (!(await form.count())) {
        fr.issues.push("no form found");
        results.forms.push(fr);
        continue;
      }
      // empty submit → validation
      const submitBtn = form.locator('input[type="submit"], button[type="submit"]').first();
      if (await submitBtn.count()) {
        await submitBtn.click({ timeout: 5000 });
        await page.waitForTimeout(700);
        const validation = await page.evaluate(() => {
          const tip = document.querySelector(".wpcf7-not-valid-tip, .wpcf7-response-output, .field-error, .error");
          const invalid = document.querySelectorAll(".wpcf7-not-valid, :invalid").length;
          return { tip: tip?.textContent?.trim()?.slice(0, 120) || "", invalid };
        });
        fr.validationOnEmpty = validation;
        if (!validation.tip && validation.invalid === 0 && fp.fill !== "newsletter") {
          fr.issues.push("empty submit produced no visible validation");
        }
      }
      if (fp.fill === "newsletter") {
        const email = form.locator('input[type="email"], input[name*="email" i]').first();
        await email.fill(`qa-newsletter-${Date.now()}@example.com`);
        // ensure first name not required falsely
        await submitBtn.click();
        await page.waitForTimeout(2500);
        const resp = await page.evaluate(() => {
          const out = document.querySelector(".wpcf7-response-output, .wpcf7-mail-sent-ok, [data-status]");
          return {
            text: out?.textContent?.trim()?.slice(0, 200) || "",
            status: document.querySelector("form.wpcf7-form")?.getAttribute("data-status") || "",
            tips: [...document.querySelectorAll(".wpcf7-not-valid-tip")].map((t) => t.textContent.trim()),
          };
        });
        fr.submitResult = resp;
        if (/first name/i.test(resp.tips.join(" "))) {
          fr.issues.push("newsletter incorrectly requires first name");
        }
      } else if (fp.fill === true && fp.submit) {
        await form.locator('input[name*="your-name" i], input[name="name"], input[placeholder*="Name" i]').first().fill("QA Full Audit").catch(() => {});
        await form.locator('input[type="email"], input[name*="email" i]').first().fill(`qa-audit-${Date.now()}@example.com`).catch(() => {});
        await form.locator('input[type="tel"], input[name*="phone" i], input[name*="tel" i]').first().fill("+971501234567").catch(() => {});
        await form.locator("textarea").first().fill("Automated E2E QA form submission — please ignore.").catch(() => {});
        // intercept contact API
        const [response] = await Promise.all([
          page.waitForResponse((r) => r.url().includes("/api/contact"), { timeout: 15000 }).catch(() => null),
          submitBtn.click(),
        ]);
        await page.waitForTimeout(1500);
        if (response) {
          fr.apiStatus = response.status();
          try {
            fr.apiBody = await response.json();
          } catch {
            fr.apiBody = await response.text();
          }
          if (response.status() >= 400) fr.issues.push(`API status ${response.status()}`);
        } else {
          const ui = await page.evaluate(() => ({
            status: document.querySelector("form.wpcf7-form")?.getAttribute("data-status") || "",
            out: document.querySelector(".wpcf7-response-output")?.textContent?.trim()?.slice(0, 200) || "",
          }));
          fr.ui = ui;
          if (!/sent|ok|thank|success/i.test(`${ui.status} ${ui.out}`)) {
            fr.issues.push("no API response and no success UI");
          }
        }
      }
    } catch (e) {
      fr.issues.push(String(e.message || e).slice(0, 200));
    }
    results.forms.push(fr);
  }

  await context.close();
  return results;
}

async function liveParitySpotCheck(browser) {
  const paths = ["/", "/contact/", "/employer-of-record/", "/insights/", "/hr-services/"];
  const out = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const live = await context.newPage();
  const local = await context.newPage();
  for (const p of paths) {
    const entry = { path: p, issues: [] };
    try {
      await Promise.all([
        live.goto(`${LIVE}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 }),
        local.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 45000 }),
      ]);
      await Promise.all([live.waitForTimeout(1500), local.waitForTimeout(1500)]);
      const probe = async (page) =>
        page.evaluate(() => ({
          title: document.title,
          h1: document.querySelector("h1")?.textContent?.trim()?.slice(0, 120) || "",
          sections: document.querySelectorAll("section, .l-section, .elementor-top-section").length,
          forms: document.querySelectorAll("form").length,
          imgs: document.images.length,
        }));
      const L = await probe(live);
      const A = await probe(local);
      entry.live = L;
      entry.local = A;
      if (L.h1 && A.h1 && L.h1 !== A.h1) entry.issues.push(`h1 mismatch live="${L.h1}" local="${A.h1}"`);
      if (Math.abs(L.sections - A.sections) > 3) entry.issues.push(`section count live=${L.sections} local=${A.sections}`);
      if (L.forms > 0 && A.forms === 0) entry.issues.push("forms missing locally");
    } catch (e) {
      entry.issues.push(String(e.message || e).slice(0, 200));
    }
    out.push(entry);
    process.stdout.write(`\rparity ${p}`);
  }
  process.stdout.write("\n");
  await context.close();
  return out;
}

function summarize(httpResults, browserResults, responsive, interactive, parity) {
  const httpFail = httpResults.filter((r) => !r.ok && r.path !== "/404-test-missing-page-xyz/");
  const http404 = httpResults.filter((r) => r.finalStatus === 404 && r.path !== "/404-test-missing-page-xyz/");
  const withIssues = browserResults.filter((r) => r.issues?.length);
  const byIssue = {};
  for (const r of withIssues) {
    for (const issue of r.issues) {
      const key = issue.replace(/:.*/, (m) => m).split(":")[0].slice(0, 60);
      byIssue[key] = (byIssue[key] || 0) + 1;
    }
  }
  return {
    totals: {
      paths: httpResults.length,
      httpOk: httpResults.filter((r) => r.ok).length,
      httpFail: httpFail.length,
      http404: http404.length,
      browserAudited: browserResults.length,
      browserWithIssues: withIssues.length,
      responsiveChecks: responsive.length,
      responsiveWithIssues: responsive.filter((r) => r.issues.length).length,
    },
    issueHistogram: byIssue,
    httpFailures: httpFail.slice(0, 100),
    worstBrowser: withIssues
      .slice()
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 50)
      .map((r) => ({ path: r.path, status: r.status, issues: r.issues, failedRequests: r.failedRequests?.slice(0, 5) })),
    responsiveIssues: responsive.filter((r) => r.issues.length),
    interactive,
    parity,
  };
}

const allPaths = loadAllPaths();
console.log(`Loaded ${allPaths.length} paths from sitemap + system routes`);
fs.writeFileSync(path.join(OUT_DIR, "paths.json"), JSON.stringify(allPaths, null, 2));

console.log("Phase 1: HTTP status probe (all paths)...");
const httpResults = await httpProbe(allPaths);
fs.writeFileSync(path.join(OUT_DIR, "http-results.json"), JSON.stringify(httpResults, null, 2));

const okHtmlPaths = httpResults
  .filter((r) => r.ok && r.finalStatus === 200)
  .map((r) => r.path);
// Prefer full crawl; if huge, still do all but browser is slower — run all
console.log(`Phase 2: Browser audit (${okHtmlPaths.length} OK paths)...`);
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
});
const browserResults = await browserAudit(okHtmlPaths, browser);
fs.writeFileSync(path.join(OUT_DIR, "browser-results.json"), JSON.stringify(browserResults, null, 2));

console.log("Phase 3: Responsive audit (key pages × viewports)...");
const responsive = await responsiveAudit(browser);
fs.writeFileSync(path.join(OUT_DIR, "responsive.json"), JSON.stringify(responsive, null, 2));

console.log("Phase 4: Interactive + forms...");
const interactive = await interactiveAudit(browser);
fs.writeFileSync(path.join(OUT_DIR, "interactive.json"), JSON.stringify(interactive, null, 2));

console.log("Phase 5: Live parity spot-check...");
let parity = [];
try {
  parity = await liveParitySpotCheck(browser);
} catch (e) {
  parity = [{ issues: [`parity skipped: ${e.message}`] }];
}
fs.writeFileSync(path.join(OUT_DIR, "parity.json"), JSON.stringify(parity, null, 2));

await browser.close();

const summary = summarize(httpResults, browserResults, responsive, interactive, parity);
fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));

console.log("\n=== QA SUMMARY ===");
console.log(JSON.stringify(summary.totals, null, 2));
console.log("Issue histogram:", summary.issueHistogram);
console.log("HTTP failures:", summary.httpFailures.length);
console.log("Responsive issues:", summary.responsiveIssues.length);
console.log("Interactive:", JSON.stringify(summary.interactive, null, 2).slice(0, 2000));
console.log(`Full report: ${OUT_DIR}/summary.json`);
