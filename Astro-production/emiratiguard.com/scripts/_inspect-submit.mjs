import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });

async function inspect(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  const data = await page.evaluate(() => {
    const btn = document.querySelector(".wpcf7-form input[type=submit], .wpcf7-form button[type=submit], .wpcf7-submit");
    if (!btn) return { error: "no submit" };
    const cs = getComputedStyle(btn);
    const forms = [...document.querySelectorAll(".wpcf7-form")].map((f) => ({
      rect: f.getBoundingClientRect().toJSON(),
      parentClasses: f.closest(".elementor-element")?.className || "",
      pageId: f.closest("[data-elementor-id]")?.getAttribute("data-elementor-id"),
    }));
    return {
      text: btn.value || btn.textContent,
      bg: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      fontSize: cs.fontSize,
      width: cs.width,
      height: cs.height,
      className: btn.className,
      formsCount: forms.length,
      forms,
    };
  });
  console.log(label, JSON.stringify(data, null, 2));
  await page.close();
}

await inspect("http://127.0.0.1:5092/contact-us/", "local");
await inspect("https://emiratiguard.com/contact-us/?nowprocket=1", "live");
await browser.close();
