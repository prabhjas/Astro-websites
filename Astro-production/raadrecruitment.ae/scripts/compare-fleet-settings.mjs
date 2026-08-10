import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });

async function probe(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.locator("text=OUR HEAVY MACHINERY FLEET").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    const heading = [...document.querySelectorAll(".elementor-heading-title")].find((el) =>
      /OUR HEAVY MACHINERY FLEET/i.test(el.textContent || ""),
    );
    const widget = heading?.closest(".elementor-element")?.parentElement?.querySelector(
      ".elementor-widget-testimonial-carousel, [data-widget_type*='testimonial']",
    ) || document.querySelector(".elementor-widget-testimonial-carousel");
    const swiper = widget?.querySelector(".swiper, .elementor-main-swiper");
    const settings = widget?.getAttribute("data-settings");
    const slides = [...(swiper?.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)") || [])].map(
      (s) => (s.innerText || "").trim().slice(0, 40).replace(/\s+/g, " "),
    );
    const active = swiper?.querySelector(".swiper-slide-active");
    return {
      settings,
      slideCount: slides.length,
      slides,
      activeText: (active?.innerText || "").trim().slice(0, 60).replace(/\s+/g, " "),
      swiperWidth: swiper?.getBoundingClientRect().width,
      slideWidth: active?.getBoundingClientRect().width,
      initialized: swiper?.classList.contains("swiper-initialized"),
      perView: swiper?.swiper?.params?.slidesPerView,
    };
  });
  await page.screenshot({ path: `_crawl/compare/fleet-${label}.png` });
  console.log(label, JSON.stringify(data, null, 2));
  await page.close();
}

await probe("/heavy-machinery-rental/?nowprocket=1", "live");
await probe("http://127.0.0.1:4321/heavy-machinery-rental/", "local");

// about testimonials
async function probeAbout(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.locator("text=WHAT OUR CLIENTS SAY").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    const widget = document.querySelector(".elementor-widget-testimonial-carousel");
    const swiper = widget?.querySelector(".swiper, .elementor-main-swiper");
    return {
      settings: widget?.getAttribute("data-settings"),
      perView: swiper?.swiper?.params?.slidesPerView,
      slides: swiper?.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length,
      activeCount: swiper?.querySelectorAll(".swiper-slide-active, .swiper-slide-next").length,
    };
  });
  await page.screenshot({ path: `_crawl/compare/clients-${label}.png` });
  console.log("about", label, JSON.stringify(data, null, 2));
  await page.close();
}

await probeAbout("/about-us/?nowprocket=1", "live");
await probeAbout("http://127.0.0.1:4321/about-us/", "local");

await browser.close();
