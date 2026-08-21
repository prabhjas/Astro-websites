import { chromium } from "playwright";

const LIVE = "https://spheavyrental.ae";
const LOCAL = "http://127.0.0.1:4321";

const browser = await chromium.launch({ headless: true });

async function probe(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && /wp-content|swiper|carousel|testimonial/.test(r.url()))
      failed.push(`${r.status()} ${r.url()}`);
  });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const fleet = [...document.querySelectorAll(".elementor-heading-title, h2, h3")].find((el) =>
      /OUR HEAVY MACHINERY FLEET/i.test(el.textContent || ""),
    );
    const fleetSection = fleet?.closest(".elementor-top-section, .elementor-element");
    const fleetRoot = fleetSection?.closest(".elementor-top-section") || fleetSection;
    const swiperNearFleet = fleetRoot
      ? {
          swipers: fleetRoot.querySelectorAll(".swiper, .elementor-main-swiper, .swiper-container").length,
          slides: fleetRoot.querySelectorAll(".swiper-slide").length,
          nested: [...fleetRoot.querySelectorAll("[data-elementor-type]")].map((el) => ({
            type: el.getAttribute("data-elementor-type"),
            id: el.getAttribute("data-elementor-id"),
          })),
          widgetTypes: [...fleetRoot.querySelectorAll("[data-widget_type]")]
            .map((el) => el.getAttribute("data-widget_type"))
            .slice(0, 20),
          htmlSnippet: fleetRoot?.outerHTML?.slice(0, 500),
        }
      : null;

    // broader page swiper/testimonial
    const testimonials = {
      widgets: [...document.querySelectorAll("[data-widget_type*='testimonial']")].map((el) =>
        el.getAttribute("data-widget_type"),
      ),
      swipers: document.querySelectorAll(".elementor-testimonial-carousel, .elementor-reviews-carousel").length,
      slides: document.querySelectorAll(
        ".elementor-testimonial-carousel .swiper-slide, .elementor-main-swiper .swiper-slide",
      ).length,
      arrows: document.querySelectorAll(".elementor-swiper-button, .swiper-button-next, .swiper-button-prev")
        .length,
    };

    // forklift left column images
    const imgs = [...document.querySelectorAll("img")]
      .filter((img) => /forklift|Forklift|Diesel|Electric/i.test(img.src + img.alt + (img.className || "")))
      .slice(0, 10)
      .map((img) => ({
        src: img.currentSrc || img.src,
        w: img.naturalWidth,
        complete: img.complete,
        display: getComputedStyle(img).display,
        parentBg: getComputedStyle(img.closest(".elementor-column, .elementor-element") || img).backgroundImage,
      }));

    // first content section with 50/50 columns after hero
    const sections = [...document.querySelectorAll("[data-elementor-type=wp-page] > .elementor-top-section")].slice(
      0,
      4,
    );
    const colProbe = sections.map((s) => {
      const cols = [...s.querySelectorAll(":scope > .elementor-container > .elementor-column")];
      return {
        id: s.getAttribute("data-id"),
        cols: cols.map((c) => {
          const cs = getComputedStyle(c);
          const img = c.querySelector("img");
          const bg =
            cs.backgroundImage !== "none"
              ? cs.backgroundImage
              : getComputedStyle(c.querySelector(".elementor-widget-wrap") || c).backgroundImage;
          const motion = c.querySelector(".elementor-motion-effects-layer");
          const motionBg = motion ? getComputedStyle(motion).backgroundImage : null;
          return {
            id: c.getAttribute("data-id"),
            bg,
            motionBg,
            hasImg: !!img,
            imgSrc: img?.src || null,
            imgW: img?.naturalWidth || 0,
            text: (c.innerText || "").trim().slice(0, 40),
          };
        }),
      };
    });

    return {
      title: document.title,
      fleet: fleetRoot
        ? {
            id: fleetRoot.getAttribute("data-id"),
            ...swiperNearFleet,
          }
        : null,
      allSwipers: document.querySelectorAll(".swiper, .elementor-main-swiper").length,
      allSlides: document.querySelectorAll(".swiper-slide").length,
      testimonials,
      imgs,
      colProbe,
      bodyClass: document.body.className,
    };
  });

  console.log("\n===", label, url);
  console.log(JSON.stringify(data, null, 2).slice(0, 3500));
  if (failed.length) console.log("FAILED", failed.slice(0, 15));
  if (errs.length) console.log("ERRS", errs.slice(0, 8));
  await page.close();
  return data;
}

await probe(`${LIVE}/heavy-machinery-rental/?nowprocket=1`, "LIVE heavy");
await probe(`${LOCAL}/heavy-machinery-rental/`, "LOCAL heavy");
await probe(`${LIVE}/heavy-machinery-rental/forklift-rental/?nowprocket=1`, "LIVE forklift");
await probe(`${LOCAL}/heavy-machinery-rental/forklift-rental/`, "LOCAL forklift");
await probe(`${LIVE}/about-us/?nowprocket=1`, "LIVE about");
await probe(`${LOCAL}/about-us/`, "LOCAL about");
await probe(`${LIVE}/wheel-loaders-for-rent/?nowprocket=1`, "LIVE post");
await probe(`${LOCAL}/wheel-loaders-for-rent/`, "LOCAL post");

await browser.close();
