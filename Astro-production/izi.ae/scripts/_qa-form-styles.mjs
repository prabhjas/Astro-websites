#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
async function formStyles(origin) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/abu-dhabi-toll-system/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form');
    if (f) f.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  const styles = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form');
    if (!form) return null;
    const pick = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: s.display,
        bg: s.backgroundColor,
        color: s.color,
        border: s.borderTopColor + ' ' + s.borderTopWidth,
        radius: s.borderRadius,
        pad: s.padding,
        ff: s.fontFamily.slice(0, 60),
        fw: s.fontWeight,
        fs: s.fontSize,
      };
    };
    const first = form.querySelector('[name="first-name"]');
    const last = form.querySelector('[name="last-name"]');
    const email = form.querySelector('[name="your-email"]');
    const phone = form.querySelector('[name^="phonetext"]');
    const msg = form.querySelector('[name="your-message"]');
    const submit = form.querySelector('[type="submit"]');
    const heading = document.querySelector('.elementor-element-f31ba19 .elementor-heading-title, .contactform')?.closest('.elementor-element')?.parentElement?.querySelector('.elementor-heading-title');
    const card = form.closest('.elementor-element');
    const honeypot = form.querySelector('#altEmail_container, .altEmail_container, [name="alt_s"]');
    return {
      card: pick(card),
      heading: heading ? { text: heading.textContent.trim(), ...pick(heading) } : null,
      first: pick(first),
      last: pick(last),
      email: pick(email),
      phone: pick(phone),
      msg: pick(msg),
      submit: pick(submit),
      honeypot: honeypot
        ? { ...pick(honeypot), name: honeypot.name || honeypot.id, visible: honeypot.getBoundingClientRect().height > 2 }
        : null,
      sheet: [...document.styleSheets].map((s) => s.href).filter((h) => h && /kinza|form-fix|wpa|cf7|contact/i.test(h)),
    };
  });
  const label = origin.includes('5121') ? 'local' : 'live';
  console.log(label, JSON.stringify(styles, null, 2));
  await page.screenshot({ path: `.tmp-qa/shots/${label}-form-close.png` });
  await page.close();
}
await formStyles('http://127.0.0.1:5121');
await formStyles('https://izi.ae');
await browser.close();
