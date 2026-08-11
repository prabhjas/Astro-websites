#!/usr/bin/env node
/**
 * Compare live vs local RAAD /blog/ for diagnosis.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const LIVE = "https://raadrecruitment.ae";
const LOCAL = "http://127.0.0.1:5113";
fs.mkdirSync("scripts/_fix-shots", { recursive: true });

const browser = await chromium.launch({ headless: true });

async function snapBlog(origin, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const assetFails = [];
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && /\.(css|js|png|jpe?g|webp|woff2?|svg)(\?|$)/i.test(u)) {
      assetFails.push({ status: res.status(), url: u.replace(origin, "") });
    }
  });

  await page.goto(`${origin}/blog/`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    const grids = [...document.querySelectorAll(".ecs-posts.elementor-posts-container, .elementor-posts-container")];
    const grid = grids[grids.length - 1] || null;
    const articles = grid ? [...grid.querySelectorAll("article.elementor-post, article")] : [];
    const first = articles[0] || null;
    const nav =
      document.querySelector(".ecs-load-more-button, [data-sp-blog-load-more], .elementor-pagination") || null;
    const sticky = document.querySelector(".prabhjas, .prabhjas1");

    function meas(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const title = el.querySelector("h2, h3, .elementor-heading-title, .elementor-post__title");
      const img = el.querySelector("img");
      const excerpt = el.querySelector(".elementor-widget-theme-post-excerpt, .elementor-post__excerpt, p");
      const meta = el.querySelector(".elementor-post-info, .elementor-post__meta-data");
      const btn = el.querySelector("a.elementor-button, .elementor-post__read-more");
      const loop = el.querySelector("[data-elementor-id], .elementor");
      const cs = (n) => (n ? getComputedStyle(n) : null);
      const tcs = cs(title);
      const ics = img ? cs(img) : null;
      return {
        id: el.id,
        className: String(el.className).slice(0, 220),
        loopId: loop?.getAttribute?.("data-elementor-id") || (String(loop?.className || "").match(/elementor-(\d+)/) || [])[1] || null,
        loopClass: String(loop?.className || "").slice(0, 160),
        w: Math.round(r.width),
        h: Math.round(r.height),
        titleText: (title?.textContent || "").trim().slice(0, 80),
        titleFs: tcs?.fontSize,
        titleFw: tcs?.fontWeight,
        titleFf: tcs?.fontFamily?.split(",")[0]?.replace(/"/g, ""),
        titleLh: tcs?.lineHeight,
        titleColor: tcs?.color,
        imgSrc: img?.getAttribute("src")?.slice(0, 120) || null,
        imgW: img ? Math.round(img.getBoundingClientRect().width) : null,
        imgH: img ? Math.round(img.getBoundingClientRect().height) : null,
        imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
        excerptFs: excerpt ? cs(excerpt)?.fontSize : null,
        metaText: (meta?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100),
        hasBtn: !!btn,
        btnText: (btn?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        html: el.outerHTML,
        sectionIds: [...el.querySelectorAll("[data-id]")].map((n) => n.getAttribute("data-id")).slice(0, 20),
      };
    }

    const gridCs = grid ? getComputedStyle(grid) : null;
    return {
      title: document.title,
      articleCount: articles.length,
      gridClass: grid ? String(grid.className) : null,
      gridDisplay: gridCs?.display,
      gridTemplateColumns: gridCs?.gridTemplateColumns,
      gridGap: gridCs?.gap || `${gridCs?.rowGap} / ${gridCs?.columnGap}`,
      navHtml: nav?.outerHTML?.slice(0, 500) || null,
      navSettings: nav?.getAttribute("data-settings"),
      gridSettings: grid?.getAttribute("data-settings"),
      stickyPos: sticky ? getComputedStyle(sticky).position : null,
      stickyTop: sticky ? getComputedStyle(sticky).top : null,
      first: first ? { ...meas(first), html: undefined } : null,
      firstHtml: first?.outerHTML || null,
      stylesheets: [...document.styleSheets]
        .map((s) => s.href)
        .filter(Boolean)
        .filter((h) => /861|540|558|posts|ecs|elementor|inter|poppins|google/i.test(h))
        .map((h) => h.replace(location.origin, "")),
    };
  });

  await page.screenshot({ path: `scripts/_fix-shots/cmp-${label}-blog-initial.png`, fullPage: false });

  // Click load more if present
  let afterLoad = null;
  let loadMoreHtml = null;
  const clicked = await page.evaluate(() => {
    const nav = document.querySelector(".ecs-load-more-button, [data-sp-blog-load-more]");
    const btn = nav?.querySelector("a, button");
    if (!btn || !nav) return false;
    btn.click();
    return true;
  });

  if (clicked) {
    await page.waitForTimeout(3500);
    afterLoad = await page.evaluate(() => {
      const grids = [...document.querySelectorAll(".ecs-posts.elementor-posts-container, .elementor-posts-container")];
      const grid = grids[grids.length - 1];
      const articles = [...grid.querySelectorAll("article.elementor-post, article")];
      const last = articles[articles.length - 1];
      const first = articles[0];
      function brief(el) {
        const title = el.querySelector("h2, .elementor-heading-title");
        const loop = el.querySelector("[data-elementor-id], .elementor");
        return {
          id: el.id,
          w: Math.round(el.getBoundingClientRect().width),
          tpl: loop?.getAttribute?.("data-elementor-id") || (String(loop?.className || "").match(/elementor-(\d+)/) || [])[1],
          titleFs: title ? getComputedStyle(title).fontSize : null,
          sectionIds: [...el.querySelectorAll("[data-id]")].map((n) => n.getAttribute("data-id")).slice(0, 15),
          className: String(el.className).slice(0, 180),
        };
      }
      return {
        count: articles.length,
        first: brief(first),
        last: brief(last),
        mid: brief(articles[Math.min(articles.length - 1, 6)]),
        lastHtml: last?.outerHTML || null,
      };
    });
    await page.screenshot({ path: `scripts/_fix-shots/cmp-${label}-blog-after-load.png`, fullPage: false });
  }

  // Try to capture network for ECS/API if local
  await page.close();
  return { info, afterLoad, assetFails: assetFails.slice(0, 30), clicked };
}

const live = await snapBlog(LIVE, "live");
const local = await snapBlog(LOCAL, "local");

// Structural diff helpers
function pick(card) {
  if (!card) return null;
  return {
    loopId: card.loopId,
    sectionIds: card.sectionIds,
    titleFs: card.titleFs,
    titleFw: card.titleFw,
    titleFf: card.titleFf,
    titleLh: card.titleLh,
    imgW: card.imgW,
    imgH: card.imgH,
    w: card.w,
    h: card.h,
    metaText: card.metaText,
    hasBtn: card.hasBtn,
    btnText: card.btnText,
    excerptFs: card.excerptFs,
  };
}

const report = {
  live: {
    count: live.info.articleCount,
    gridClass: live.info.gridClass,
    gridTemplateColumns: live.info.gridTemplateColumns,
    gridGap: live.info.gridGap,
    stylesheets: live.info.stylesheets,
    card: pick(live.info.first),
    navSettings: live.info.navSettings,
    gridSettings: live.info.gridSettings?.slice?.(0, 300),
    afterLoad: live.afterLoad && {
      count: live.afterLoad.count,
      first: live.afterLoad.first,
      mid: live.afterLoad.mid,
      last: live.afterLoad.last,
    },
    assetFails: live.assetFails,
  },
  local: {
    count: local.info.articleCount,
    gridClass: local.info.gridClass,
    gridTemplateColumns: local.info.gridTemplateColumns,
    gridGap: local.info.gridGap,
    stylesheets: local.info.stylesheets,
    card: pick(local.info.first),
    navSettings: local.info.navSettings,
    gridSettings: local.info.gridSettings?.slice?.(0, 300),
    afterLoad: local.afterLoad && {
      count: local.afterLoad.count,
      first: local.afterLoad.first,
      mid: local.afterLoad.mid,
      last: local.afterLoad.last,
    },
    assetFails: local.assetFails,
  },
};

fs.writeFileSync("scripts/_fix-shots/live-card.html", live.info.firstHtml || "");
fs.writeFileSync("scripts/_fix-shots/local-card.html", local.info.firstHtml || "");
if (live.afterLoad?.lastHtml) fs.writeFileSync("scripts/_fix-shots/live-card-loaded.html", live.afterLoad.lastHtml);
if (local.afterLoad?.lastHtml) fs.writeFileSync("scripts/_fix-shots/local-card-loaded.html", local.afterLoad.lastHtml);

// HTML structure normalize for comparison
function normalize(html) {
  return (html || "")
    .replace(/post-\d+/g, "post-ID")
    .replace(/wp-image-\d+/g, "wp-image-ID")
    .replace(/href="[^"]*"/g, 'href="#"')
    .replace(/src="[^"]*"/g, 'src="#"')
    .replace(/srcset="[^"]*"/g, 'srcset="#"')
    .replace(/sizes="[^"]*"/g, 'sizes="#"')
    .replace(/alt="[^"]*"/g, 'alt=""')
    .replace(/datetime="[^"]*"/g, 'datetime=""')
    .replace(/data-cfemail="[^"]*"/g, 'data-cfemail=""')
    .replace(/gravatar\.com\/avatar\/[a-f0-9]+/gi, "gravatar.com/avatar/HASH")
    .replace(/>[^<]{3,}</g, (m) => {
      // keep structural text placeholders
      const inner = m.slice(1, -1).trim();
      if (!inner || inner.length < 3) return m;
      if (/^(Read MORE|Load More|Loading)/i.test(inner)) return m;
      return ">TEXT<";
    })
    .replace(/\s+/g, " ")
    .trim();
}

report.htmlNormEqualInitial = normalize(live.info.firstHtml) === normalize(local.info.firstHtml);
report.htmlNormEqualLoaded =
  normalize(live.afterLoad?.lastHtml) === normalize(local.afterLoad?.lastHtml);
report.liveLoadedVsLiveInitial =
  normalize(live.info.firstHtml) === normalize(live.afterLoad?.lastHtml);
report.localLoadedVsLocalInitial =
  normalize(local.info.firstHtml) === normalize(local.afterLoad?.lastHtml);

// diff section ids
report.sectionIdDiff = {
  liveInitial: live.info.first?.sectionIds,
  localInitial: local.info.first?.sectionIds,
  liveLoaded: live.afterLoad?.last?.sectionIds,
  localLoaded: local.afterLoad?.last?.sectionIds,
};

fs.writeFileSync("scripts/_fix-cmp-blog.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
