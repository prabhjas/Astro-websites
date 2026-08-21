#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

function normalize(html) {
  return (html || "")
    .replace(/\r/g, "")
    .replace(/post-\d+/g, "post-ID")
    .replace(/wp-image-\d+/g, "wp-image-ID")
    .replace(/href="[^"]*"/g, 'href="#"')
    .replace(/srcset="[^"]*"/g, 'srcset="#"')
    .replace(/sizes="[^"]*"/g, 'sizes="#"')
    .replace(/src="[^"]*"/g, 'src="#"')
    .replace(/alt="[^"]*"/g, 'alt=""')
    .replace(/datetime="[^"]*"/g, 'datetime=""')
    .replace(/data-cfemail="[^"]*"/g, 'data-cfemail=""')
    .replace(/fetchpriority="high" /g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function findDiff(a, b, label) {
  const A = normalize(a);
  const B = normalize(b);
  if (A === B) {
    console.log(label + ": EQUAL");
    return;
  }
  let i = 0;
  while (i < A.length && i < B.length && A[i] === B[i]) i++;
  console.log(label + ": differ at", i);
  console.log("A:", JSON.stringify(A.slice(Math.max(0, i - 60), i + 140)));
  console.log("B:", JSON.stringify(B.slice(Math.max(0, i - 60), i + 140)));
}

const live = fs.readFileSync("scripts/_fix-shots/live-card.html", "utf8");
const local = fs.readFileSync("scripts/_fix-shots/local-card.html", "utf8");
const liveL = fs.readFileSync("scripts/_fix-shots/live-card-loaded.html", "utf8");
const localL = fs.readFileSync("scripts/_fix-shots/local-card-loaded.html", "utf8");
findDiff(live, local, "initial live vs local");
findDiff(liveL, localL, "loaded live vs local");
findDiff(live, liveL, "live init vs live loaded");
findDiff(local, localL, "local init vs local loaded");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5113/blog/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(800);

const before = await page.evaluate(() => {
  const arts = [...document.querySelectorAll(".ecs-posts article.elementor-post")];
  return arts.map((a) => ({
    id: a.id,
    href: a.querySelector("a")?.getAttribute("href"),
    title: a.querySelector("h2")?.textContent?.trim().slice(0, 60),
    img: a.querySelector("img")?.getAttribute("src"),
  }));
});

await page.evaluate(() => document.querySelector(".ecs-load-more-button a")?.click());
await page.waitForTimeout(2000);

const after = await page.evaluate(() => {
  const arts = [...document.querySelectorAll(".ecs-posts article.elementor-post")];
  return arts.map((a) => ({
    id: a.id,
    href: a.querySelector("a")?.getAttribute("href"),
    title: a.querySelector("h2")?.textContent?.trim().slice(0, 60),
    img: a.querySelector("img")?.getAttribute("src"),
    imgW: a.querySelector("img")?.getBoundingClientRect().width,
    imgH: a.querySelector("img")?.getBoundingClientRect().height,
    natural: a.querySelector("img") ? `${a.querySelector("img").naturalWidth}x${a.querySelector("img").naturalHeight}` : null,
  }));
});

const beforeHrefs = new Set(before.map((x) => x.href));
const loaded = after.slice(before.length);
const dupes = loaded.filter((x) => beforeHrefs.has(x.href));

console.log(JSON.stringify({ before, loaded, dupeCount: dupes.length, dupes }, null, 2));

// live loaded order after first page
const livePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await livePage.goto("https://raadrecruitment.ae/blog/", { waitUntil: "networkidle", timeout: 120000 });
await livePage.waitForTimeout(1000);
const liveBefore = await livePage.evaluate(() =>
  [...document.querySelectorAll(".ecs-posts article.elementor-post")].map((a) => ({
    id: a.id,
    href: a.querySelector("a")?.getAttribute("href"),
    title: a.querySelector("h2")?.textContent?.trim().slice(0, 60),
    img: a.querySelector("img")?.getAttribute("src"),
  })),
);
await livePage.evaluate(() => document.querySelector(".ecs-load-more-button a")?.click());
await livePage.waitForTimeout(3500);
const liveAfter = await livePage.evaluate(() =>
  [...document.querySelectorAll(".ecs-posts article.elementor-post")].map((a) => ({
    id: a.id,
    href: a.querySelector("a")?.getAttribute("href"),
    title: a.querySelector("h2")?.textContent?.trim().slice(0, 60),
    img: a.querySelector("img")?.getAttribute("src"),
    natural: a.querySelector("img") ? `${a.querySelector("img").naturalWidth}x${a.querySelector("img").naturalHeight}` : null,
  })),
);
console.log(
  JSON.stringify(
    {
      liveBefore,
      liveLoaded: liveAfter.slice(liveBefore.length),
      liveCount: liveAfter.length,
    },
    null,
    2,
  ),
);

await browser.close();
