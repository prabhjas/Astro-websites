#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const LOCAL = "http://127.0.0.1:5113";
const LIVE = "https://raadrecruitment.ae";
fs.mkdirSync("scripts/_fix-shots", { recursive: true });

const browser = await chromium.launch({ headless: true });

async function scrape(origin, clicks) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/blog/`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1000);

  async function snapshot(label) {
    return page.evaluate((label) => {
      const grid = [...document.querySelectorAll(".ecs-posts.elementor-posts-container")].pop();
      const arts = [...(grid?.querySelectorAll("article.elementor-post") || [])];
      const sticky = document.querySelector(".prabhjas");
      return {
        label,
        count: arts.length,
        paths: arts.map((a) => {
          const href =
            a.querySelector(".elementor-heading-title a")?.getAttribute("href") ||
            a.querySelector("a")?.getAttribute("href") ||
            "";
          try {
            const u = new URL(href, location.origin);
            let p = u.pathname;
            if (!p.endsWith("/")) p += "/";
            return p;
          } catch {
            return href;
          }
        }),
        templates: [
          ...new Set(
            arts.map(
              (a) =>
                a.querySelector("[data-elementor-id]")?.getAttribute("data-elementor-id") ||
                (String(a.querySelector(".elementor")?.className || "").match(/elementor-(\d+)/) || [])[1],
            ),
          ),
        ],
        titleFonts: [
          ...new Set(
            arts.map((a) => {
              const t = a.querySelector(".elementor-heading-title");
              return t ? getComputedStyle(t).fontSize : null;
            }),
          ),
        ],
        widths: [
          ...new Set(arts.map((a) => Math.round(a.getBoundingClientRect().width))),
        ],
        sticky: sticky
          ? {
              pos: getComputedStyle(sticky).position,
              top: Math.round(sticky.getBoundingClientRect().top),
              cssTop: getComputedStyle(sticky).top,
            }
          : null,
      };
    }, label);
  }

  const out = { initial: await snapshot("initial") };
  for (let i = 1; i <= clicks; i++) {
    const ok = await page.evaluate(() => {
      const nav = document.querySelector(".ecs-load-more-button");
      const btn = nav?.querySelector("a, button");
      if (!btn || !nav || nav.hidden || getComputedStyle(nav).display === "none") return false;
      btn.click();
      return true;
    });
    if (!ok) {
      out[`click${i}`] = { stopped: true };
      break;
    }
    await page.waitForTimeout(2000);
    out[`click${i}`] = await snapshot(`click${i}`);
  }
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(400);
  out.afterScrollSticky = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas");
    if (!el) return null;
    return {
      pos: getComputedStyle(el).position,
      top: Math.round(el.getBoundingClientRect().top),
    };
  });
  await page.screenshot({
    path: `scripts/_fix-shots/blog-fixed-${origin.includes("127.0.0.1") ? "local" : "live"}-final.png`,
  });
  await page.close();
  return out;
}

const localDesk = await scrape(LOCAL, 3);

// responsive local
async function responsive(name, vp) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`${LOCAL}/blog/`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector(".ecs-load-more-button a")?.click());
  await page.waitForTimeout(1800);
  const info = await page.evaluate(() => {
    const arts = [...document.querySelectorAll(".ecs-posts article.elementor-post")];
    const paths = arts.map((a) => {
      const href = a.querySelector(".elementor-heading-title a")?.getAttribute("href") || "";
      try {
        let p = new URL(href, location.origin).pathname;
        if (!p.endsWith("/")) p += "/";
        return p;
      } catch {
        return href;
      }
    });
    const uniq = new Set(paths);
    return {
      count: arts.length,
      uniquePaths: uniq.size,
      dupes: paths.length - uniq.size,
      tpls: [
        ...new Set(
          arts.map((a) => a.querySelector("[data-elementor-id]")?.getAttribute("data-elementor-id")),
        ),
      ],
      titleFs: [
        ...new Set(
          arts.map((a) => getComputedStyle(a.querySelector(".elementor-heading-title")).fontSize),
        ),
      ],
    };
  });
  await page.close();
  return { name, ...info };
}

const liveDesk = await scrape(LIVE, 1);

const report = {
  localDesk,
  liveDesk,
  pathMatchAfterFirstLoad: {
    liveNext: liveDesk.click1?.paths?.slice(liveDesk.initial.paths.length) || [],
    localNext: localDesk.click1?.paths?.slice(localDesk.initial.paths.length) || [],
  },
  localDupesAfter3: (() => {
    const p = localDesk.click3?.paths || localDesk.click2?.paths || [];
    return p.length - new Set(p).size;
  })(),
  responsive: {
    tablet: await responsive("tablet", { width: 768, height: 1024 }),
    mobile: await responsive("mobile", { width: 390, height: 844 }),
  },
};

// refresh test: load more then reload
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${LOCAL}/blog/`, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => document.querySelector(".ecs-load-more-button a")?.click());
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  report.afterRefresh = await page.evaluate(() => ({
    count: document.querySelectorAll(".ecs-posts article.elementor-post").length,
    loadMoreVisible: !!(
      document.querySelector(".ecs-load-more-button") &&
      getComputedStyle(document.querySelector(".ecs-load-more-button")).display !== "none"
    ),
  }));
  await page.close();
}

fs.writeFileSync("scripts/_fix-verify-blog-live-match.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
