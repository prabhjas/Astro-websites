import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:5085';
const LIVE = 'https://kinzahr.com';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function probe(origin, label) {
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(async () => {
    const name = document.querySelector('.n-footer input[name="f-name"]');
    const submit = document.querySelector('.n-footer .wpcf7-submit');
    const ns = name ? getComputedStyle(name) : null;
    const ss = submit ? getComputedStyle(submit) : null;

    const img = document.querySelector('.elementor-widget-image-carousel .swiper-initialized');
    const t0 = img?.swiper?.translate;
    await new Promise((r) => setTimeout(r, 2800));
    const t1 = img?.swiper?.translate;

    const nested = document.querySelector('.elementor-widget-n-carousel .swiper-initialized');
    const next = nested
      ?.closest('.elementor-widget')
      ?.querySelector('.elementor-swiper-button-next');
    const n0 = nested?.swiper?.activeIndex;
    if (next) next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 700));
    const n1 = nested?.swiper?.activeIndex;

    return {
      kzformOnFooter: !!document.querySelector('.n-footer.kzform'),
      name: ns && {
        height: ns.height,
        radius: ns.borderRadius,
        border: ns.border,
        bg: ns.backgroundColor,
        font: ns.fontFamily,
      },
      submit: ss && {
        height: ss.height,
        radius: ss.borderRadius,
        bg: ss.backgroundImage || ss.backgroundColor,
        font: ss.fontFamily,
      },
      imageAutoMoved: t0 !== t1,
      nestedNavMoved: n0 !== n1,
      swipersInit: document.querySelectorAll('.swiper-initialized').length,
    };
  });

  await page.screenshot({ path: join(OUT, `${label}-home.png`), fullPage: false });
  await page.evaluate(() =>
    document.querySelector('.n-footer')?.scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${label}-form.png`), fullPage: false });
  return { label, ...state };
}

const live = await probe(LIVE, 'live');
const local = await probe(LOCAL, 'local');

const match = (a, b, keys) =>
  keys.every((k) => String(a?.[k] || '') === String(b?.[k] || ''));

const report = {
  live,
  local,
  formMatch: {
    name: match(live.name, local.name, ['height', 'radius', 'border', 'bg']),
    submitBgSimilar:
      /4083aa|64, 131, 170/i.test(local.submit?.bg || '') &&
      /10918e|16, 145, 142|15, 193, 189|21, 193, 189/i.test(local.submit?.bg || ''),
    noKzformLeak: !local.kzformOnFooter,
  },
  sliderOk: {
    imageAuto: local.imageAutoMoved,
    nestedNav: local.nestedNavMoved,
    initCount: local.swipersInit,
  },
};
writeFileSync(join(OUT, 'verify-fix-slider.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
