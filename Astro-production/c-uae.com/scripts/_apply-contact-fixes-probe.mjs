import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://c-uae.com/contact-us/?nowprocket=1", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const el = document.querySelector(".footer_raj");
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    display: cs.display,
    visibility: cs.visibility,
    height: r.height,
    width: r.width,
    top: r.top,
    hasForm: !!el.querySelector(".wpcf7"),
    htmlLen: el.innerHTML.length,
    text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 200),
  };
});
console.log(info);

// Save wp-custom-css content
const custom = await page.evaluate(() => document.getElementById("wp-custom-css")?.textContent || "");
fs.writeFileSync("public/css/wp-custom.css", custom.trim() + "\n");
console.log("wp-custom.css bytes", custom.length);

// Also check if local body has main-form
await page.goto("http://127.0.0.1:5092/contact-us/", { waitUntil: "networkidle" });
const local = await page.evaluate(() => ({
  mainForm: !!document.querySelector(".main-form"),
  footerRajForm: !!document.querySelector(".footer_raj .wpcf7"),
  footerRajDisplay: getComputedStyle(document.querySelector(".footer_raj") || document.body).display,
  footerRajHeight: document.querySelector(".footer_raj")?.getBoundingClientRect().height,
  submitBg: getComputedStyle(document.querySelector(".cntct-form .wpcf7-submit") || document.body).backgroundColor,
}));
console.log("local", local);
await browser.close();
