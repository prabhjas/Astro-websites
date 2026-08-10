#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const base = "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/", { waitUntil: "networkidle", timeout: 60000 });

const before = await page.evaluate(() => {
  const target = document.querySelector('img[src*="Oil-and-gas"]');
  if (!target) return { missing: true };
  const chain = [];
  let el = target;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName,
      id: el.id,
      cls: (el.className?.toString?.() || "").slice(0, 100),
      display: cs.display,
      visibility: cs.visibility,
      overflow: cs.overflow,
      contentVisibility: cs.contentVisibility,
      opacity: cs.opacity,
      transform: cs.transform === "none" ? "none" : cs.transform.slice(0, 60),
      w: el.clientWidth,
      h: el.clientHeight,
    });
    el = el.parentElement;
  }
  return {
    loading: target.loading,
    complete: target.complete,
    nw: target.naturalWidth,
    rect: target.getBoundingClientRect(),
    chain,
  };
});

// Force eager + reload src
const afterForce = await page.evaluate(async () => {
  const imgs = [...document.querySelectorAll("img")];
  for (const img of imgs) {
    img.loading = "eager";
    if (img.src) {
      const s = img.src;
      img.removeAttribute("loading");
      img.src = "";
      img.src = s;
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
  return imgs
    .filter((i) => /Oil-and-gas|Banking-Finance|Male-01|IT-Technology/.test(i.src))
    .map((i) => ({
      src: i.getAttribute("src"),
      nw: i.naturalWidth,
      complete: i.complete,
      currentSrc: i.currentSrc,
    }));
});

// Scroll to oil image parent and screenshot
await page.evaluate(() => {
  const t = document.querySelector('img[src*="Oil-and-gas"]');
  t?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/_industries-section.png" });

// What does live home show for industries / avatars / services webps?
const liveHtml = await (await fetch("https://raadrecruitment.ae/")).text();
const keys = [
  "Oil-and-gas",
  "Male-01",
  "Staff-Outsourcing",
  "emirati-talent",
  "services-we-offer",
  "Recruitment",
  "2025/10",
];
const liveHits = {};
for (const k of keys) {
  const re = new RegExp(`.{0,60}${k}.{0,80}`, "gi");
  liveHits[k] = [...liveHtml.matchAll(re)].slice(0, 3).map((m) => m[0].replace(/\s+/g, " "));
}

fs.writeFileSync(
  "scripts/_lazy-debug.json",
  JSON.stringify({ before, afterForce, liveHits }, null, 2),
);
console.log(JSON.stringify({ beforeSummary: { nw: before.nw, complete: before.complete, loading: before.loading, chain0: before.chain?.[0], chain1: before.chain?.[1], chain2: before.chain?.[2], chain3: before.chain?.[3], chain4: before.chain?.[4] }, afterForce, liveHitKeys: Object.fromEntries(Object.entries(liveHits).map(([k,v])=>[k,v.length])) }, null, 2));
await browser.close();
