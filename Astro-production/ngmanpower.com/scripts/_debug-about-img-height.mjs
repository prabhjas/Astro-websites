import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/about-us/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const sels = [
    'img[src*="Helping-Our-Clients"]',
    'img[src*="pngwing"]',
    'img[src*="928748017139596416"]',
    'img[src*="Frame-365"]',
  ];
  return sels.map((sel) => {
    const img = document.querySelector(sel);
    if (!img) return { sel, missing: true };
    const wrap = img.closest(".w-image");
    const cs = getComputedStyle(img);
    const ws = wrap ? getComputedStyle(wrap) : null;
    const matched = [];
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
        const ar = rule.style.getPropertyValue("aspect-ratio");
        if (h || mh || ar) {
          matched.push({
            sel: rule.selectorText,
            height: h,
            maxHeight: mh,
            aspectRatio: ar,
            importantH: rule.style.getPropertyPriority("height"),
            href: (sheet.href || "inline").split("/").slice(-2).join("/"),
          });
        }
      }
    }
    return {
      sel,
      src: img.currentSrc,
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      computed: {
        w: cs.width,
        h: cs.height,
        maxH: cs.maxHeight,
        ar: cs.aspectRatio,
        obj: cs.objectFit,
      },
      wrap: ws
        ? { w: ws.width, h: ws.height, maxH: ws.maxHeight, ar: ws.aspectRatio }
        : null,
      matched,
      attrs: {
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        sizes: img.getAttribute("sizes"),
        fixed: img.getAttribute("data-srcset-fixed"),
      },
    };
  });
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
