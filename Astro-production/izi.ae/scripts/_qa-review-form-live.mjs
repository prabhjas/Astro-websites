import { chromium } from 'playwright';

const path =
  '/review-form/?Model=Hyundai+Accent+2024&post-id=1507&rentlenght=&finalprice=2400&filterlocation=United-Arab-Emirates&from_date=2026-08-28&from_time=09%3A26&to_date=2027-02-28&to_time=06%3A26';

async function probe(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const get = (n) => document.querySelector(`[name="${n}"]`)?.value || '';
    return {
      Model: get('Model'),
      from_date: get('from_date'),
      to_date: get('to_date'),
      filterlocation: get('filterlocation'),
      Price: get('Price'),
      location: get('location'),
      postid: get('postid'),
      from_time: get('from_time'),
      to_time: get('to_time'),
    };
  });
  await browser.close();
  return info;
}

console.log('LIVE', JSON.stringify(await probe('https://izi.ae'), null, 2));
console.log('LOCAL', JSON.stringify(await probe('http://127.0.0.1:5121'), null, 2));
