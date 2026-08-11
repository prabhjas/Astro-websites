import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failed = [];
page.on('response', (r) => {
  if (r.status() >= 400) failed.push({ status: r.status(), url: r.url() });
});

await page.goto(LOCAL + '/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);

const banner = await page.evaluate(() => {
  const el = document.querySelector('#top-banner');
  if (!el) return null;
  const html = el.innerHTML;
  const slides = [...el.querySelectorAll('.swiper-slide')].map((s) => ({
    cls: s.className,
    bg: getComputedStyle(s).backgroundImage?.slice(0, 150),
    bgSize: getComputedStyle(s).backgroundSize,
    text: s.innerText?.slice(0, 200),
    imgs: [...s.querySelectorAll('img')].map((i) => i.src),
  }));
  const settings = el.getAttribute('data-settings') || el.querySelector('[data-settings]')?.getAttribute('data-settings');
  // Elementor often stores slides in data-settings as background slides
  return {
    settings,
    slideCount: slides.length,
    slides,
    outerHTMLLen: el.outerHTML.length,
    hasKenBurns: !!el.querySelector('.elementor-ken-burns'),
    swiperInitialized: !!el.querySelector('.swiper-initialized, .swiper-container-initialized'),
    swiperInstance: !!(el.querySelector('.swiper')?.swiper),
  };
});

// Collect unique failed (strip query)
const uniq = {};
for (const f of failed) {
  const u = f.url.split('?')[0];
  if (!uniq[u]) uniq[u] = f.status;
}

console.log(JSON.stringify({ banner, failed404: uniq }, null, 2));

// Mobile smart slider
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mFailed = [];
mobile.on('response', (r) => {
  if (r.status() >= 400) mFailed.push(r.url().split('?')[0] + ' ' + r.status());
});
await mobile.goto(LOCAL + '/', { waitUntil: 'networkidle', timeout: 90000 });
await mobile.waitForTimeout(4000);
const mData = await mobile.evaluate(() => {
  const ss = document.querySelector('#n2-ss-6');
  const parent = ss?.closest('.elementor-element');
  const r = ss?.getBoundingClientRect();
  return {
    loaded: ss?.classList.contains('n2-ss-loaded'),
    w: Math.round(r?.width || 0),
    h: Math.round(r?.height || 0),
    parentDisplay: parent ? getComputedStyle(parent).display : null,
    parentCls: parent?.className?.slice(0, 150),
    slideCount: document.querySelectorAll('#n2-ss-6 .n2-ss-slide').length,
    windowN2: typeof window.n2 === 'object',
    _N2: typeof window._N2 !== 'undefined',
    SmartSlider: typeof window.n2 === 'object' && !!(window.n2?.smartSlider || window.N2SmartSlider),
  };
});
await mobile.screenshot({ path: 'scripts/_parity-shots/home-local-mobile.png' });
console.log('MOBILE', JSON.stringify({ mData, mFailed: [...new Set(mFailed)].slice(0, 40) }, null, 2));

await browser.close();
