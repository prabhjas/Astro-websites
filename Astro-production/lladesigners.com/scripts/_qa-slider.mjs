#!/usr/bin/env node
import { chromium } from 'playwright';

async function homeSlider(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && /swiper|slides|smartslider|n2\.|frontend-handlers/i.test(r.url())) {
      failed.push(`${r.status()} ${r.url().split('?')[0]}`);
    }
  });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  const first = await page.evaluate(() => {
    const swiperEl = document.querySelector('.elementor-main-swiper');
    const inst = swiperEl?.swiper || (window.jQuery && window.jQuery(swiperEl).data('swiper'));
    const heading = document.querySelector('.elementor-slide-heading, .swiper-slide-active .elementor-slide-heading')?.textContent?.trim();
    const bg = getComputedStyle(document.querySelector('.swiper-slide-active .swiper-slide-bg, .elementor-main-swiper .swiper-slide-bg') || document.body).backgroundImage;
    return {
      slidesInDom: document.querySelectorAll('.elementor-main-swiper .swiper-slide').length,
      activeIndex: inst?.activeIndex ?? null,
      hasInst: !!inst,
      heading,
      bg: bg?.slice(0, 120),
      pagination: document.querySelectorAll('.elementor-main-swiper .swiper-pagination-bullet').length,
      arrows: document.querySelectorAll('.elementor-main-swiper .elementor-swiper-button, .elementor-swiper-button').length,
      slideClasses: [...document.querySelectorAll('.elementor-main-swiper .swiper-slide')].map((s) => s.className.slice(0, 80)),
    };
  });
  // wait for autoplay
  await page.waitForTimeout(5000);
  const second = await page.evaluate(() => {
    const swiperEl = document.querySelector('.elementor-main-swiper');
    const inst = swiperEl?.swiper || (window.jQuery && window.jQuery(swiperEl).data('swiper'));
    return {
      activeIndex: inst?.activeIndex ?? null,
      heading: document.querySelector('.swiper-slide-active .elementor-slide-heading')?.textContent?.trim(),
      autoplayRunning: !!inst?.autoplay?.running,
    };
  });
  // try click next
  const next = await page.$('.elementor-swiper-button-next, .elementor-main-swiper .swiper-button-next');
  if (next) await next.click();
  await page.waitForTimeout(1000);
  const afterClick = await page.evaluate(() => {
    const swiperEl = document.querySelector('.elementor-main-swiper');
    const inst = swiperEl?.swiper || (window.jQuery && window.jQuery(swiperEl).data('swiper'));
    return { activeIndex: inst?.activeIndex ?? null, heading: document.querySelector('.swiper-slide-active .elementor-slide-heading')?.textContent?.trim() };
  });
  await page.screenshot({ path: `scripts/_parity-shots/${base.includes('127') ? 'local' : 'live'}-home-slider.png`, fullPage: false });
  await browser.close();
  return { base, first, second, afterClick, failed };
}

console.log(JSON.stringify(await homeSlider('http://127.0.0.1:5112'), null, 2));
console.log(JSON.stringify(await homeSlider('https://lladesigners.com'), null, 2));
