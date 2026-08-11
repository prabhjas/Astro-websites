import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const out =
  "C:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/ngmanpower.com/.verify-screens/about-us";
mkdirSync(out, { recursive: true });

async function dump(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  const data = await page.evaluate(() => {
    const hero = document.querySelector(".us_custom_5d0a241b");
    const hcs = getComputedStyle(hero);
    const video = document.querySelector(".ult-video, .ultv-video");
    const vOuter = document.querySelector(".ultv-video__outer-wrap");
    const thumb = document.querySelector(".ultv-video__thumb");
    const play = document.querySelector(".ultv-video__play-icon");
    const dumpEl = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: el.className.toString().slice(0, 120),
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        maxHeight: cs.maxHeight,
        objectFit: cs.objectFit,
        borderRadius: cs.borderRadius,
        overflow: cs.overflow,
        clipPath: cs.clipPath,
        transform: cs.transform,
        padding: cs.padding,
        margin: cs.margin,
        bg: cs.backgroundImage.slice(0, 120),
        bgColor: cs.backgroundColor,
        rect: {
          w: Math.round(r.width),
          h: Math.round(r.height),
          t: Math.round(r.top + scrollY),
          l: Math.round(r.left),
        },
      };
    };
    // Find height:inherit rules matching first about image
    const img = document.querySelector('img[src*="Rectangle-591"], img[src*="Mission"]');
    const matched = [];
    if (img) {
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          if (!rule.selectorText || !rule.style) continue;
          try {
            if (!img.matches(rule.selectorText)) continue;
          } catch {
            continue;
          }
          const h = rule.style.getPropertyValue("height");
          const mh = rule.style.getPropertyValue("max-height");
          const w = rule.style.getPropertyValue("width");
          if (h || mh || w) {
            matched.push({
              sel: rule.selectorText,
              height: h,
              maxHeight: mh,
              width: w,
              href: sheet.href || "inline",
            });
          }
        }
      }
    }
    return {
      hero: dumpEl(hero),
      heroAfter: {
        clipPath: hcs.clipPath,
        borderRadius: hcs.borderRadius,
        maskImage: hcs.maskImage,
        webkitMask: hcs.webkitMaskImage,
      },
      video: dumpEl(video),
      vOuter: dumpEl(vOuter),
      thumb: dumpEl(thumb),
      play: dumpEl(play),
      roundedWrap: dumpEl(document.querySelector(".us_custom_04570ec2")),
      imgRules: matched.slice(0, 40),
      stylesheets: [...document.styleSheets]
        .map((s) => s.href)
        .filter(Boolean)
        .filter((h) => /video|ult|about|industry|impreza|migration/i.test(h)),
    };
  });
  writeFileSync(`${out}/${label}-video-img.json`, JSON.stringify(data, null, 2));
  console.log(label, JSON.stringify(data.heroAfter));
  console.log(label, "thumb", data.thumb);
  console.log(label, "play", data.play);
  console.log(label, "rounded", data.roundedWrap);
  console.log(label, "imgRules", data.imgRules);
  console.log(label, "sheets", data.stylesheets);
  await browser.close();
}

await dump("http://127.0.0.1:5102/about-us/", "local");
await dump("https://ngmanpower.com/about-us/", "live");
