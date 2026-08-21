#!/usr/bin/env node
import { chromium } from 'playwright';

async function probe(url, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('[c] ' + m.text().slice(0, 120));
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // Listen via CDP for exception details
  const client = await page.context().newCDPSession(page);
  // already happened; instead re-evaluate scripts by cloning
  const info = await page.evaluate(() => {
    const out = [];
    for (const s of document.scripts) {
      if (s.src) continue;
      const t = (s.type || 'text/javascript').toLowerCase();
      if (t && t !== 'text/javascript' && t !== 'module' && t !== '') continue;
      const body = s.textContent || '';
      if (!body.trim()) continue;
      try {
        // eslint-disable-next-line no-new-func
        new Function(body);
      } catch (e) {
        out.push({ type: s.type, err: String(e.message), head: body.slice(0, 160) });
      }
    }
    return out;
  });

  console.log('\n==', label, '==');
  console.log('pageerrors', errors.filter((e) => /Rent|Unexpected/i.test(e)));
  console.log('inline fails', info);
  await browser.close();
}

await probe('http://127.0.0.1:5121/', 'local');
await probe('https://izi.ae/?nowprocket=1', 'live');
