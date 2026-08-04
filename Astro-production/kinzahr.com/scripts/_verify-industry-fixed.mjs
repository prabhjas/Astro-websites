import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [label, path] of [
  ['const', '/industries/construction-and-engineering/'],
  ['logi', '/industries/logistics-transport-and-warehousing/'],
]) {
  const fails = [];
  page.removeAllListeners('response');
  page.on('response', (r) => {
    if (r.status() === 404 && r.url().includes('127.0.0.1') && /wp-content/.test(r.url())) {
      fails.push(r.url().replace('http://127.0.0.1:5085', ''));
    }
  });
  await page.goto('http://127.0.0.1:5085' + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, `${label}-fixed-hero.png`), fullPage: false });
  await page.evaluate(() => window.scrollBy(0, 750));
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, `${label}-fixed-mid.png`), fullPage: false });

  const dig = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.elementor-heading-title')].find((el) =>
      /Top .*Recruitment Agency/i.test(el.textContent || ''),
    );
    let el = h;
    let bg = null;
    while (el && el !== document.body) {
      const bi = getComputedStyle(el).backgroundImage;
      if (bi && bi !== 'none') {
        bg = {
          cls: el.className.slice(0, 80),
          bi: bi.slice(0, 140),
          h: Math.round(el.getBoundingClientRect().height),
        };
        break;
      }
      el = el.parentElement;
    }
    const contentImg = [...document.querySelectorAll('img')].find((i) =>
      /Find-(Skilled|Suitable)/i.test(i.getAttribute('src') || i.src || ''),
    );
    return {
      statusOk: true,
      headingTop: h ? Math.round(h.getBoundingClientRect().top) : null,
      headingColor: h ? getComputedStyle(h).color : null,
      bg,
      contentImg: contentImg && {
        w: Math.round(contentImg.getBoundingClientRect().width),
        natural: contentImg.naturalWidth,
        complete: contentImg.complete,
        src: (contentImg.getAttribute('src') || '').split('/').pop(),
      },
    };
  });
  console.log(JSON.stringify({ label, dig, css404: [...new Set(fails)].slice(0, 8) }, null, 2));
}

await browser.close();
