import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const out =
  "C:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/ngmanpower.com/.verify-screens/about-us";
mkdirSync(out, { recursive: true });

async function capture(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const broken = [];
  page.on("response", async (res) => {
    const u = res.url();
    if (!/wp-content\/uploads|\.jpg|\.png|\.webp|\.svg|video|youtube/i.test(u)) return;
    if (res.status() >= 400) broken.push({ status: res.status(), u });
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${out}/${label}-full.png`, fullPage: true });
  await page.screenshot({ path: `${out}/${label}-top.png` });

  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("main img, .l-main img, .l-canvas img")].map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src,
        natural: { w: img.naturalWidth, h: img.naturalHeight },
        display: { w: Math.round(r.width), h: Math.round(r.height) },
        alt: img.alt || "",
        complete: img.complete,
      };
    });
    const bgs = [...document.querySelectorAll(".l-section, .vc_column-inner, .wpb_column")].map((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return null;
      const r = el.getBoundingClientRect();
      return {
        cls: el.className.toString().slice(0, 120),
        bg: bg.slice(0, 200),
        h: Math.round(r.height),
        w: Math.round(r.width),
      };
    }).filter(Boolean).slice(0, 30);
    const heroes = [...document.querySelectorAll(".l-section")].slice(0, 8).map((el, i) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        i,
        cls: el.className.toString().slice(0, 140),
        bg: cs.backgroundImage.slice(0, 180),
        bgColor: cs.backgroundColor,
        h: Math.round(r.height),
      };
    });
    return { imgs, bgs, heroes, title: document.title };
  });

  writeFileSync(`${out}/${label}-info.json`, JSON.stringify({ broken, info }, null, 2));
  console.log(label, "broken", broken.length, "imgs", info.imgs.length);
  console.log(JSON.stringify(info.heroes, null, 2));
  console.log("broken sample", broken.slice(0, 20));
  const zeroNat = info.imgs.filter((i) => !i.natural.w);
  console.log("zero natural", zeroNat.slice(0, 15));
  await browser.close();
}

await capture("http://127.0.0.1:5102/about-us/", "local");
await capture("https://ngmanpower.com/about-us/", "live");
