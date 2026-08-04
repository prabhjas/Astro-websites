import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function dig(origin) {
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(5000);
  return page.evaluate(() => {
    const name = document.querySelector(
      '.n-footer input[name="f-name"], form.wpcf7-form input[name="f-name"]',
    );
    const submit = document.querySelector(
      '.n-footer .wpcf7-submit, form.wpcf7-form .wpcf7-submit',
    );
    function rulesFor(el) {
      if (!el) return [];
      const out = [];
      for (const sheet of [...document.styleSheets]) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        if (!rules) continue;
        for (const r of rules) {
          if (!r.selectorText || !r.style) continue;
          try {
            if (el.matches(r.selectorText)) {
              const interesting = [
                'height',
                'border-radius',
                'border',
                'border-width',
                'border-style',
                'border-color',
                'background',
                'background-image',
                'background-color',
                'font-family',
                'padding',
                'box-shadow',
              ];
              const vals = {};
              for (const p of interesting) {
                const v = r.style.getPropertyValue(p);
                if (v) vals[p] = v;
              }
              if (Object.keys(vals).length) {
                out.push({
                  sel: r.selectorText.slice(0, 140),
                  href: (sheet.href || 'inline').split('/').slice(-2).join('/'),
                  vals,
                });
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
      return out.slice(-20);
    }
    const sw = document.querySelector('.elementor-widget-image-carousel .swiper-initialized');
    let slideMoved = null;
    if (sw?.swiper) {
      const before = sw.swiper.activeIndex;
      const next =
        document.querySelector('.elementor-widget-image-carousel .elementor-swiper-button-next') ||
        document.querySelector('.elementor-widget-image-carousel .swiper-button-next');
      if (next) next.click();
      slideMoved = { before, after: sw.swiper.activeIndex, translate: sw.swiper.translate };
    }
    return {
      nameCls: name?.className,
      formCls: name?.closest('form')?.className,
      nfooterCls: name?.closest('.n-footer')?.className,
      nameCS: name && {
        height: getComputedStyle(name).height,
        radius: getComputedStyle(name).borderRadius,
        border: getComputedStyle(name).border,
        bg: getComputedStyle(name).backgroundColor,
      },
      submitCS: submit && {
        height: getComputedStyle(submit).height,
        radius: getComputedStyle(submit).borderRadius,
        bg: getComputedStyle(submit).backgroundImage || getComputedStyle(submit).backgroundColor,
        font: getComputedStyle(submit).fontFamily,
      },
      nameRules: rulesFor(name),
      submitRules: rulesFor(submit),
      swiper: sw && {
        hasSwiper: !!sw.swiper,
        index: sw.swiper?.activeIndex,
        navNext: !!(sw.swiper?.navigation?.nextEl || sw.swiper?.params?.navigation?.nextEl),
        paramsNav: sw.swiper?.params?.navigation,
        autoplay: !!sw.swiper?.params?.autoplay,
        slidesPerView: sw.swiper?.params?.slidesPerView,
        translate: sw.swiper?.translate,
        datasetAstro: sw.dataset.astroSwiper || sw.closest('[data-astro-swiper]')?.dataset,
      },
      slideMoved,
      nextButtons: [...document.querySelectorAll('.elementor-swiper-button-next, .swiper-button-next')]
        .slice(0, 6)
        .map((b) => ({
          cls: b.className,
          display: getComputedStyle(b).display,
          opacity: getComputedStyle(b).opacity,
          pointer: getComputedStyle(b).pointerEvents,
          visible: b.getBoundingClientRect().width > 0,
          widget: b.closest('.elementor-widget')?.getAttribute('data-widget_type'),
        })),
    };
  });
}

const live = await dig('https://kinzahr.com');
const local = await dig('http://127.0.0.1:5085');
writeFileSync(join(OUT, 'form-swiper-dig.json'), JSON.stringify({ live, local }, null, 2));
console.log(
  JSON.stringify(
    {
      liveName: live.nameCS,
      localName: local.nameCS,
      liveSubmit: live.submitCS,
      localSubmit: local.submitCS,
      liveMoved: live.slideMoved,
      localMoved: local.slideMoved,
      liveNav: live.swiper,
      localNav: local.swiper,
      liveNext: live.nextButtons,
      localNext: local.nextButtons,
    },
    null,
    2,
  ),
);
await browser.close();
