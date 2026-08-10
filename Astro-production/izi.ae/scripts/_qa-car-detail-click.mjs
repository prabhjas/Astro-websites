import { chromium } from 'playwright';

async function probe(origin, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 220)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 220));
  });

  await page.goto(`${origin}/filter-screen/?make=Hyundai`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.waitForTimeout(3500);

  const before = await page.evaluate(() => {
    const cars = [...document.querySelectorAll('.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    );
    const rowHide = document.querySelector('#row-hide');
    return {
      cars: cars.length,
      titles: cars.map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)),
      hasRowHide: !!rowHide,
      rowHideDisplay: rowHide ? getComputedStyle(rowHide).display : null,
      rowHideHeight: rowHide ? rowHide.getBoundingClientRect().height : 0,
      jq: !!window.jQuery,
      hasGetInfodata: !!document.querySelector('.get-infodata'),
    };
  });

  const clicked = await page.evaluate(() => {
    const cars = [...document.querySelectorAll('.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    );
    const target =
      cars.find((c) => /elantra/i.test(c.textContent || '')) || cars[cars.length - 1];
    if (!target) return { ok: false };
    target.scrollIntoView({ block: 'center' });
    target.click();
    return {
      ok: true,
      id: target.getAttribute('data-id'),
      text: (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
    };
  });

  await page.waitForTimeout(1800);

  const after = await page.evaluate(() => {
    const rowHide = document.querySelector('#row-hide');
    const text = document.body.innerText;
    return {
      rowHideDisplay: rowHide ? getComputedStyle(rowHide).display : null,
      rowHideHeight: rowHide ? rowHide.getBoundingClientRect().height : 0,
      booking: /Booking options/i.test(text),
      continueBtn: [...document.querySelectorAll('a,button,input')].some((el) =>
        /CONTINUE/i.test(el.textContent || el.value || ''),
      ),
      seeAll: [...document.querySelectorAll('a,button,input')].some((el) =>
        /SEE ALL INFO/i.test(el.textContent || el.value || ''),
      ),
      radios: document.querySelectorAll('#row-hide input[type=radio], input[type=radio]').length,
      activeClassCars: [...document.querySelectorAll('.car-wrap.active, .car-wrap.selected')].length,
    };
  });

  console.log(label, JSON.stringify({ before, clicked, after, errs: errs.slice(0, 12) }, null, 2));
  await browser.close();
}

await probe('http://127.0.0.1:5121', 'LOCAL');
await probe('https://izi.ae', 'LIVE');
