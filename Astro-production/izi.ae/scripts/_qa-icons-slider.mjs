#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
async function dig(origin) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    // icon list icons
    const icons = [...document.querySelectorAll('.elementor-icon-list-icon')].slice(0, 8).map((el) => {
      const svg = el.querySelector('svg, i, img');
      const r = el.getBoundingClientRect();
      return {
        html: el.innerHTML.slice(0, 200),
        w: Math.round(r.width),
        h: Math.round(r.height),
        child: svg
          ? {
              tag: svg.tagName,
              cls: String(svg.className?.baseVal || svg.className || '').slice(0, 80),
              w: Math.round(svg.getBoundingClientRect().width),
              fill: svg.tagName === 'svg' ? getComputedStyle(svg).fill : getComputedStyle(svg).color,
              before: svg.tagName === 'I' ? getComputedStyle(svg, '::before').content : null,
              ff: svg.tagName === 'I' ? getComputedStyle(svg, '::before').fontFamily : null,
            }
          : null,
      };
    });
    // loop carousel / testimonials
    const loop = document.querySelector('.elementor-loop-container.swiper, .swiper.elementor-loop-container');
    let loopM = null;
    if (loop) {
      const r = loop.getBoundingClientRect();
      loopM = {
        cls: loop.className.slice(0, 120),
        init: loop.classList.contains('swiper-initialized'),
        slides: loop.querySelectorAll('.swiper-slide').length,
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top + window.scrollY),
      };
    }
    // makeslider position
    const make = document.querySelector('.makeslider');
    const makeM = make
      ? {
          loaded: make.classList.contains('owl-loaded'),
          h: Math.round(make.getBoundingClientRect().height),
          items: make.querySelectorAll('.owl-item, .item').length,
          top: Math.round(make.getBoundingClientRect().top + window.scrollY),
        }
      : null;
    // nav Location caret after hover
    const loc = [...document.querySelectorAll('a')].find((a) => /location/i.test(a.textContent || ''));
    const locIcon = loc
      ? {
          text: loc.textContent.trim(),
          html: loc.innerHTML.slice(0, 250),
          submenu: !!loc.parentElement?.querySelector('.sub-menu, .elementor-nav-menu--dropdown'),
        }
      : null;
    // slider-for presence
    const sf = document.querySelectorAll('.slider-for, .slider-nav');
    return {
      icons,
      loopM,
      makeM,
      locIcon,
      sliderFor: sf.length,
      jquerySlick: typeof window.jQuery !== 'undefined' && typeof window.jQuery.fn?.slick,
      swiper: typeof window.Swiper,
    };
  });
  // scroll to makeslider and shot
  await page.evaluate(() => {
    const el = document.querySelector('.makeslider, .elementor-loop-container');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(800);
  const label = origin.includes('5121') ? 'local' : 'live';
  await page.screenshot({ path: `.tmp-qa/shots/${label}-category.png` });
  console.log(label, JSON.stringify(data, null, 2));
  await page.close();
}
await dig('http://127.0.0.1:5121');
await dig('https://izi.ae');
await browser.close();
