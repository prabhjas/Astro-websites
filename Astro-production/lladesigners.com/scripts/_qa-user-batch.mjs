import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function probe(base, path) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().split('?')[0].replace(base, ''));
  });
  let status = 0;
  try {
    const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = res?.status() || 0;
  } catch (e) {
    await browser.close();
    return { path, status: 0, error: String(e.message).slice(0, 120) };
  }
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const faqTitle = [...document.querySelectorAll('h1,h2,h3,.elementor-heading-title')].find((el) =>
      /Frequently Asked Questions/i.test(el.textContent || ''),
    );
    const accordion = document.querySelector(
      '.elementor-widget-accordion, .elementor-accordion, .eael-adv-accordion, .e-n-accordion',
    );
    const items = [...document.querySelectorAll('.elementor-accordion-item, .e-n-accordion-item, .eael-accordion-list')];
    const first = items[0];
    const testimonials = document.querySelector(
      '.elementor-widget-testimonial-carousel, .elementor-testimonial, .swiper-wrapper, .elementor-widget-reviews',
    );
    const testimonialWidget = document.querySelector(
      '.elementor-widget-testimonial-carousel, .elementor-widget-nested-carousel, .elementor-reviews, .elementor-widget-slides',
    );
    const swipers = [...document.querySelectorAll('.swiper')].map((el) => ({
      parent: el.closest('[data-widget_type]')?.getAttribute('data-widget_type') || el.closest('.elementor-widget')?.className?.toString().slice(0, 80),
      slides: el.querySelectorAll('.swiper-slide').length,
      init: el.classList.contains('swiper-initialized') || !!el.swiper,
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    }));
    const form = document.querySelector('form.wpcf7-form');
    const fields = form
      ? [...form.querySelectorAll('input:not([type=hidden]), textarea, select')]
          .filter((i) => i.getBoundingClientRect().height > 0 || i.type === 'textarea')
          .map((i) => ({ name: i.name, type: i.type, tag: i.tagName, ph: i.placeholder }))
      : [];
    return {
      title: document.title.slice(0, 80),
      faq: {
        hasTitle: !!faqTitle,
        accordionCls: accordion?.className?.toString().slice(0, 120),
        itemCount: items.length,
        firstOpen: first ? first.className : null,
        plusIcons: document.querySelectorAll('.elementor-accordion-icon-closed, .e-n-accordion-item-title-icon').length,
      },
      testimonials: {
        widget: testimonialWidget?.getAttribute?.('data-widget_type') || testimonialWidget?.className?.toString().slice(0, 100),
        swipers: swipers.filter((s) => /testimonial|review|nested/i.test(s.parent || '') || s.slides >= 3).slice(0, 8),
        allSwipers: swipers.slice(0, 10),
      },
      form: form ? { fields, cls: form.className } : null,
      bodyClass: document.body.className.slice(0, 120),
    };
  });

  // Try toggle FAQ
  let faqToggle = null;
  if (path.includes('bespoke') || path.includes('interior') || path === '/') {
    faqToggle = await page.evaluate(() => {
      const titles = [
        ...document.querySelectorAll(
          '.elementor-tab-title, .e-n-accordion-item-title, .elementor-accordion-title, .eael-accordion-header',
        ),
      ];
      if (!titles.length) return { none: true };
      const t = titles[1] || titles[0];
      const before = t.getAttribute('aria-expanded') || t.className;
      t.click();
      return {
        before,
        after: t.getAttribute('aria-expanded') || t.className,
        text: t.textContent?.trim().slice(0, 60),
        count: titles.length,
      };
    });
  }

  await browser.close();
  return { path, status, info, faqToggle, failed: [...new Set(failed)].filter((f) => !f.includes('wp-json')).slice(0, 12) };
}

const paths = [
  '/bespoke-furniture-design-services/',
  '/contact-us/',
  '/author/',
  '/author/lana-vasiljeva/',
];

const out = { local: {}, live: {} };
for (const path of paths) {
  out.local[path] = await probe(LOCAL, path);
  out.live[path] = await probe(LIVE, path);
}
console.log(JSON.stringify(out, null, 2));
