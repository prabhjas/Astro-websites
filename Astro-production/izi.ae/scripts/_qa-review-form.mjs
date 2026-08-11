import { chromium } from 'playwright';

const path =
  '/review-form/?Model=Hyundai+Accent+2024&post-id=1507&rentlenght=&finalprice=2400&filterlocation=United-Arab-Emirates&from_date=2026-08-28&from_time=09%3A26&to_date=2027-02-28&to_time=06%3A26';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const resp = await page.goto('http://127.0.0.1:5121' + path, {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForTimeout(3500);

const info = await page.evaluate(() => {
  const get = (n) => document.querySelector(`[name="${n}"]`)?.value || '';
  const text = document.body.innerText.replace(/\s+/g, ' ').trim();
  return {
    title: document.title,
    h1: document.querySelector('h1,h2')?.textContent?.trim(),
    Model: get('Model'),
    Price: get('Price'),
    from_date: get('from_date'),
    to_date: get('to_date'),
    from_time: get('from_time'),
    to_time: get('to_time'),
    filterlocation: get('filterlocation'),
    location: get('location'),
    postid: get('postid'),
    rentlenght: get('rentlenght'),
    hasSubmit: [...document.querySelectorAll('input[type=submit],button')].some((b) =>
      /SEND REQUEST/i.test(b.value || b.textContent || ''),
    ),
    totalText: [...document.querySelectorAll('p,span,div,h3,h4')]
      .map((el) => el.textContent.trim())
      .find((t) => /AED\s*2400|Total/i.test(t))
      ?.slice(0, 60),
    preview: text.slice(0, 350),
  };
});

console.log('HTTP', resp.status());
console.log(JSON.stringify(info, null, 2));
await browser.close();

const ok =
  resp.status() === 200 &&
  info.Model.includes('Hyundai Accent') &&
  info.Price === '2400' &&
  info.from_date === '2026-08-28' &&
  info.to_date === '2027-02-28' &&
  info.hasSubmit;
process.exitCode = ok ? 0 : 1;
