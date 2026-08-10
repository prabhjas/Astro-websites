#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

fs.mkdirSync("scripts/_fix-shots", { recursive: true });
const LOCAL = "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });

function summarize(state) {
  const m = state.metrics;
  const widths = [...new Set(m.map((x) => x.w))];
  const tpls = [...new Set(m.map((x) => x.tpl))];
  const fonts = [...new Set(m.map((x) => x.titleFs))];
  return {
    count: state.count,
    widthRange: [Math.min(...m.map((x) => x.w)), Math.max(...m.map((x) => x.w))],
    uniqueWidths: widths,
    templates: tpls,
    titleFonts: fonts,
    badTplCount: m.filter((x) => x.tpl !== "861").length,
    allHaveDate: m.every((x) => x.hasDate),
    allHaveAuthor: m.every((x) => x.hasAuthor),
    firstLastTitle: [m[0]?.titleFs, m[m.length - 1]?.titleFs],
    sticky: state.sticky,
    btnHidden: state.btnHidden,
  };
}

async function runVp(name, vp) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`${LOCAL}/blog/`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  const report = { name, clicks: [] };

  async function measure() {
    return page.evaluate(() => {
      const grids = [...document.querySelectorAll(".ecs-posts.elementor-posts-container")];
      const grid = grids[grids.length - 1];
      const arts = [...grid.querySelectorAll("article.elementor-post")];
      const metrics = arts.map((el) => {
        const title = el.querySelector(".elementor-heading-title, h2");
        const img = el.querySelector("img");
        const r = el.getBoundingClientRect();
        const loop = el.querySelector("[data-elementor-id]");
        return {
          id: el.id,
          w: Math.round(r.width),
          tpl: loop?.getAttribute("data-elementor-id"),
          titleFs: title ? getComputedStyle(title).fontSize : null,
          imgW: img ? Math.round(img.getBoundingClientRect().width) : 0,
          hasDate: !!el.querySelector("time, .elementor-post-info__item--type-date"),
          hasAuthor: !!el.querySelector(".elementor-post-info__item--type-author"),
        };
      });
      const stickyEl = document.querySelector(".prabhjas");
      const sticky = stickyEl
        ? {
            pos: getComputedStyle(stickyEl).position,
            top: Math.round(stickyEl.getBoundingClientRect().top),
          }
        : null;
      const btn = document.querySelector(".ecs-load-more-button");
      return {
        count: arts.length,
        metrics,
        sticky,
        btnHidden: !btn || btn.hidden || getComputedStyle(btn).display === "none",
      };
    });
  }

  report.initial = summarize(await measure());

  for (let c = 1; c <= 3; c++) {
    const visible = await page.evaluate(() => {
      const btn = document.querySelector(".ecs-load-more-button a, .ecs-load-more-button button");
      const nav = document.querySelector(".ecs-load-more-button");
      if (!btn || !nav || nav.hidden || getComputedStyle(nav).display === "none") return false;
      btn.click();
      return true;
    });
    if (!visible) {
      report.clicks.push({ c, stopped: true });
      break;
    }
    await page.waitForTimeout(1800);
    report.clicks.push({ c, ...summarize(await measure()) });
    await page.screenshot({ path: `scripts/_fix-shots/load-more-${name}-click${c}.png` });
  }

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(400);
  report.afterScrollSticky = await page.evaluate(() => {
    const el = document.querySelector(".prabhjas");
    if (!el) return null;
    return { pos: getComputedStyle(el).position, top: Math.round(el.getBoundingClientRect().top) };
  });

  await page.close();
  return report;
}

const out = {};
for (const [n, vp] of [
  ["desktop", { width: 1440, height: 900 }],
  ["tablet", { width: 768, height: 1024 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  out[n] = await runVp(n, vp);
}

const home = await (await fetch(`${LOCAL}/blog/`)).text();
const shown = [...home.matchAll(/article id="post-(\d+)"/g)].map((m) => Number(m[1]));
const api = await (
  await fetch(`${LOCAL}/api/blog/load-more/?perPage=6&exclude=${shown.slice(0, 6).join(",")}`)
).json();
out.api = {
  ok: api.ok,
  hasMore: api.hasMore,
  ids: api.ids,
  uses861: (api.html || "").includes("elementor-861"),
  uses540: (api.html || "").includes("elementor-540"),
  overlap: (api.ids || []).filter((id) => shown.slice(0, 6).includes(id)),
};

fs.writeFileSync("scripts/_fix-verify-load-more.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
