import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://emiratiguard.com/contact-us/?nowprocket=1", { waitUntil: "networkidle" });
const styles = await page.evaluate(() => {
  const btn = document.querySelector(".wpcf7-submit");
  const sheets = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = [...sheet.cssRules];
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!rule.selectorText || !rule.style) continue;
      if (!/wpcf7-submit|\.cntct-form|submit/i.test(rule.selectorText)) continue;
      if (!rule.style.backgroundColor && !rule.style.background) continue;
      sheets.push({
        href: sheet.href || "inline",
        selector: rule.selectorText,
        bg: rule.style.backgroundColor || rule.style.background,
        color: rule.style.color,
        radius: rule.style.borderRadius,
      });
    }
  }
  return sheets.slice(0, 40);
});
console.log(JSON.stringify(styles, null, 2));
await browser.close();
