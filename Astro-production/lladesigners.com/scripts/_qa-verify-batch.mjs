import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5112';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Authors
  for (const path of ['/author/', '/author/lana-vasiljeva/']) {
    const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('AUTHOR', path, res?.status(), await page.title());
  }

  // FAQ smooth
  await page.goto(BASE + '/interior-design/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  const faq = await page.evaluate(async () => {
    const titles = [...document.querySelectorAll('.elementor-widget-accordion .elementor-tab-title')];
    const t = titles[1];
    const content = document.getElementById(t.getAttribute('aria-controls') || '');
    const before = {
      h: content ? Math.round(content.getBoundingClientRect().height) : 0,
      active: t.classList.contains('elementor-active'),
    };
    t.click();
    await new Promise((r) => setTimeout(r, 120));
    const mid = {
      h: content ? Math.round(content.getBoundingClientRect().height) : 0,
      anim: content?.classList.contains('astro-accordion-animating'),
      transition: content ? getComputedStyle(content).transition : '',
    };
    await new Promise((r) => setTimeout(r, 280));
    const after = {
      h: content ? Math.round(content.getBoundingClientRect().height) : 0,
      active: t.classList.contains('elementor-active'),
      color: getComputedStyle(t.querySelector('.elementor-accordion-title')).color,
      titleDisplay: getComputedStyle(t.querySelector('.elementor-accordion-title')).display,
      outline: getComputedStyle(t.querySelector('.elementor-accordion-title')).outline,
      closedHidden: getComputedStyle(t.querySelector('.elementor-accordion-icon-closed')).display,
      openedShown: getComputedStyle(t.querySelector('.elementor-accordion-icon-opened')).display,
    };
    return { before, mid, after };
  });
  console.log('FAQ', JSON.stringify(faq, null, 2));

  // Testimonial SPV
  const testi = await page.evaluate(() => {
    const w = document.querySelector('.elementor-widget-testimonial-carousel');
    const wrap = w?.querySelector('.swiper');
    return {
      spv: wrap?.swiper?.params?.slidesPerView,
      dataSpv: wrap?.dataset?.astroSpvDesktop,
      init: wrap?.classList.contains('swiper-initialized'),
      bullets: w?.querySelectorAll('.swiper-pagination-bullet').length,
    };
  });
  console.log('TESTI', testi);

  // Contact form
  await page.goto(BASE + '/contact-us/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form');
    const fields = [...form.querySelectorAll('input:not([type=hidden]), textarea')]
      .filter((el) => el.offsetParent !== null || el.name === 'your-message')
      .map((el) => ({
        name: el.name,
        type: el.type,
        label: el.closest('label')?.childNodes?.[0]?.textContent?.trim()?.slice(0, 40),
      }));
    const phone = form.querySelector('.wpcf7-phonetext');
    const iti = phone?.closest('.intl-tel-input');
    const flag = iti?.querySelector('.selected-flag');
    const dial = iti?.querySelector('.selected-dial-code')?.textContent;
    const country = window.__astroDetectedCountry || '';
    return {
      fields,
      dial,
      country,
      flagTitle: flag?.getAttribute('title') || flag?.getAttribute('aria-label'),
      hasFullName: !!form.querySelector('[name="full-name"]'),
      hasMessage: !!form.querySelector('[name="your-message"]'),
      hasFirst: !!form.querySelector('[name="first-name"]'),
    };
  });
  console.log('FORM', JSON.stringify(formInfo, null, 2));

  // Fill and submit
  await page.fill('input[name="full-name"]', 'Jane Doe');
  await page.fill('input[name="your-email"]', 'jane.doe@example.com');
  await page.fill('.wpcf7-phonetext', '501234567');
  await page.fill('textarea[name="your-message"]', 'Please contact me about interior design.');
  await page.click('input[type="submit"]');
  await page.waitForTimeout(2500);
  const submitResult = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form');
    const out = form?.querySelector('.wpcf7-response-output');
    return {
      text: out?.textContent,
      sent: form?.classList.contains('sent'),
      invalid: form?.classList.contains('invalid'),
    };
  });
  console.log('SUBMIT', submitResult);

  // Reject numbers in name
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.fill('input[name="full-name"]', '666');
  const nameVal = await page.inputValue('input[name="full-name"]');
  console.log('NAME_SANITIZE', JSON.stringify(nameVal));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
