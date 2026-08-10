import { chromium } from 'playwright';

async function shot(base, path, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);

  const faq = page.locator('.elementor-widget-accordion').first();
  await faq.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // open second item
  await page.evaluate(() => {
    const titles = [...document.querySelectorAll('.elementor-widget-accordion .elementor-tab-title')];
    titles[1]?.click();
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_cmp-${label}-faq.png`,
    clip: await faq.boundingBox().then((b) => (b ? { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 80), width: Math.min(1400, b.width + 40), height: Math.min(700, b.height + 120) } : null)),
  });

  const testi = page.locator('.elementor-widget-testimonial-carousel').first();
  if (await testi.count()) {
    await testi.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const box = await testi.boundingBox();
    if (box) {
      await page.screenshot({
        path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_cmp-${label}-testi.png`,
        clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 60), width: Math.min(1400, box.width + 40), height: Math.min(520, box.height + 100) },
      });
    }
    const meta = await page.evaluate(() => {
      const w = document.querySelector('.elementor-widget-testimonial-carousel');
      const wrap = w?.querySelector('.swiper');
      const container = w?.closest('.elementor-section, .e-con');
      return {
        spv: wrap?.swiper?.params?.slidesPerView,
        overflow: wrap ? getComputedStyle(wrap).overflow : null,
        wrapperTransform: wrap?.querySelector('.swiper-wrapper')?.style?.transform || getComputedStyle(wrap?.querySelector('.swiper-wrapper') || document.body).transform,
        slideWs: [...(wrap?.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)') || [])].slice(0, 3).map((s) => Math.round(s.getBoundingClientRect().width)),
        sectionHtmlSnippet: w?.innerHTML?.slice(0, 200),
        hasTestiSlideClass: w?.classList.contains('testi-slide'),
        arrowsDisplay: (() => {
          const n = w?.querySelector('.elementor-swiper-button-next');
          return n ? getComputedStyle(n).display : null;
        })(),
      };
    });
    console.log(label, 'testi meta', JSON.stringify(meta));
  }

  const faqMeta = await page.evaluate(() => {
    const root = document.querySelector('.elementor-widget-accordion');
    const titles = [...root.querySelectorAll('.elementor-tab-title')];
    return titles.slice(0, 3).map((t) => {
      const a = t.querySelector('.elementor-accordion-title');
      const cs = getComputedStyle(a);
      const tcs = getComputedStyle(t);
      return {
        active: t.classList.contains('elementor-active'),
        color: cs.color,
        fw: cs.fontWeight,
        titleBorder: getComputedStyle(a).border,
        titleOutline: getComputedStyle(a).outline,
        titleBoxShadow: getComputedStyle(a).boxShadow,
        titleDisplay: getComputedStyle(a).display,
        padding: tcs.padding,
        icon: getComputedStyle(t.querySelector('.elementor-accordion-icon i') || t).color,
      };
    });
  });
  console.log(label, 'faq meta', JSON.stringify(faqMeta, null, 2));

  await browser.close();
}

await shot('http://127.0.0.1:5112', '/interior-design/', 'local-id');
await shot('https://lladesigners.com', '/interior-design/', 'live-id');
