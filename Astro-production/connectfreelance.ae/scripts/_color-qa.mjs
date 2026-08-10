import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function probe(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const texts = [...document.querySelectorAll('.elementor-widget-text-editor p')]
      .filter((el) => el.textContent.trim().length > 40)
      .slice(0, 4)
      .map((el) => ({
        color: getComputedStyle(el).color,
        parentBg: getComputedStyle(el.closest('.elementor-element') || el).backgroundColor,
        t: el.textContent.trim().slice(0, 50),
      }));

    const emails = [...document.querySelectorAll('a')]
      .filter((a) => /@|email-protection|mailto:/i.test((a.getAttribute('href') || '') + a.textContent))
      .slice(0, 5)
      .map((a) => ({
        t: a.textContent.trim().slice(0, 40),
        color: getComputedStyle(a).color,
        href: (a.getAttribute('href') || '').slice(0, 40),
      }));

    return { texts, emails };
  });

  try {
    const services = page.locator('.elementor-nav-menu a').filter({ hasText: /^SERVICES$/i }).first();
    await services.hover({ timeout: 3000 });
    await page.waitForTimeout(500);
    data.dropdown = await page.evaluate(() =>
      [...document.querySelectorAll('.elementor-nav-menu .elementor-nav-menu--dropdown a, .elementor-nav-menu .sub-menu a')]
        .slice(0, 6)
        .map((a) => {
          const s = getComputedStyle(a);
          return {
            t: a.textContent.trim(),
            color: s.color,
            bg: s.backgroundColor,
            active: a.className,
          };
        }),
    );
  } catch (e) {
    data.dropdownError = String(e.message || e);
  }

  console.log('\n' + label);
  console.log(JSON.stringify(data, null, 2));
  await page.close();
}

await probe('https://connectfreelance.ae/payment/', 'LIVE payment');
await probe('http://127.0.0.1:5094/payment/', 'LOCAL payment');
await probe('https://connectfreelance.ae/contact-us/', 'LIVE contact');
await probe('http://127.0.0.1:5094/contact-us/', 'LOCAL contact');
await browser.close();
