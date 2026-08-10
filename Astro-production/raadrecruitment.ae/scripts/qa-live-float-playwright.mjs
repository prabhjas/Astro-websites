import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://ngmanpower.com/?nowprocket=1", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(3000);
const found = await page.evaluate(() => {
  const links = [...document.querySelectorAll("a")].filter((a) =>
    /whatsapp|wa\.me|api\.whatsapp/i.test(a.href + a.className + a.id),
  );
  const fixed = [...document.querySelectorAll("*")].filter((el) => {
    const s = getComputedStyle(el);
    return (
      (s.position === "fixed" || s.position === "sticky") &&
      el.getBoundingClientRect().width > 20 &&
      el.getBoundingClientRect().height > 20 &&
      /whatsapp|chat|float|call/i.test(el.className + el.id + (el.getAttribute("aria-label") || ""))
    );
  });
  return {
    links: links.map((a) => ({ href: a.href, class: a.className, text: a.textContent?.trim().slice(0, 40) })),
    fixed: fixed.slice(0, 10).map((el) => ({
      tag: el.tagName,
      class: el.className?.toString?.().slice?.(0, 80),
      id: el.id,
      html: el.outerHTML.slice(0, 250),
    })),
  };
});
console.log(JSON.stringify(found, null, 2));
await browser.close();
