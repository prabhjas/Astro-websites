import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function probe(origin, label) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 180)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 180));
  });

  await page.goto(origin + '/platform/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(4000);

  await page.evaluate(() =>
    document.querySelector('#e-n-accordion-item-1360')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(500);

  const hero = await page.evaluate(() => {
    const d = document.querySelector('#e-n-accordion-item-1360');
    const region = d?.querySelector('[role="region"]');
    const listText = region?.querySelector('.elementor-icon-list-text');
    const cs = region ? getComputedStyle(region) : null;
    const ts = listText ? getComputedStyle(listText) : null;
    const iconOpen = d?.querySelector('.e-opened');
    const iconClosed = d?.querySelector('.e-closed');
    return {
      open: d?.open,
      region: cs && {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        height: cs.height,
        maxHeight: cs.maxHeight,
        overflow: cs.overflow,
        color: cs.color,
        h: Math.round(region.getBoundingClientRect().height),
      },
      listColor: ts?.color,
      listText: listText?.textContent?.trim()?.slice(0, 60),
      iconOpenDisplay: iconOpen ? getComputedStyle(iconOpen).display : null,
      iconClosedDisplay: iconClosed ? getComputedStyle(iconClosed).display : null,
      jq: typeof window.jQuery,
      dollar: typeof window.$,
    };
  });
  await page.screenshot({ path: join(OUT, `${label}-hero-acc.png`), fullPage: false });

  await page.locator('#e-n-accordion-item-1361 summary').click({ force: true });
  await page.waitForTimeout(700);
  const afterAi = await page.evaluate(() => ({
    firstOpen: document.querySelector('#e-n-accordion-item-1360')?.open,
    secondOpen: document.querySelector('#e-n-accordion-item-1361')?.open,
    secondH: Math.round(
      document
        .querySelector('#e-n-accordion-item-1361 [role="region"]')
        ?.getBoundingClientRect().height || 0,
    ),
    secondText: document
      .querySelector('#e-n-accordion-item-1361 .elementor-icon-list-text')
      ?.textContent?.trim()
      ?.slice(0, 50),
  }));
  await page.screenshot({ path: join(OUT, `${label}-hero-ai.png`), fullPage: false });

  const faqRoot = page.locator('.elementor-widget-n-accordion .e-n-accordion').last();
  await faqRoot.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await faqRoot.locator('details').nth(1).locator('summary').click({ force: true });
  await page.waitForTimeout(700);
  const faq = await page.evaluate(() => {
    const root = [...document.querySelectorAll('.elementor-widget-n-accordion .e-n-accordion')].pop();
    return [...root.querySelectorAll('details')].slice(0, 4).map((d) => ({
      title: d.querySelector('.e-n-accordion-item-title-text')?.textContent?.trim()?.slice(0, 40),
      open: d.open,
      h: Math.round(d.querySelector('[role="region"]')?.getBoundingClientRect().height || 0),
    }));
  });
  await page.screenshot({ path: join(OUT, `${label}-faq.png`), fullPage: false });

  return { hero, afterAi, faq, errors: [...new Set(errors)].slice(0, 15) };
}

const live = await probe('https://kinzahr.com', 'live-plat');
const local = await probe('http://127.0.0.1:5085', 'local-plat');
writeFileSync(join(OUT, 'platform-acc-compare.json'), JSON.stringify({ live, local }, null, 2));
console.log(JSON.stringify({ live, local }, null, 2));
await browser.close();
