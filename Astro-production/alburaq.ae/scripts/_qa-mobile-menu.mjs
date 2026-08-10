import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function check(url, label) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4500);

  const src = await page.evaluate(
    () => document.querySelector('script[src*="astro-mirror-fixes"]')?.src || '',
  );
  console.log(label + ' script', src);

  await page.locator('.elementor-element-04a4e5f .elementor-menu-toggle').click({ force: true });
  await page.waitForTimeout(700);

  let navigated = false;
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame() && !/contact-us|about:blank/.test(f.url())) {
      navigated = true;
      console.log(label + ' NAV', f.url());
    }
  });

  const box = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('.elementor-nav-menu--dropdown.elementor-nav-menu__container')].find(
      (p) => p.getBoundingClientRect().height > 50,
    );
    const a = [...panel.querySelectorAll('a.elementor-item')].find((x) =>
      /WHAT WE DO/i.test(x.textContent || ''),
    );
    const arrow = a.querySelector('.sub-arrow');
    const r = arrow.getBoundingClientRect();
    return {
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      bound: a.parentElement.dataset.astroMobileNavBound,
    };
  });
  console.log(label + ' caret', box);
  await page.touchscreen.tap(box.x, box.y);
  await page.waitForTimeout(900);

  const afterWhat = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('.elementor-nav-menu--dropdown.elementor-nav-menu__container')].find(
      (p) => p.getBoundingClientRect().height > 50,
    );
    if (!panel) {
      return { url: location.pathname, panelH: [], what: null };
    }
    const li = [...panel.querySelectorAll('.menu-item-has-children')].find((x) =>
      /WHAT WE DO/i.test(x.querySelector(':scope>a')?.textContent || ''),
    );
    const a = li.querySelector(':scope>a');
    const sub = li.querySelector(':scope>.sub-menu');
    return {
      url: location.pathname,
      panelH: Math.round(panel.getBoundingClientRect().height),
      what: {
        color: getComputedStyle(a).color,
        subH: Math.round(sub.getBoundingClientRect().height),
        links: [...sub.querySelectorAll(':scope>li>a')].map((x) => (x.childNodes[0]?.textContent || '').trim()),
      },
    };
  });
  console.log(label + ' afterWhat', JSON.stringify(afterWhat), 'nav', navigated);
  await page.screenshot({ path: `scripts/_mm9-${label}-what.png` });

  if (afterWhat.what && afterWhat.what.subH > 0) {
    const outs = await page.evaluate(() => {
      const panel = [...document.querySelectorAll('.elementor-nav-menu--dropdown.elementor-nav-menu__container')].find(
        (p) => p.getBoundingClientRect().height > 50,
      );
      const a = [...panel.querySelectorAll('.sub-menu > .menu-item-has-children > a')].find((x) =>
        /OUTSOURCING/i.test(x.childNodes[0]?.textContent || ''),
      );
      const r = a.querySelector('.sub-arrow').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.touchscreen.tap(outs.x, outs.y);
    await page.waitForTimeout(700);
    const nest = await page.evaluate(() => {
      const panel = [...document.querySelectorAll('.elementor-nav-menu--dropdown.elementor-nav-menu__container')].find(
        (p) => p.getBoundingClientRect().height > 50,
      );
      const li = [...panel.querySelectorAll('.sub-menu > .menu-item-has-children')].find((x) =>
        /OUTSOURCING/i.test(x.querySelector(':scope>a')?.textContent || ''),
      );
      const sub = li.querySelector(':scope>.sub-menu');
      return {
        nestH: Math.round(sub.getBoundingClientRect().height),
        links: [...sub.querySelectorAll(':scope>li>a')].map((x) => (x.childNodes[0]?.textContent || '').trim()),
        panelH: Math.round(panel.getBoundingClientRect().height),
        url: location.pathname,
      };
    });
    console.log(label + ' nest', nest);
    await page.screenshot({ path: `scripts/_mm9-${label}-nest.png` });
  }

  await page.locator('.elementor-element-04a4e5f .elementor-menu-toggle').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => {
    const t = document.querySelector('.elementor-element-04a4e5f .elementor-menu-toggle');
    return {
      active: !!t?.classList.contains('elementor-active'),
      panelMax: Math.max(
        0,
        ...[...document.querySelectorAll('.elementor-nav-menu--dropdown.elementor-nav-menu__container')].map((p) =>
          p.getBoundingClientRect().height,
        ),
      ),
    };
  });
  console.log(label + ' close', closed);
  await page.close();
}

await check('http://127.0.0.1:5120/contact-us/', 'LOCAL');
await check('/contact-us/', 'LIVE');
await browser.close();
