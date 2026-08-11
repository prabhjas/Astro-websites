import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';
const path = '/bespoke-furniture-design-services/';

async function deep(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const widget = document.querySelector('.elementor-widget-testimonial-carousel');
    const wrap = widget?.querySelector('.swiper');
    const settings = widget?.getAttribute('data-settings') || '';
    const slides = [...(wrap?.querySelectorAll('.swiper-slide') || [])].map((s) => ({
      w: Math.round(s.getBoundingClientRect().width),
      visible: s.getBoundingClientRect().width > 50 && s.getBoundingClientRect().height > 50,
      cls: s.className.slice(0, 80),
    }));
    const swiper = wrap?.swiper;
    const arrows = {
      next: !!widget?.querySelector('.elementor-swiper-button-next, .swiper-button-next'),
      prev: !!widget?.querySelector('.elementor-swiper-button-prev, .swiper-button-prev'),
      nextVis: (() => {
        const el = widget?.querySelector('.elementor-swiper-button-next, .swiper-button-next');
        if (!el) return false;
        const st = getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
      })(),
      bullets: widget?.querySelectorAll('.swiper-pagination-bullet').length || 0,
    };
    // FAQ colors
    const faqRoot = document.querySelector('.elementor-widget-accordion .elementor-accordion');
    const titles = [...(faqRoot?.querySelectorAll('.elementor-tab-title') || [])];
    const t0 = titles[0];
    const t1 = titles[1];
    function titleStyle(t) {
      if (!t) return null;
      const a = t.querySelector('.elementor-accordion-title');
      const icon = t.querySelector('.elementor-accordion-icon i, .elementor-accordion-icon');
      const cs = a ? getComputedStyle(a) : null;
      const ics = icon ? getComputedStyle(icon) : null;
      const tcs = getComputedStyle(t);
      return {
        active: t.classList.contains('elementor-active'),
        color: cs?.color,
        fontWeight: cs?.fontWeight,
        border: tcs.border,
        outline: tcs.outline,
        iconColor: ics?.color,
        titleText: a?.textContent?.trim().slice(0, 50),
      };
    }
    // click second
    if (t1) t1.click();
    const afterClick = titleStyle(t1);
    const content = t1 ? document.getElementById(t1.getAttribute('aria-controls') || '') : null;
    const contentStyle = content
      ? {
          hidden: content.hidden,
          display: getComputedStyle(content).display,
          height: Math.round(content.getBoundingClientRect().height),
          active: content.classList.contains('elementor-active'),
          transition: getComputedStyle(content).transition,
        }
      : null;

    return {
      settings: settings.slice(0, 400),
      swiper: swiper
        ? {
            paramsSpv: swiper.params.slidesPerView,
            active: swiper.activeIndex,
            realIndex: swiper.realIndex,
            slidesLen: swiper.slides?.length,
            initialized: wrap.classList.contains('swiper-initialized'),
            width: Math.round(wrap.getBoundingClientRect().width),
          }
        : null,
      slides: slides.slice(0, 5),
      arrows,
      faq: {
        first: titleStyle(t0),
        secondAfterClick: afterClick,
        contentStyle,
        itemBorders: faqRoot
          ? getComputedStyle(faqRoot.querySelector('.elementor-accordion-item')).borderBottom
          : null,
      },
    };
  });

  // Try next slide
  const afterNav = await page.evaluate(() => {
    const widget = document.querySelector('.elementor-widget-testimonial-carousel');
    const wrap = widget?.querySelector('.swiper');
    const next = widget?.querySelector('.elementor-swiper-button-next, .swiper-button-next');
    const before = wrap?.swiper?.realIndex;
    next?.click();
    return {
      before,
      after: wrap?.swiper?.realIndex,
      nextExists: !!next,
    };
  });

  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_shot-${base.includes('127') ? 'local' : 'live'}-testi.png`,
    fullPage: false,
  });

  // scroll to FAQ and screenshot
  await page.evaluate(() => {
    const el = document.querySelector('.elementor-widget-accordion');
    el?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_shot-${base.includes('127') ? 'local' : 'live'}-faq.png`,
    fullPage: false,
  });

  await browser.close();
  return { info, afterNav };
}

const out = {
  local: await deep(LOCAL),
  live: await deep(LIVE),
};
console.log(JSON.stringify(out, null, 2));
