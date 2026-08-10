import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function probe(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200));
  });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3500);

  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        y: Math.round(r.top + scrollY),
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        cls: (el.className || '').toString().slice(0, 120),
        id: el.id || '',
      };
    };

    const topBanner = document.querySelector('#top-banner, .elementor-widget-slides, .elementor-slides-wrapper, .swiper-wrapper');
    const allSwipers = [...document.querySelectorAll('.swiper, .elementor-main-swiper, .n2-ss-slider, [data-settings*="slides"]')].map((el) => ({
      ...rect(el),
      slides: el.querySelectorAll('.swiper-slide, .n2-ss-slide, .elementor-slides .swiper-slide').length,
      active: !!el.querySelector('.swiper-slide-active, .n2-ss-slide-active'),
    }));

    const smartAll = [...document.querySelectorAll('.n2-ss-slider, [id^="n2-ss-"]')].map((el) => ({
      ...rect(el),
      loaded: el.classList.contains('n2-ss-loaded'),
      parentHidden: el.closest('.elementor-hidden-desktop') ? 'hidden-desktop' : el.closest('[class*="elementor-hidden"]')?.className?.match(/elementor-hidden-[a-z]+/g) || null,
    }));

    const slidesWidget = [...document.querySelectorAll('.elementor-widget-slides')].map((el) => {
      const swiper = el.querySelector('.swiper, .elementor-main-swiper');
      const slides = el.querySelectorAll('.swiper-slide');
      return {
        ...rect(el),
        slideCount: slides.length,
        swiper: rect(swiper),
        hasNavigation: !!el.querySelector('.elementor-swiper-button, .swiper-button-next, .swiper-pagination'),
        autoplay: el.getAttribute('data-settings') || el.querySelector('[data-settings]')?.getAttribute('data-settings')?.slice(0, 300),
      };
    });

    // Hero-ish first viewport media
    const heroCandidates = [...document.querySelectorAll('section.elementor-top-section')].slice(0, 5).map((s) => ({
      ...rect(s),
      bg: getComputedStyle(s).backgroundImage?.slice(0, 80),
      hasSlider: !!s.querySelector('.swiper, .n2-ss-slider, .elementor-widget-slides, .elementor-background-slideshow'),
      slideshow: !!s.querySelector('.elementor-background-slideshow'),
      bgSlides: s.querySelectorAll('.elementor-background-slideshow__slide, .swiper-slide').length,
    }));

    // Menu icons
    const menuIcons = [...document.querySelectorAll('.elementor-nav-menu .fas, .elementor-nav-menu .fab, .elementor-nav-menu .far, .ekit-menu-nav-link i, .elementor-item i, header i[class*="fa-"], .eicon, .elementskit-menu-icon, .ekit-menu-icon')].slice(0, 30).map((i) => {
      const before = getComputedStyle(i, '::before');
      return {
        cls: i.className,
        content: before.content,
        font: before.fontFamily,
        w: Math.round(i.getBoundingClientRect().width),
        h: Math.round(i.getBoundingClientRect().height),
        color: before.color || getComputedStyle(i).color,
      };
    });

    const social = [...document.querySelectorAll('header .fab, footer .fab, .elementor-social-icon, a[href*="facebook"] i, a[href*="instagram"] i, a[href*="linkedin"] i')].slice(0, 20).map((i) => {
      const before = getComputedStyle(i, '::before');
      return { cls: i.className, content: before.content, font: before.fontFamily, w: Math.round(i.getBoundingClientRect().width) };
    });

    return {
      slidesWidget,
      smartAll,
      allSwipers: allSwipers.slice(0, 15),
      heroCandidates,
      menuIcons,
      social,
      faCss: [...document.styleSheets].some((s) => (s.href || '').includes('fontawesome') || (s.href || '').includes('fa-')),
      ekitCss: [...document.styleSheets].some((s) => (s.href || '').includes('ekit') || (s.href || '').includes('elementskit')),
      title: document.title,
    };
  });

  // Try advancing elementor slides
  const advance = await page.evaluate(async () => {
    const widget = document.querySelector('.elementor-widget-slides');
    if (!widget) return { ok: false, reason: 'no slides widget' };
    const before = widget.querySelector('.swiper-slide-active')?.textContent?.slice(0, 80);
    const next = widget.querySelector('.elementor-swiper-button-next, .swiper-button-next');
    if (next) next.click();
    await new Promise((r) => setTimeout(r, 800));
    const after = widget.querySelector('.swiper-slide-active')?.textContent?.slice(0, 80);
    const swiperEl = widget.querySelector('.swiper');
    const swiper = swiperEl?.swiper;
    return {
      ok: true,
      before,
      after,
      changed: before !== after,
      swiperIndex: swiper?.activeIndex,
      slideCount: swiper?.slides?.length,
      autoplayRunning: swiper?.autoplay?.running,
    };
  });

  await page.screenshot({ path: `scripts/_parity-shots/home-${base.includes('127') ? 'local' : 'live'}.png`, fullPage: false });
  await browser.close();
  return { data, advance, errors: errors.slice(0, 25) };
}

const [local, live] = await Promise.all([probe(LOCAL), probe(LIVE)]);
console.log(JSON.stringify({ local, live }, null, 2));
