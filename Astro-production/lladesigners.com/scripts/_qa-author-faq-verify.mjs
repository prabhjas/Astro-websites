import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });

async function author(base, name) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/author/jermaine-odtujan/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `scripts/_parity-shots/${name}.png` });
  const info = await page.evaluate(() => {
    const nested = document.querySelectorAll('.elementor-element-a78c16e').length;
    const wrappers = document.querySelectorAll('.astro-author-profile-section').length;
    const linkedin = document.querySelector('.elementor-element-df5b09c a, a[href*="linkedin.com/in"]');
    const bio = document.querySelector('.elementor-element-3e80f9d')?.innerText?.trim()?.slice(0, 160) || '';
    const left = document.querySelector('.elementor-element-28b0ef1');
    const right = document.querySelector('.elementor-element-a613a32');
    const section = document.querySelector('.elementor-element-a78c16e');
    return {
      nestedSections: nested,
      wrappers,
      linkedin: linkedin?.href || null,
      linkedinVisible: !!(linkedin && linkedin.getBoundingClientRect().height > 0),
      bio,
      leftW: left ? Math.round(left.getBoundingClientRect().width) : null,
      rightW: right ? Math.round(right.getBoundingClientRect().width) : null,
      sectionPad: section ? getComputedStyle(section).padding : null,
      sectionMargin: section ? getComputedStyle(section).margin : null,
      profileText: (document.body.innerText || '').split('Article By')[0].trim().slice(0, 550),
    };
  });
  await page.close();
  return info;
}

async function faq(base, name) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/bespoke-furniture-design-services/', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() =>
    document.querySelector('.elementor-widget-accordion')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const t = document.querySelector('.elementor-widget-accordion .elementor-tab-title');
    if (t && !t.classList.contains('elementor-active')) t.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `scripts/_parity-shots/${name}.png` });
  const info = await page.evaluate(() => {
    const active = document.querySelector(
      '.elementor-widget-accordion .elementor-tab-title.elementor-active .elementor-accordion-title',
    );
    const inactive = document.querySelector(
      '.elementor-widget-accordion .elementor-tab-title:not(.elementor-active) .elementor-accordion-title',
    );
    const acs = active ? getComputedStyle(active) : null;
    const ics = inactive ? getComputedStyle(inactive) : null;
    return {
      active: active ? { color: acs.color, outline: acs.outline, weight: acs.fontWeight } : null,
      inactive: inactive ? { color: ics.color, outline: ics.outline, weight: ics.fontWeight } : null,
      mirror: [...document.scripts].some((s) => /astro-mirror-fixes\.js\?v=20260810-faq1/.test(s.src)),
    };
  });
  await page.close();
  return info;
}

const out = {
  liveAuthor: await author('https://lladesigners.com', 'verify-live-author'),
  localAuthor: await author('http://127.0.0.1:5112', 'verify-local-author'),
  liveFaq: await faq('https://lladesigners.com', 'verify-live-faq'),
  localFaq: await faq('http://127.0.0.1:5112', 'verify-local-faq'),
};
writeFileSync('scripts/_qa-author-faq-verify.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
