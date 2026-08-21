#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const LOCAL = "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });

async function check(name, vp) {
  const page = await browser.newPage({ viewport: vp });
  const broken = [];
  page.on("response", (res) => {
    const u = res.url();
    if (/wp-content\/uploads|blog-placeholder/i.test(u) && res.status() >= 400) {
      broken.push({ status: res.status(), url: u.replace(LOCAL, "") });
    }
  });

  await page.goto(`${LOCAL}/blog/`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);

  // click load more until some former-missing posts appear or 5 times
  for (let i = 0; i < 5; i++) {
    const clicked = await page.evaluate(() => {
      const nav = document.querySelector(".ecs-load-more-button");
      const btn = nav?.querySelector("a,button");
      if (!btn || !nav || nav.hidden || getComputedStyle(nav).display === "none") return false;
      btn.click();
      return true;
    });
    if (!clicked) break;
    await page.waitForTimeout(1600);
  }

  const stats = await page.evaluate(() => {
    const arts = [...document.querySelectorAll(".ecs-posts article.elementor-post")];
    const rows = arts.map((a) => {
      const img = a.querySelector(".elementor-widget-theme-post-featured-image img, img.attachment-full, img");
      const title = a.querySelector(".elementor-heading-title")?.textContent?.trim().slice(0, 50);
      const href = a.querySelector(".elementor-heading-title a")?.getAttribute("href") || "";
      const r = img?.getBoundingClientRect();
      const src = img?.getAttribute("src") || "";
      return {
        title,
        href,
        src,
        isPlaceholder: /blog-placeholder/i.test(src),
        external: /^https?:\/\//i.test(src) && !/127\.0\.0\.1/.test(src),
        w: r ? Math.round(r.width) : 0,
        h: r ? Math.round(r.height) : 0,
        natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
        ratio: r && r.height ? +(r.width / r.height).toFixed(2) : null,
      };
    });
    return {
      count: arts.length,
      withImg: rows.filter((r) => r.src).length,
      placeholders: rows.filter((r) => r.isPlaceholder),
      external: rows.filter((r) => r.external),
      zeroSize: rows.filter((r) => r.src && (r.w < 50 || r.h < 50 || r.natural === "0x0")),
      widths: [...new Set(rows.map((r) => r.w))],
      sample: rows.slice(0, 3).concat(rows.slice(-3)),
    };
  });

  // check formerly missing paths if present
  const targets = [
    "/differences-between-recruitment-and-selection-process/",
    "/benefits-of-medical-recruitment-agencies-in-dubai/",
    "/emiratisation-in-tourism-and-hospitality/",
    "/salary-certificate-uae/",
    "/medical-certificate-for-sick-leave-in-uae/",
    "/benefits-of-outsourcing-digital-marketing/",
    "/role-of-emiratisation-in-uae/",
    "/tips-for-hiring-the-right-talent/",
    "/types-of-leaves-in-uae/",
    "/limited-contract-resignation-in-uae/",
    "/outsourcing-for-startup/",
  ];
  const targetStatus = await page.evaluate((targets) => {
    return targets.map((t) => {
      const a = [...document.querySelectorAll(".ecs-posts article.elementor-post")].find((el) => {
        const href = el.querySelector(".elementor-heading-title a")?.getAttribute("href") || "";
        return href.includes(t.replace(/\/$/, ""));
      });
      if (!a) return { path: t, onPage: false };
      const img = a.querySelector(".elementor-widget-theme-post-featured-image img, img.attachment-full, img");
      return {
        path: t,
        onPage: true,
        src: img?.getAttribute("src") || null,
        isPlaceholder: /blog-placeholder/i.test(img?.getAttribute("src") || ""),
        natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      };
    });
  }, targets);

  await page.close();
  return { name, stats, broken, targetStatus };
}

const out = {
  desktop: await check("desktop", { width: 1440, height: 900 }),
  tablet: await check("tablet", { width: 768, height: 1024 }),
  mobile: await check("mobile", { width: 390, height: 844 }),
};

// API sample for formerly missing
const api = await (await fetch(`${LOCAL}/api/blog/load-more/?perPage=24&excludePaths=/employers-end-of-service-benefits-in-the-uae/,/contract-staffing-company-in-uae/,/headhunters-vs-recruitment-agencies-explained/,/temporary-work-permit-uae/,/recruitment-agencies-in-uae/,/emiratisation-law-uae-a-complete-guide/,/what-is-wps-in-the-uae/`)).json();
out.apiHasPlaceholder = (api.html || "").includes("blog-placeholder");
out.apiSampleImgs = [...(api.html || "").matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter((s) => /uploads|placeholder/.test(s)).slice(0, 12);

fs.writeFileSync("scripts/_fix-verify-thumbnails.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
