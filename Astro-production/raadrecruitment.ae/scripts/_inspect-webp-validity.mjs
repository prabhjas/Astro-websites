#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

function hashFile(p) {
  const buf = fs.readFileSync(p);
  return {
    bytes: buf.length,
    sha1: crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12),
    magic: buf.slice(0, 16).toString("hex"),
    isWebp: buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP",
    isJpeg: buf[0] === 0xff && buf[1] === 0xd8,
    isPng: buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a",
    headAscii: buf.slice(0, 80).toString("utf8").replace(/[^\x20-\x7E]/g, "."),
  };
}

const samples = [
  "public/wp-content/uploads/2025/09/Purpose-and-Vision-Behind-the-Fazaa-Program-visual-selection-1.webp",
  "public/wp-content/uploads/2024/08/Understanding-Employee-Benefits-in-the-UAE-visual-selection-1.webp",
  "public/wp-content/uploads/2024/03/Leave-Emergency-768x432-1.webp",
  "public/wp-content/uploads/2025/09/visual-selection-3-1.webp",
  "public/wp-content/uploads/2024/12/Emiratisation-Fines-in-the-UAE-A-Comprehensive-Guide.webp",
  "public/wp-content/uploads/2025/12/76234.jpg",
];

for (const s of samples) {
  if (!fs.existsSync(s)) {
    console.log("MISSING", s);
    continue;
  }
  console.log(JSON.stringify({ file: s, ...hashFile(s) }));
}

// Browser: click load more and capture img naturalWidth + failed requests
const LOCAL = "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failed = [];
page.on("response", async (res) => {
  const u = res.url();
  if (!/uploads/i.test(u)) return;
  if (res.status() >= 400) failed.push({ status: res.status(), url: u.replace(LOCAL, "") });
  else {
    const ct = res.headers()["content-type"] || "";
    if (!/image\//i.test(ct)) failed.push({ status: res.status(), ct, url: u.replace(LOCAL, "") });
  }
});
await page.goto(`${LOCAL}/blog/`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector(".ecs-load-more-button a")?.click());
await page.waitForTimeout(2500);
const imgs = await page.evaluate(() => {
  const arts = [...document.querySelectorAll(".ecs-posts article.elementor-post")].slice(6); // newly loaded from main grid only roughly
  const all = [...document.querySelectorAll(".ecs-posts.elementor-posts-container")].pop();
  const cards = [...all.querySelectorAll("article.elementor-post")];
  return cards.map((a) => {
    const img = a.querySelector(".elementor-widget-theme-post-featured-image img");
    return {
      title: a.querySelector("h2")?.textContent?.trim().slice(0, 50),
      src: img?.getAttribute("src"),
      complete: img?.complete,
      natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      cw: img ? Math.round(img.clientWidth) : null,
      ch: img ? Math.round(img.clientHeight) : null,
    };
  });
});
console.log("browser imgs", JSON.stringify(imgs, null, 2));
console.log("failed responses", failed);
await page.screenshot({ path: "scripts/_fix-shots/loadmore-imgs.png", fullPage: false });
await browser.close();
