#!/usr/bin/env node
import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5095/blog/employer-of-record-saudi-arabia/', {
  waitUntil: 'networkidle',
});
await p.waitForTimeout(1500);

const info = await p.evaluate(() => {
  const el = document.querySelector('.elementor-element-f006bfc');
  const chain = [];
  let n = el;
  while (n) {
    const cs = getComputedStyle(n);
    chain.push({
      node: n === document.documentElement ? 'html' : n === document.body ? 'body' : (n.className || n.tagName || '').toString().slice(0, 50),
      overflow: cs.overflow,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      contain: cs.contain,
      transform: cs.transform === 'none' ? 'none' : 'yes',
      filter: cs.filter === 'none' ? 'none' : cs.filter.slice(0, 30),
      perspective: cs.perspective,
      height: cs.height,
    });
    n = n.parentElement;
  }
  return {
    scrollingElement: document.scrollingElement?.tagName,
    chain,
  };
});
console.log(JSON.stringify(info, null, 2));

// Implement manual sticky and verify
await p.evaluate(() => {
  const el = document.querySelector('.elementor-element-f006bfc');
  const col = el.closest('.elementor-column');
  const offset = 100;
  let spacer = null;

  function onScroll() {
    if (window.innerWidth < 768) {
      el.style.cssText = '';
      if (spacer) {
        spacer.remove();
        spacer = null;
      }
      return;
    }
    const colRect = col.getBoundingClientRect();
    const start = el.dataset.astroStickyStart
      ? Number(el.dataset.astroStickyStart)
      : null;

    // Measure natural position once while relative
    if (!el.dataset.astroStickyPinned) {
      const naturalTop = el.getBoundingClientRect().top + window.scrollY;
      el.dataset.astroStickyNatural = String(naturalTop);
    }

    const natural = Number(el.dataset.astroStickyNatural);
    const elH = el.offsetHeight;
    const colBottomDoc = colRect.bottom + window.scrollY;
    const maxScroll = colBottomDoc - elH - offset;
    const y = window.scrollY;

    if (y + offset <= natural) {
      // before stick
      el.style.cssText = '';
      el.dataset.astroStickyPinned = '';
      if (spacer) {
        spacer.remove();
        spacer = null;
      }
    } else if (y + offset >= maxScroll) {
      // park at bottom of column
      const top = Math.max(8, colRect.bottom - elH);
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.style.height = elH + 'px';
        el.parentNode.insertBefore(spacer, el);
      }
      el.style.position = 'fixed';
      el.style.top = top + 'px';
      el.style.width = colRect.width + 'px';
      el.style.left = colRect.left + 'px';
      el.style.zIndex = '10';
      el.dataset.astroStickyPinned = '1';
    } else {
      // stuck
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.style.height = elH + 'px';
        el.parentNode.insertBefore(spacer, el);
      }
      el.style.position = 'fixed';
      el.style.top = offset + 'px';
      el.style.width = colRect.width + 'px';
      el.style.left = colRect.left + 'px';
      el.style.zIndex = '10';
      el.dataset.astroStickyPinned = '1';
    }
  }

  window.__astroTestSticky = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

const track = [];
for (let y = 0; y <= 1200; y += 200) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(120);
  await p.evaluate(() => window.__astroTestSticky());
  await p.waitForTimeout(50);
  track.push(
    await p.evaluate((yy) => {
      const el = document.querySelector('.elementor-element-f006bfc');
      const r = el.getBoundingClientRect();
      return {
        y: yy,
        top: Math.round(r.top),
        position: getComputedStyle(el).position,
        visible: r.top >= 80 && r.top < 200,
      };
    }, y),
  );
}
console.log('manual', JSON.stringify(track, null, 2));
await b.close();
